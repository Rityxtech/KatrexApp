import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../models/p2p_model.dart';
import '../services/p2p_service.dart';

/// Real-time P2P data for the marketplace and order screens.
///
/// Listens to:
///   - Live listings (status == 'live') for the marketplace browse view
///   - The current user's listings (any status) for "My Listings"
///   - The current user's active trades
///   - P2P settings (escrow fee %, etc.)
///
/// Per-trade message streams are loaded on demand via [loadTradeMessages].
class P2PProvider extends ChangeNotifier {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ─── State ───────────────────────────────────────────────────────
  List<P2PListing> _liveListings = [];
  List<P2PListing> _myListings = [];
  List<P2PTrade> _myTrades = [];
  P2PSettings _settings = const P2PSettings();
  bool _isLoading = true;
  String? _errorMessage;

  // ─── Pagination state ────────────────────────────────────────────
  static const int _pageSize = 10;

  // Live listings pagination
  bool _hasMoreLiveListings = true;
  bool _isLoadingMoreLiveListings = false;
  DocumentSnapshot<Map<String, dynamic>>? _lastLiveListingDoc;

  // My listings pagination
  bool _hasMoreMyListings = true;
  bool _isLoadingMoreMyListings = false;
  DocumentSnapshot<Map<String, dynamic>>? _lastMyListingDoc;

  // My trades pagination
  bool _hasMoreTrades = true;
  bool _isLoadingMoreTrades = false;
  DocumentSnapshot<Map<String, dynamic>>? _lastTradeDoc;

  // Per-trade message streams
  final Map<String, List<P2PMessage>> _messagesByTrade = {};
  final Map<String, StreamSubscription<QuerySnapshot<Map<String, dynamic>>>> _msgSubs = {};

  // Main subscriptions
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _liveSub;
  // [OPTIMIZATION] Convert secondary lists to Future-based loading to reduce active listeners
  // and battery drain. Only the main marketplace is a stream.
  bool _isLoadingMyListings = false;
  bool _isLoadingMyTrades = false;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _settingsSub;

  String? _uid;

  // ─── Getters ─────────────────────────────────────────────────────
  List<P2PListing> get liveListings => _liveListings;
  List<P2PListing> get myListings => _myListings;
  List<P2PTrade> get myTrades => _myTrades;
  P2PSettings get settings => _settings;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Pagination getters
  bool get hasMoreLiveListings => _hasMoreLiveListings;
  bool get isLoadingMoreLiveListings => _isLoadingMoreLiveListings;
  bool get hasMoreMyListings => _hasMoreMyListings;
  bool get isLoadingMoreMyListings => _isLoadingMoreMyListings;
  bool get hasMoreTrades => _hasMoreTrades;
  bool get isLoadingMoreTrades => _isLoadingMoreTrades;

  /// Messages for a trade (populated by [loadTradeMessages]).
  List<P2PMessage> messagesFor(String tradeId) => _messagesByTrade[tradeId] ?? [];

  /// Trades where the current user is the buyer.
  List<P2PTrade> get myBuys => _myTrades.where((t) => t.buyerUid == _uid).toList();

  /// Trades where the current user is the seller.
  List<P2PTrade> get mySales => _myTrades.where((t) => t.sellerUid == _uid).toList();

  /// Active (non-terminal) trades for the current user.
  List<P2PTrade> get activeTrades => _myTrades.where((t) {
    return t.status != P2PTradeStatus.released &&
        t.status != P2PTradeStatus.refunded &&
        t.status != P2PTradeStatus.cancelled;
  }).toList();

  // ─── Loading ─────────────────────────────────────────────────────

  /// Start listening to the current user's P2P data. Call after auth.
  void load(String uid) {
    _uid = uid;
    _isLoading = true;
    _errorMessage = null;
    // Reset pagination state
    _hasMoreLiveListings = true;
    _hasMoreMyListings = true;
    _hasMoreTrades = true;
    _lastLiveListingDoc = null;
    _lastMyListingDoc = null;
    _lastTradeDoc = null;
    notifyListeners();

    // Live listings (marketplace browse) — only 'live' status, limited to first page
    _liveSub = _db
        .collection('p2p_listings')
        .where('status', isEqualTo: 'live')
        .orderBy('createdAt', descending: true)
        .limit(_pageSize)
        .snapshots()
        .listen(
      (snap) {
        _liveListings = snap.docs.map(P2PListing.fromDoc).toList();
        if (snap.docs.isNotEmpty) {
          _lastLiveListingDoc = snap.docs.last;
        }
        _hasMoreLiveListings = snap.docs.length >= _pageSize;
        _isLoading = false;
        notifyListeners();
      },
      onError: (e) {
        _errorMessage = e.toString();
        _isLoading = false;
        notifyListeners();
      },
    );

    // [OPTIMIZATION] Convert to Future-based fetch for User's own data
    _fetchMyListings();
    _fetchMyTrades();

    // Settings
    _settingsSub = _db
        .collection('app_settings')
        .doc('p2p')
        .snapshots()
        .listen(
      (snap) {
        _settings = P2PSettings.fromDoc(snap);
        notifyListeners();
      },
      onError: (e) {
        // Settings are optional — keep defaults
      },
    );
  }

  Future<void> _fetchMyListings() async {
    _isLoadingMyListings = true;
    notifyListeners();
    try {
      final snap = await _db
          .collection('p2p_listings')
          .where('sellerUid', isEqualTo: _uid)
          .orderBy('createdAt', descending: true)
          .limit(_pageSize)
          .get();
      _myListings = snap.docs.map(P2PListing.fromDoc).toList();
      if (snap.docs.isNotEmpty) {
        _lastMyListingDoc = snap.docs.last;
      }
      _hasMoreMyListings = snap.docs.length >= _pageSize;
    } catch (e) {
      debugPrint('[P2PProvider] _fetchMyListings error: $e');
    } finally {
      _isLoadingMyListings = false;
      notifyListeners();
    }
  }

  Future<void> _fetchMyTrades() async {
    _isLoadingMyTrades = true;
    notifyListeners();
    try {
      final snap = await _db
          .collection('p2p_trades')
          .where('participants', arrayContains: _uid)
          .orderBy('createdAt', descending: true)
          .limit(_pageSize)
          .get();
      _myTrades = snap.docs.map(P2PTrade.fromDoc).toList();
      if (snap.docs.isNotEmpty) {
        _lastTradeDoc = snap.docs.last;
      }
      _hasMoreTrades = snap.docs.length >= _pageSize;
    } catch (e) {
      debugPrint('[P2PProvider] _fetchMyTrades error: $e');
      _loadTradesFallback(_uid!);
    } finally {
      _isLoadingMyTrades = false;
      notifyListeners();
    }
  }

  void _loadTradesFallback(String uid) {
    // Query trades where user is buyer (limited to first page)
    _db.collection('p2p_trades')
        .where('buyerUid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(_pageSize)
        .get().then((buyerSnap) {
      _db.collection('p2p_trades')
          .where('sellerUid', isEqualTo: uid)
          .orderBy('createdAt', descending: true)
          .limit(_pageSize)
          .get().then((sellerSnap) {
        final all = <P2PTrade>[];
        all.addAll(buyerSnap.docs.map(P2PTrade.fromDoc));
        all.addAll(sellerSnap.docs.map(P2PTrade.fromDoc));
        // Deduplicate by id
        final seen = <String>{};
        _myTrades = all.where((t) {
          if (seen.contains(t.id)) return false;
          seen.add(t.id);
          return true;
        }).toList()
          ..sort((a, b) {
            final aT = a.createdAt ?? DateTime.now();
            final bT = b.createdAt ?? DateTime.now();
            return bT.compareTo(aT);
          });
        _hasMoreTrades = _myTrades.length >= _pageSize;
        notifyListeners();
      });
    });
  }

  // ─── Pagination: load more methods ───────────────────────────────

  /// Load more live listings (next page) for the Buy tab.
  Future<void> loadMoreLiveListings() async {
    if (_isLoadingMoreLiveListings || !_hasMoreLiveListings || _lastLiveListingDoc == null) return;
    _isLoadingMoreLiveListings = true;
    notifyListeners();
    try {
      final snap = await _db
          .collection('p2p_listings')
          .where('status', isEqualTo: 'live')
          .orderBy('createdAt', descending: true)
          .startAfter([_lastLiveListingDoc!['createdAt']])
          .limit(_pageSize)
          .get();
      if (snap.docs.isNotEmpty) {
        _lastLiveListingDoc = snap.docs.last;
        _liveListings.addAll(snap.docs.map(P2PListing.fromDoc));
      }
      _hasMoreLiveListings = snap.docs.length >= _pageSize;
    } catch (e) {
      debugPrint('[P2PProvider] loadMoreLiveListings error: $e');
    }
    _isLoadingMoreLiveListings = false;
    notifyListeners();
  }

  /// Load more of the user's own listings (next page) for My Listings tab.
  Future<void> loadMoreMyListings() async {
    if (_isLoadingMoreMyListings || !_hasMoreMyListings || _lastMyListingDoc == null || _uid == null) return;
    _isLoadingMoreMyListings = true;
    notifyListeners();
    try {
      final snap = await _db
          .collection('p2p_listings')
          .where('sellerUid', isEqualTo: _uid)
          .orderBy('createdAt', descending: true)
          .startAfter([_lastMyListingDoc!['createdAt']])
          .limit(_pageSize)
          .get();
      if (snap.docs.isNotEmpty) {
        _lastMyListingDoc = snap.docs.last;
        _myListings.addAll(snap.docs.map(P2PListing.fromDoc));
      }
      _hasMoreMyListings = snap.docs.length >= _pageSize;
    } catch (e) {
      debugPrint('[P2PProvider] loadMoreMyListings error: $e');
    }
    _isLoadingMoreMyListings = false;
    notifyListeners();
  }

  /// Load more trades (next page) for the Orders tab.
  Future<void> loadMoreTrades() async {
    if (_isLoadingMoreTrades || !_hasMoreTrades || _lastTradeDoc == null || _uid == null) return;
    _isLoadingMoreTrades = true;
    notifyListeners();
    try {
      final snap = await _db
          .collection('p2p_trades')
          .where('participants', arrayContains: _uid)
          .orderBy('createdAt', descending: true)
          .startAfter([_lastTradeDoc!['createdAt']])
          .limit(_pageSize)
          .get();
      if (snap.docs.isNotEmpty) {
        _lastTradeDoc = snap.docs.last;
        _myTrades.addAll(snap.docs.map(P2PTrade.fromDoc));
      }
      _hasMoreTrades = snap.docs.length >= _pageSize;
    } catch (e) {
      debugPrint('[P2PProvider] loadMoreTrades error: $e');
    }
    _isLoadingMoreTrades = false;
    notifyListeners();
  }

  /// Start listening to messages for a specific trade.
  void loadTradeMessages(String tradeId, {String? myUid}) {
    _msgSubs[tradeId]?.cancel();
    _msgSubs[tradeId] = _db
        .collection('p2p_messages')
        .where('tradeId', isEqualTo: tradeId)
        .orderBy('createdAt', descending: false)
        .snapshots()
        .listen(
      (snap) {
        _messagesByTrade[tradeId] = snap.docs.map(P2PMessage.fromDoc).toList();
        notifyListeners();
        // Mark messages from the other party as read
        if (myUid != null) {
          markMessagesAsRead(tradeId, myUid);
        }
      },
      onError: (e) {
        debugPrint('[P2PProvider] message stream error for trade $tradeId: $e');
        _errorMessage = 'Failed to load messages: $e';
        notifyListeners();
      },
    );
  }

  /// Stop listening to messages for a trade (call when leaving OrderScreen).
  void stopTradeMessages(String tradeId) {
    _msgSubs[tradeId]?.cancel();
    _msgSubs.remove(tradeId);
    _messagesByTrade.remove(tradeId);
  }

  /// Mark all unread messages sent by the *other* party as read.
  /// Called when the user opens the chat or new messages arrive.
  Future<void> markMessagesAsRead(String tradeId, String myUid) async {
    try {
      final msgs = _messagesByTrade[tradeId];
      if (msgs == null || msgs.isEmpty) return;
      final unread = msgs.where((m) =>
          m.senderUid != myUid &&
          m.senderUid != 'system' &&
          m.read != true).toList();
      if (unread.isEmpty) return;
      final batch = _db.batch();
      for (final m in unread) {
        batch.update(_db.collection('p2p_messages').doc(m.id), {'read': true});
      }
      await batch.commit();
      // Update local state immediately
      for (final m in unread) {
        m.read = true;
      }
      notifyListeners();
    } catch (e) {
      debugPrint('[P2PProvider] markMessagesAsRead error: $e');
    }
  }

  // ─── Actions (delegate to P2PService) ────────────────────────────

  Future<Map<String, dynamic>?> createListing({
    required String platform,
    required String handle,
    required String title,
    required String niche,
    required int followers,
    required bool verified,
    required double priceNaira,
    required String priceType,
  }) async {
    try {
      return await P2PService.createListing(
        platform: platform,
        handle: handle,
        title: title,
        niche: niche,
        followers: followers,
        verified: verified,
        priceNaira: priceNaira,
        priceType: priceType,
      );
    } catch (e) {
      debugPrint('[P2PProvider] createListing error: $e');
      rethrow;
    }
  }

  Future<String?> buyListing({required String listingId}) async {
    try {
      return await P2PService.buyListing(listingId: listingId);
    } catch (e) {
      debugPrint('[P2PProvider] buyListing error: $e');
      rethrow;
    }
  }

  Future<void> sendCredentials({
    required String tradeId,
    required String text,
    String? attachmentUrl,
  }) async {
    try {
      await P2PService.sendCredentials(
        tradeId: tradeId,
        text: text,
        attachmentUrl: attachmentUrl,
      );
      await refreshSingleTrade(tradeId);
    } catch (e) {
      debugPrint('[P2PProvider] sendCredentials error: $e');
      rethrow;
    }
  }

  Future<void> sendMessage({
    required String tradeId,
    required String text,
  }) async {
    try {
      await P2PService.sendMessage(tradeId: tradeId, text: text);
    } catch (e) {
      debugPrint('[P2PProvider] sendMessage error: $e');
      rethrow;
    }
  }

  Future<void> releaseEscrow({required String tradeId}) async {
    try {
      await P2PService.releaseEscrow(tradeId: tradeId);
      await refreshSingleTrade(tradeId);
    } catch (e) {
      debugPrint('[P2PProvider] releaseEscrow error: $e');
      rethrow;
    }
  }

  Future<void> cancelTrade({required String tradeId}) async {
    try {
      await P2PService.cancelTrade(tradeId: tradeId);
      await refreshSingleTrade(tradeId);
    } catch (e) {
      debugPrint('[P2PProvider] cancelTrade error: $e');
      rethrow;
    }
  }

  Future<String?> openDispute({
    required String tradeId,
    required String reason,
    String? details,
    List<String>? evidenceUrls,
  }) async {
    try {
      final result = await P2PService.openDispute(
        tradeId: tradeId,
        reason: reason,
        details: details,
        evidenceUrls: evidenceUrls,
      );
      await refreshSingleTrade(tradeId);
      return result;
    } catch (e) {
      debugPrint('[P2PProvider] openDispute error: $e');
      rethrow;
    }
  }

  Future<void> closeDispute({required String tradeId}) async {
    try {
      await P2PService.closeDispute(tradeId: tradeId);
      await refreshSingleTrade(tradeId);
    } catch (e) {
      debugPrint('[P2PProvider] closeDispute error: $e');
      rethrow;
    }
  }

  Future<void> concedeDispute({required String tradeId}) async {
    try {
      await P2PService.concedeDispute(tradeId: tradeId);
      await refreshSingleTrade(tradeId);
    } catch (e) {
      debugPrint('[P2PProvider] concedeDispute error: $e');
      rethrow;
    }
  }

  /// Manually re-fetch a single trade from Firestore and update the local
  /// list. This provides instant UI feedback after an action without waiting
  /// for the snapshot stream to emit.
  Future<void> refreshSingleTrade(String tradeId) async {
    try {
      final doc = await _db.collection('p2p_trades').doc(tradeId).get();
      if (!doc.exists) return;
      final updated = P2PTrade.fromDoc(doc);
      final idx = _myTrades.indexWhere((t) => t.id == tradeId);
      if (idx >= 0) {
        _myTrades[idx] = updated;
      } else {
        _myTrades.insert(0, updated);
      }
      notifyListeners();
    } catch (e) {
      debugPrint('[P2PProvider] refreshSingleTrade error: $e');
    }
  }

  // ─── Filtering helpers (for the marketplace UI) ──────────────────

  /// Filter live listings by platform, niche, price range, follower range.
  List<P2PListing> filterListings({
    String? platform,
    String? niche,
    double? minPrice,
    double? maxPrice,
    int? minFollowers,
    int? maxFollowers,
  }) {
    return _liveListings.where((l) {
      if (platform != null && platform != 'All' && l.platform != platform) return false;
      if (niche != null && niche != 'All Categories' && l.niche != niche) return false;
      if (minPrice != null && l.priceNaira < minPrice) return false;
      if (maxPrice != null && l.priceNaira > maxPrice) return false;
      if (minFollowers != null && l.followers < minFollowers) return false;
      if (maxFollowers != null && l.followers > maxFollowers) return false;
      return true;
    }).toList();
  }

  @override
  void dispose() {
    _liveSub?.cancel();
    _settingsSub?.cancel();
    for (final sub in _msgSubs.values) {
      sub.cancel();
    }
    _msgSubs.clear();
    super.dispose();
  }
}

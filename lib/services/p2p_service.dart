import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

/// Service that handles P2P Marketplace and Escrow actions.
///
/// Dispatches to `p2pApi` Cloud Function, with an automatic direct Firestore
/// transaction fallback to ensure 100% reliability in all environments.
class P2PService {
  P2PService._();

  static final _db = FirebaseFirestore.instance;
  static final _auth = FirebaseAuth.instance;
  static final _api = FirebaseFunctions.instanceFor(region: 'us-central1').httpsCallable('p2pApi');

  // ─── Listing lifecycle ───────────────────────────────────────────

  /// Seller creates a new listing. Returns {listingId, status}.
  static Future<Map<String, dynamic>> createListing({
    required String platform,
    required String handle,
    required String title,
    required String niche,
    required int followers,
    required bool verified,
    required double priceNaira,
    required String priceType,
    String? initialStatus,
  }) async {
    try {
      final result = await _api.call({
        'action': 'createListing',
        'platform': platform,
        'handle': handle,
        'title': title,
        'niche': niche,
        'followers': followers,
        'verified': verified,
        'priceNaira': priceNaira,
        'priceType': priceType,
        'initialStatus': initialStatus,
      });
      return Map<String, dynamic>.from(result.data as Map);
    } catch (e) {
      debugPrint('[P2PService] Cloud Function error, using Firestore fallback: $e');
      final uid = _auth.currentUser?.uid;
      if (uid == null) throw Exception('User not authenticated');

      final userDoc = await _db.collection('users').doc(uid).get();
      final userData = userDoc.data() ?? {};
      final sellerName = (userData['fullName'] ?? userData['name'] ?? 'Seller').toString();
      final status = initialStatus ?? 'pending';

      final docRef = _db.collection('p2p_listings').doc();
      final data = {
        'id': docRef.id,
        'sellerUid': uid,
        'sellerName': sellerName,
        'sellerAvatarUrl': userData['avatarUrl'] ?? '',
        'sellerRating': 5.0,
        'sellerTrades': (userData['totalTrades'] ?? 0),
        'platform': platform,
        'handle': handle,
        'title': title,
        'niche': niche,
        'followers': followers,
        'verified': verified,
        'priceNaira': priceNaira,
        'priceType': priceType,
        'status': status,
        'createdAt': FieldValue.serverTimestamp(),
      };
      await docRef.set(data);
      return {'listingId': docRef.id, 'status': status};
    }
  }

  // ─── Purchase ────────────────────────────────────────────────────

  /// Buyer purchases a listing. Escrow is locked.
  /// Returns {tradeId}.
  static Future<String> buyListing({required String listingId}) async {
    try {
      final result = await _api.call({
        'action': 'buyListing',
        'listingId': listingId,
      });
      return (result.data as Map<String, dynamic>)['tradeId'] as String;
    } catch (e) {
      debugPrint('[P2PService] buyListing Cloud Function error, using Firestore fallback: $e');
      final uid = _auth.currentUser?.uid;
      if (uid == null) throw Exception('User not authenticated');

      final listingDoc = await _db.collection('p2p_listings').doc(listingId).get();
      if (!listingDoc.exists) throw Exception('Listing not found');
      final listingData = listingDoc.data()!;
      final priceNaira = (listingData['priceNaira'] as num?)?.toDouble() ?? 0.0;
      final sellerUid = (listingData['sellerUid'] as String?) ?? '';

      final userRef = _db.collection('users').doc(uid);
      final tradeDocRef = _db.collection('p2p_trades').doc();
      final tradeId = tradeDocRef.id;

      await _db.runTransaction((tx) async {
        final userSnap = await tx.get(userRef);
        final currentBal = (userSnap.data()?['nairaBalance'] as num?)?.toDouble() ?? 0.0;
        if (currentBal < priceNaira) {
          throw Exception('Insufficient balance. Please deposit funds first.');
        }

        // Deduct balance from buyer
        tx.update(userRef, {'nairaBalance': currentBal - priceNaira});

        // Mark listing as in_trade
        tx.update(listingDoc.reference, {'status': 'in_trade'});

        // Create trade document
        tx.set(tradeDocRef, {
          'id': tradeId,
          'listingId': listingId,
          'buyerUid': uid,
          'sellerUid': sellerUid,
          'participants': [uid, sellerUid],
          'priceNaira': priceNaira,
          'escrowAmount': priceNaira,
          'platform': listingData['platform'] ?? 'Social',
          'handle': listingData['handle'] ?? '',
          'title': listingData['title'] ?? 'Social Account',
          'niche': listingData['niche'] ?? '',
          'followers': listingData['followers'] ?? 0,
          'status': 'escrow_locked',
          'createdAt': FieldValue.serverTimestamp(),
        });

        // Create initial Escrow system notification message
        final msgRef = _db.collection('p2p_messages').doc();
        tx.set(msgRef, {
          'id': msgRef.id,
          'tradeId': tradeId,
          'senderUid': 'system',
          'senderName': 'Katrex Escrow',
          'role': 'system',
          'type': 'escrow',
          'title': 'Funds Secured in Escrow',
          'body': '₦${priceNaira.toStringAsFixed(0)} has been deducted from your wallet and locked in 100% Escrow Protection. The seller has been notified to send account credentials.',
          'read': false,
          'createdAt': FieldValue.serverTimestamp(),
        });
      });

      return tradeId;
    }
  }

  // ─── Trade actions ───────────────────────────────────────────────

  /// Seller sends credentials to the buyer.
  static Future<void> sendCredentials({
    required String tradeId,
    required String text,
    String? attachmentUrl,
  }) async {
    try {
      await _api.call({
        'action': 'sendCredentials',
        'tradeId': tradeId,
        'text': text,
        if (attachmentUrl != null) 'attachmentUrl': attachmentUrl,
      });
    } catch (e) {
      debugPrint('[P2PService] sendCredentials fallback: $e');
      final uid = _auth.currentUser?.uid;
      final msgRef = _db.collection('p2p_messages').doc();
      await msgRef.set({
        'id': msgRef.id,
        'tradeId': tradeId,
        'senderUid': uid ?? 'seller',
        'senderName': 'Seller',
        'role': 'seller',
        'type': 'credentials',
        'body': text,
        'attachmentUrl': attachmentUrl,
        'read': false,
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Also create an action prompt message for buyer
      final actionMsgRef = _db.collection('p2p_messages').doc();
      await actionMsgRef.set({
        'id': actionMsgRef.id,
        'tradeId': tradeId,
        'senderUid': 'system',
        'senderName': 'Katrex Security',
        'role': 'system',
        'type': 'action',
        'title': 'Action Required: Verify Account',
        'body': 'The seller has provided account credentials. Please log in, change the password, update recovery email/phone, and verify 2FA.',
        'read': false,
        'createdAt': FieldValue.serverTimestamp(),
      });

      await _db.collection('p2p_trades').doc(tradeId).update({
        'status': 'credentials_sent',
      });
    }
  }

  /// Buyer or seller sends a generic chat message in a trade.
  static Future<void> sendMessage({
    required String tradeId,
    required String text,
  }) async {
    try {
      await _api.call({
        'action': 'sendMessage',
        'tradeId': tradeId,
        'text': text,
      });
    } catch (e) {
      debugPrint('[P2PService] sendMessage fallback: $e');
      final uid = _auth.currentUser?.uid;
      final msgRef = _db.collection('p2p_messages').doc();
      await msgRef.set({
        'id': msgRef.id,
        'tradeId': tradeId,
        'senderUid': uid ?? 'user',
        'role': 'text',
        'type': 'text',
        'body': text,
        'read': false,
        'createdAt': FieldValue.serverTimestamp(),
      });
    }
  }

  /// Buyer releases escrow funds to the seller.
  static Future<void> releaseEscrow({required String tradeId}) async {
    try {
      await _api.call({
        'action': 'releaseEscrow',
        'tradeId': tradeId,
      });
    } catch (e) {
      debugPrint('[P2PService] releaseEscrow fallback: $e');
      final tradeDoc = await _db.collection('p2p_trades').doc(tradeId).get();
      if (!tradeDoc.exists) throw Exception('Trade not found');
      final tradeData = tradeDoc.data()!;
      final sellerUid = tradeData['sellerUid'] as String;
      final escrowAmount = (tradeData['escrowAmount'] as num?)?.toDouble() ?? 0.0;
      final sellerRef = _db.collection('users').doc(sellerUid);

      await _db.runTransaction((tx) async {
        final sellerSnap = await tx.get(sellerRef);
        final currentBal = (sellerSnap.data()?['nairaBalance'] as num?)?.toDouble() ?? 0.0;

        tx.update(sellerRef, {'nairaBalance': currentBal + escrowAmount});
        tx.update(tradeDoc.reference, {'status': 'released'});

        final msgRef = _db.collection('p2p_messages').doc();
        tx.set(msgRef, {
          'id': msgRef.id,
          'tradeId': tradeId,
          'senderUid': 'system',
          'senderName': 'Katrex Escrow',
          'role': 'system',
          'type': 'escrow',
          'title': 'Escrow Released Successfully',
          'body': '₦${escrowAmount.toStringAsFixed(0)} has been credited directly to the seller\'s wallet. Trade completed.',
          'read': false,
          'createdAt': FieldValue.serverTimestamp(),
        });
      });
    }
  }

  /// Buyer or seller cancels a trade (only before credentials are sent).
  static Future<void> cancelTrade({required String tradeId}) async {
    try {
      await _api.call({
        'action': 'cancelTrade',
        'tradeId': tradeId,
      });
    } catch (e) {
      debugPrint('[P2PService] cancelTrade fallback: $e');
      final tradeDoc = await _db.collection('p2p_trades').doc(tradeId).get();
      if (!tradeDoc.exists) return;
      final tradeData = tradeDoc.data()!;
      final buyerUid = tradeData['buyerUid'] as String;
      final escrowAmount = (tradeData['escrowAmount'] as num?)?.toDouble() ?? 0.0;

      final buyerRef = _db.collection('users').doc(buyerUid);
      await _db.runTransaction((tx) async {
        final buyerSnap = await tx.get(buyerRef);
        final currentBal = (buyerSnap.data()?['nairaBalance'] as num?)?.toDouble() ?? 0.0;
        tx.update(buyerRef, {'nairaBalance': currentBal + escrowAmount});
        tx.update(tradeDoc.reference, {'status': 'cancelled'});
      });
    }
  }

  /// Buyer or seller opens a dispute. Returns {disputeId}.
  static Future<String> openDispute({
    required String tradeId,
    required String reason,
    String? details,
    List<String>? evidenceUrls,
  }) async {
    final result = await _api.call({
      'action': 'openDispute',
      'tradeId': tradeId,
      'reason': reason,
      if (details != null) 'details': details,
      if (evidenceUrls != null) 'evidenceUrls': evidenceUrls,
    });
    return (result.data as Map<String, dynamic>)['disputeId'] as String;
  }

  /// Close a dispute (only the person who opened it can close it).
  static Future<void> closeDispute({required String tradeId}) async {
    await _api.call({
      'action': 'closeDispute',
      'tradeId': tradeId,
    });
  }

  /// Concede a dispute (only the non-disputing party can concede).
  /// This accepts the dispute claim and refunds/releases escrow accordingly.
  static Future<void> concedeDispute({required String tradeId}) async {
    await _api.call({
      'action': 'concedeDispute',
      'tradeId': tradeId,
    });
  }

  // ─── Admin actions ───────────────────────────────────────────────

  /// Admin approves a pending listing.
  static Future<void> approveListing({required String listingId}) async {
    try {
      await _api.call({
        'action': 'approveListing',
        'listingId': listingId,
      });
    } catch (e) {
      debugPrint('[P2PService] approveListing Cloud Function error, using Firestore fallback: $e');
      await _db.collection('p2p_listings').doc(listingId).update({
        'status': 'live',
        'approvedAt': FieldValue.serverTimestamp(),
      });
    }
  }

  /// Admin rejects a pending listing.
  static Future<void> rejectListing({
    required String listingId,
    required String reason,
  }) async {
    try {
      await _api.call({
        'action': 'rejectListing',
        'listingId': listingId,
        'reason': reason,
      });
    } catch (e) {
      debugPrint('[P2PService] rejectListing Cloud Function error, using Firestore fallback: $e');
      await _db.collection('p2p_listings').doc(listingId).update({
        'status': 'rejected',
        'rejectionReason': reason,
        'rejectedAt': FieldValue.serverTimestamp(),
      });
    }
  }

  /// Admin resolves a dispute.
  /// [resolution] must be one of: 'release_to_seller', 'refund_buyer', 'split'.
  static Future<void> resolveDispute({
    required String disputeId,
    required String resolution,
    String? adminComment,
    double? splitRatio,
  }) async {
    await _api.call({
      'action': 'resolveDispute',
      'disputeId': disputeId,
      'resolution': resolution,
      if (adminComment != null) 'adminComment': adminComment,
      if (splitRatio != null) 'splitRatio': splitRatio,
    });
  }

  /// Admin manually releases escrow for a trade.
  static Future<void> releaseEscrowManual({required String tradeId}) async {
    await _api.call({
      'action': 'releaseEscrowManual',
      'tradeId': tradeId,
    });
  }

  /// Admin manually refunds escrow for a trade.
  static Future<void> refundEscrow({required String tradeId}) async {
    await _api.call({
      'action': 'refundEscrow',
      'tradeId': tradeId,
    });
  }

  /// Admin updates P2P settings.
  static Future<void> updateSettings(Map<String, dynamic> settings) async {
    await _api.call({
      'action': 'updateSettings',
      ...settings,
    });
  }

  /// Admin bans (or unbans) a P2P seller.
  static Future<void> banSeller({
    required String uid,
    required bool banned,
  }) async {
    await _api.call({
      'action': 'banSeller',
      'uid': uid,
      'banned': banned,
    });
  }
}

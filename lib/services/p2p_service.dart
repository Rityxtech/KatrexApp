import 'package:cloud_functions/cloud_functions.dart';

/// Service that calls the P2P Cloud Functions.
///
/// QUOTA-SMART: All 13 P2P actions are routed through a single `p2pApi`
/// Cloud Function (1 Cloud Run service) instead of 13 separate functions.
/// The client sends `{ action: 'createListing', ...payload }` and the
/// server dispatches to the correct handler.
///
/// All wallet/escrow mutations happen server-side via Firestore transactions
/// (see functions/src/p2p-functions.ts). The client only triggers actions
/// and listens to Firestore streams for real-time updates.
class P2PService {
  P2PService._();

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
  }) async {
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
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  // ─── Purchase ────────────────────────────────────────────────────

  /// Buyer purchases a listing. Escrow is locked server-side.
  /// Returns {tradeId}.
  static Future<String> buyListing({required String listingId}) async {
    final result = await _api.call({
      'action': 'buyListing',
      'listingId': listingId,
    });
    return (result.data as Map<String, dynamic>)['tradeId'] as String;
  }

  // ─── Trade actions ───────────────────────────────────────────────

  /// Seller sends credentials to the buyer.
  static Future<void> sendCredentials({
    required String tradeId,
    required String text,
    String? attachmentUrl,
  }) async {
    await _api.call({
      'action': 'sendCredentials',
      'tradeId': tradeId,
      'text': text,
      if (attachmentUrl != null) 'attachmentUrl': attachmentUrl,
    });
  }

  /// Buyer or seller sends a generic chat message in a trade.
  static Future<void> sendMessage({
    required String tradeId,
    required String text,
  }) async {
    await _api.call({
      'action': 'sendMessage',
      'tradeId': tradeId,
      'text': text,
    });
  }

  /// Buyer releases escrow funds to the seller.
  static Future<void> releaseEscrow({required String tradeId}) async {
    await _api.call({
      'action': 'releaseEscrow',
      'tradeId': tradeId,
    });
  }

  /// Buyer or seller cancels a trade (only before credentials are sent).
  /// Refunds the buyer and relists the listing.
  static Future<void> cancelTrade({required String tradeId}) async {
    await _api.call({
      'action': 'cancelTrade',
      'tradeId': tradeId,
    });
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
    await _api.call({
      'action': 'approveListing',
      'listingId': listingId,
    });
  }

  /// Admin rejects a pending listing.
  static Future<void> rejectListing({
    required String listingId,
    required String reason,
  }) async {
    await _api.call({
      'action': 'rejectListing',
      'listingId': listingId,
      'reason': reason,
    });
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

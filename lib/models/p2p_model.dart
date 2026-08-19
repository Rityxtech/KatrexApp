import 'package:cloud_firestore/cloud_firestore.dart';

/// Status of a P2P listing.
enum P2PListingStatus {
  pending,
  live,
  rejected,
  sold,
  delisted;

  String get value => name;

  static P2PListingStatus fromString(String? v) {
    return P2PListingStatus.values.firstWhere(
      (e) => e.value == v,
      orElse: () => P2PListingStatus.pending,
    );
  }
}

/// Status of a P2P trade (purchase lifecycle).
enum P2PTradeStatus {
  escrowLocked,
  credentialsSent,
  buyerSecured,
  released,
  disputed,
  refunded,
  cancelled;

  String get value {
    switch (this) {
      case P2PTradeStatus.escrowLocked: return 'escrow_locked';
      case P2PTradeStatus.credentialsSent: return 'credentials_sent';
      case P2PTradeStatus.buyerSecured: return 'buyer_secured';
      case P2PTradeStatus.released: return 'released';
      case P2PTradeStatus.disputed: return 'disputed';
      case P2PTradeStatus.refunded: return 'refunded';
      case P2PTradeStatus.cancelled: return 'cancelled';
    }
  }

  static P2PTradeStatus fromString(String? v) {
    return P2PTradeStatus.values.firstWhere(
      (e) => e.value == v,
      orElse: () => P2PTradeStatus.escrowLocked,
    );
  }
}

enum P2PEscrowStatus { locked, released, frozen, refunded }

enum P2PMessageRole { buyer, seller, system, admin }

enum P2PMessageType { text, escrow, action, credentials, dispute }

/// A P2P account listing (social media account for sale).
class P2PListing {
  final String id;
  final String sellerUid;
  final String sellerName;
  final String sellerAvatarUrl;
  final double sellerRating;
  final int sellerTrades;
  final String platform;
  final String handle; // masked, e.g. "@style_****"
  final String title;
  final String niche;
  final int followers;
  final bool verified;
  final double priceNaira;
  final String priceType;
  final P2PListingStatus status;
  final String? rejectionReason;
  final DateTime? createdAt;
  final DateTime? approvedAt;

  P2PListing({
    required this.id,
    required this.sellerUid,
    required this.sellerName,
    required this.sellerAvatarUrl,
    required this.sellerRating,
    required this.sellerTrades,
    required this.platform,
    required this.handle,
    required this.title,
    required this.niche,
    required this.followers,
    required this.verified,
    required this.priceNaira,
    required this.priceType,
    required this.status,
    this.rejectionReason,
    this.createdAt,
    this.approvedAt,
  });

  factory P2PListing.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return P2PListing(
      id: doc.id,
      sellerUid: d['sellerUid'] as String? ?? '',
      sellerName: d['sellerName'] as String? ?? 'Seller',
      sellerAvatarUrl: d['sellerAvatarUrl'] as String? ?? '',
      sellerRating: (d['sellerRating'] as num?)?.toDouble() ?? 0,
      sellerTrades: (d['sellerTrades'] as num?)?.toInt() ?? 0,
      platform: d['platform'] as String? ?? '',
      handle: d['handle'] as String? ?? '',
      title: d['title'] as String? ?? '',
      niche: d['niche'] as String? ?? '',
      followers: (d['followers'] as num?)?.toInt() ?? 0,
      verified: d['verified'] as bool? ?? false,
      priceNaira: (d['priceNaira'] as num?)?.toDouble() ?? 0,
      priceType: d['priceType'] as String? ?? 'Fixed Price',
      status: P2PListingStatus.fromString(d['status'] as String?),
      rejectionReason: d['rejectionReason'] as String?,
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
      approvedAt: (d['approvedAt'] as Timestamp?)?.toDate(),
    );
  }

  /// Format follower count as "12.5k", "1.2M".
  String get followersLabel {
    if (followers >= 1000000) {
      return '${(followers / 1000000).toStringAsFixed(followers % 1000000 == 0 ? 0 : 1)}M';
    }
    if (followers >= 1000) {
      return '${(followers / 1000).toStringAsFixed(followers % 1000 == 0 ? 0 : 1)}k';
    }
    return followers.toString();
  }

  /// Format price as "₦85,000".
  String get priceLabel {
    final s = priceNaira.toStringAsFixed(0);
    final withCommas = s.replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
    return '\u20A6$withCommas';
  }
}

/// Snapshot of a listing captured at purchase time (stored on the trade).
class P2PListingSnapshot {
  final String platform;
  final String title;
  final String handle;
  final String? fullHandle; // only populated after credentials sent
  final String niche;
  final int followers;
  final bool verified;

  P2PListingSnapshot({
    required this.platform,
    required this.title,
    required this.handle,
    this.fullHandle,
    required this.niche,
    required this.followers,
    required this.verified,
  });

  factory P2PListingSnapshot.fromMap(Map<String, dynamic> d) {
    return P2PListingSnapshot(
      platform: d['platform'] as String? ?? '',
      title: d['title'] as String? ?? '',
      handle: d['handle'] as String? ?? '',
      fullHandle: d['fullHandle'] as String?,
      niche: d['niche'] as String? ?? '',
      followers: (d['followers'] as num?)?.toInt() ?? 0,
      verified: d['verified'] as bool? ?? false,
    );
  }

  String get followersLabel {
    if (followers >= 1000000) {
      return '${(followers / 1000000).toStringAsFixed(followers % 1000000 == 0 ? 0 : 1)}M';
    }
    if (followers >= 1000) {
      return '${(followers / 1000).toStringAsFixed(followers % 1000 == 0 ? 0 : 1)}k';
    }
    return followers.toString();
  }
}

/// A P2P trade (one purchase of a listing).
class P2PTrade {
  final String id;
  final String listingId;
  final P2PListingSnapshot listingSnapshot;
  final String buyerUid;
  final String sellerUid;
  final double priceNaira;
  final double escrowFeeNaira;
  final double totalNaira;
  final P2PTradeStatus status;
  final P2PEscrowStatus escrowStatus;
  final DateTime? escrowReleasedAt;
  final DateTime? disputeOpenedAt;
  final String? disputeOpenedBy;
  final bool autoReleased;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  P2PTrade({
    required this.id,
    required this.listingId,
    required this.listingSnapshot,
    required this.buyerUid,
    required this.sellerUid,
    required this.priceNaira,
    required this.escrowFeeNaira,
    required this.totalNaira,
    required this.status,
    required this.escrowStatus,
    this.escrowReleasedAt,
    this.disputeOpenedAt,
    this.disputeOpenedBy,
    this.autoReleased = false,
    this.createdAt,
    this.updatedAt,
  });

  factory P2PTrade.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data() ?? {};
    return P2PTrade(
      id: doc.id,
      listingId: d['listingId'] as String? ?? '',
      listingSnapshot: P2PListingSnapshot.fromMap(
        Map<String, dynamic>.from(d['listingSnapshot'] as Map? ?? {}),
      ),
      buyerUid: d['buyerUid'] as String? ?? '',
      sellerUid: d['sellerUid'] as String? ?? '',
      priceNaira: (d['priceNaira'] as num?)?.toDouble() ?? 0,
      escrowFeeNaira: (d['escrowFeeNaira'] as num?)?.toDouble() ?? 0,
      totalNaira: (d['totalNaira'] as num?)?.toDouble() ?? 0,
      status: P2PTradeStatus.fromString(d['status'] as String?),
      escrowStatus: _escrowFromString(d['escrowStatus'] as String?),
      escrowReleasedAt: (d['escrowReleasedAt'] as Timestamp?)?.toDate(),
      disputeOpenedAt: (d['disputeOpenedAt'] as Timestamp?)?.toDate(),
      disputeOpenedBy: d['disputeOpenedBy'] as String?,
      autoReleased: d['autoReleased'] as bool? ?? false,
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
      updatedAt: (d['updatedAt'] as Timestamp?)?.toDate(),
    );
  }

  String get totalLabel {
    final s = totalNaira.toStringAsFixed(0);
    final withCommas = s.replaceAllMapped(
      RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'),
      (m) => '${m[1]},',
    );
    return '\u20A6$withCommas';
  }

  /// Whether the current user is the buyer of this trade.
  bool isBuyer(String uid) => buyerUid == uid;

  /// Whether the current user is the seller of this trade.
  bool isSeller(String uid) => sellerUid == uid;
}

P2PEscrowStatus _escrowFromString(String? v) {
  switch (v) {
    case 'locked': return P2PEscrowStatus.locked;
    case 'released': return P2PEscrowStatus.released;
    case 'frozen': return P2PEscrowStatus.frozen;
    case 'refunded': return P2PEscrowStatus.refunded;
    default: return P2PEscrowStatus.locked;
  }
}

/// A chat message in a P2P trade's order screen.
class P2PMessage {
  final String id;
  final String tradeId;
  final String senderUid;
  final P2PMessageRole senderRole;
  final P2PMessageType type;
  final String? text;
  final String? title;
  final String? body;
  final String? body2;
  final String? attachmentUrl;
  bool read;
  final DateTime? createdAt;

  P2PMessage({
    required this.id,
    required this.tradeId,
    required this.senderUid,
    required this.senderRole,
    required this.type,
    this.text,
    this.title,
    this.body,
    this.body2,
    this.attachmentUrl,
    this.read = false,
    this.createdAt,
  });

  factory P2PMessage.fromDoc(QueryDocumentSnapshot<Map<String, dynamic>> doc) {
    final d = doc.data();
    return P2PMessage(
      id: doc.id,
      tradeId: d['tradeId'] as String? ?? '',
      senderUid: d['senderUid'] as String? ?? '',
      senderRole: _roleFromString(d['senderRole'] as String?),
      type: _typeFromString(d['type'] as String?),
      text: d['text'] as String?,
      title: d['title'] as String?,
      body: d['body'] as String?,
      body2: d['body2'] as String?,
      attachmentUrl: d['attachmentUrl'] as String?,
      read: d['read'] as bool? ?? false,
      createdAt: (d['createdAt'] as Timestamp?)?.toDate(),
    );
  }

  String get timeLabel {
    if (createdAt == null) return '';
    final h = createdAt!.hour > 12 ? createdAt!.hour - 12 : (createdAt!.hour == 0 ? 12 : createdAt!.hour);
    final m = createdAt!.minute.toString().padLeft(2, '0');
    final ampm = createdAt!.hour >= 12 ? 'PM' : 'AM';
    return '$h:$m $ampm';
  }
}

P2PMessageRole _roleFromString(String? v) {
  switch (v) {
    case 'buyer': return P2PMessageRole.buyer;
    case 'seller': return P2PMessageRole.seller;
    case 'admin': return P2PMessageRole.admin;
    default: return P2PMessageRole.system;
  }
}

P2PMessageType _typeFromString(String? v) {
  switch (v) {
    case 'escrow': return P2PMessageType.escrow;
    case 'action': return P2PMessageType.action;
    case 'credentials': return P2PMessageType.credentials;
    case 'dispute': return P2PMessageType.dispute;
    default: return P2PMessageType.text;
  }
}

/// Admin-configurable P2P settings (from app_settings/p2p).
class P2PSettings {
  final double escrowFeePercent;
  final bool autoApproveListings;
  final int minFollowers;
  final int maxListingsPerUser;
  final int disputeTimeoutHours;
  final int escrowReleaseTimeoutHours;
  final List<String> bannedPlatforms;

  const P2PSettings({
    this.escrowFeePercent = 0,
    this.autoApproveListings = false,
    this.minFollowers = 100,
    this.maxListingsPerUser = 10,
    this.disputeTimeoutHours = 24,
    this.escrowReleaseTimeoutHours = 72,
    this.bannedPlatforms = const [],
  });

  factory P2PSettings.fromDoc(DocumentSnapshot<Map<String, dynamic>>? doc) {
    final d = doc?.data();
    return P2PSettings(
      escrowFeePercent: (d?['escrowFeePercent'] as num?)?.toDouble() ?? 0,
      autoApproveListings: d?['autoApproveListings'] as bool? ?? false,
      minFollowers: (d?['minFollowers'] as num?)?.toInt() ?? 100,
      maxListingsPerUser: (d?['maxListingsPerUser'] as num?)?.toInt() ?? 10,
      disputeTimeoutHours: (d?['disputeTimeoutHours'] as num?)?.toInt() ?? 24,
      escrowReleaseTimeoutHours: (d?['escrowReleaseTimeoutHours'] as num?)?.toInt() ?? 72,
      bannedPlatforms: List<String>.from(d?['bannedPlatforms'] as List? ?? []),
    );
  }
}

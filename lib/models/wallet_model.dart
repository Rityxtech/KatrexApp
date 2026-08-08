import 'package:cloud_firestore/cloud_firestore.dart';

class WalletModel {
  final String uid;

  /// Fiat balance in Naira (kobo precision handled as double).
  final double nairaBalance;

  /// Map of coin symbol → amount held (e.g. {'BTC': 0.0130, 'ETH': 0.18}).
  final Map<String, double> cryptoBalances;

  /// Total portfolio value in Naira (calculated server-side or on read).
  final double totalValueNaira;

  /// List of coin symbols the user has chosen to display (default: all supported).
  final List<String> visibleCoins;

  final DateTime createdAt;
  final DateTime updatedAt;

  WalletModel({
    required this.uid,
    this.nairaBalance = 0,
    this.cryptoBalances = const {},
    this.totalValueNaira = 0,
    this.visibleCoins = const [],
    required this.createdAt,
    required this.updatedAt,
  });

  factory WalletModel.fromMap(Map<String, dynamic> map) {
    final cryptoRaw = map['cryptoBalances'] as Map<String, dynamic>? ?? {};
    final visibleRaw = map['visibleCoins'] as List<dynamic>? ?? [];
    return WalletModel(
      uid: map['uid'] as String,
      nairaBalance: (map['nairaBalance'] as num?)?.toDouble() ?? 0,
      cryptoBalances: cryptoRaw.map((k, v) => MapEntry(k, (v as num).toDouble())),
      totalValueNaira: (map['totalValueNaira'] as num?)?.toDouble() ?? 0,
      visibleCoins: visibleRaw.map((e) => e.toString()).toList(),
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'nairaBalance': nairaBalance,
      'cryptoBalances': cryptoBalances,
      'totalValueNaira': totalValueNaira,
      'visibleCoins': visibleCoins,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  WalletModel copyWith({
    double? nairaBalance,
    Map<String, double>? cryptoBalances,
    double? totalValueNaira,
    List<String>? visibleCoins,
    DateTime? updatedAt,
  }) {
    return WalletModel(
      uid: uid,
      nairaBalance: nairaBalance ?? this.nairaBalance,
      cryptoBalances: cryptoBalances ?? this.cryptoBalances,
      totalValueNaira: totalValueNaira ?? this.totalValueNaira,
      visibleCoins: visibleCoins ?? this.visibleCoins,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

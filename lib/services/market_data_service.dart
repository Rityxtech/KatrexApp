import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Represents live market data for a single coin.
class CoinMarketData {
  final String symbol;
  final String name;
  final double priceUsd;
  final double priceNaira;
  final double change24h;
  final double change1h;
  final double change7d;
  final double marketCap;
  final double volume24h;
  final double high24h;
  final double low24h;
  final double ath;
  final double circulatingSupply;
  final List<double> sparkline;
  final double ngnRate;
  final DateTime updatedAt;

  CoinMarketData({
    required this.symbol,
    required this.name,
    required this.priceUsd,
    required this.priceNaira,
    required this.change24h,
    required this.change1h,
    required this.change7d,
    required this.marketCap,
    required this.volume24h,
    required this.high24h,
    required this.low24h,
    required this.ath,
    required this.circulatingSupply,
    required this.sparkline,
    required this.ngnRate,
    required this.updatedAt,
  });

  factory CoinMarketData.fromMap(Map<String, dynamic> map) {
    final sparklineRaw = map['sparkline'] as List? ?? [];
    return CoinMarketData(
      symbol: map['symbol'] as String? ?? '',
      name: map['name'] as String? ?? '',
      priceUsd: (map['priceUsd'] as num?)?.toDouble() ?? 0,
      priceNaira: (map['priceNaira'] as num?)?.toDouble() ?? 0,
      change24h: (map['change24h'] as num?)?.toDouble() ?? 0,
      change1h: (map['change1h'] as num?)?.toDouble() ?? 0,
      change7d: (map['change7d'] as num?)?.toDouble() ?? 0,
      marketCap: (map['marketCap'] as num?)?.toDouble() ?? 0,
      volume24h: (map['volume24h'] as num?)?.toDouble() ?? 0,
      high24h: (map['high24h'] as num?)?.toDouble() ?? 0,
      low24h: (map['low24h'] as num?)?.toDouble() ?? 0,
      ath: (map['ath'] as num?)?.toDouble() ?? 0,
      circulatingSupply: (map['circulatingSupply'] as num?)?.toDouble() ?? 0,
      sparkline: sparklineRaw.map((e) => (e as num).toDouble()).toList(),
      ngnRate: (map['ngnRate'] as num?)?.toDouble() ?? 1450,
      updatedAt: map['updatedAt'] is Timestamp
          ? (map['updatedAt'] as Timestamp).toDate()
          : DateTime.now(),
    );
  }

  bool get isUp => change24h >= 0;
}

/// Streams live market data from the shared Firestore `market_data` collection.
/// All users read from the same documents — no per-user API calls.
class MarketDataService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;
  static final Map<String, CoinMarketData> _cache = {};

  /// Get a cached coin data (from last watchAllCoins/watchCoin emission).
  static CoinMarketData? getCached(String symbol) {
    return _cache[symbol.toUpperCase()];
  }

  /// Stream a single coin's market data in real-time.
  static Stream<CoinMarketData?> watchCoin(String symbol) {
    return _db
        .collection('market_data')
        .doc(symbol.toLowerCase())
        .snapshots()
        .map((snap) {
      if (!snap.exists) return null;
      final data = CoinMarketData.fromMap(snap.data()!);
      _cache[data.symbol.toUpperCase()] = data;
      return data;
    });
  }

  /// Stream all coin market data at once.
  static Stream<List<CoinMarketData>> watchAllCoins() {
    return _db
        .collection('market_data')
        .snapshots()
        .map((snap) {
      final list = snap.docs
          .where((doc) => doc.id != '_ngn_rate')
          .map((doc) {
            final data = CoinMarketData.fromMap(doc.data());
            _cache[data.symbol.toUpperCase()] = data;
            return data;
          })
          .toList();
      return list;
    });
  }

  /// Get a single coin's market data once (not real-time).
  static Future<CoinMarketData?> getCoin(String symbol) async {
    final snap = await _db
        .collection('market_data')
        .doc(symbol.toLowerCase())
        .get();
    if (!snap.exists) return null;
    return CoinMarketData.fromMap(snap.data()!);
  }

  /// Get the current NGN rate.
  static Stream<double> watchNgnRate() {
    return _db
        .collection('market_data')
        .doc('_ngn_rate')
        .snapshots()
        .map((snap) {
      if (!snap.exists) return 1450.0;
      return (snap.data()?['rate'] as num?)?.toDouble() ?? 1450.0;
    });
  }
}

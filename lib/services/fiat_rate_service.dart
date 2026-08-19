import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:meta/meta.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

/// Reads real-time fiat currency exchange rates from Firestore.
///
/// A scheduled Cloud Function (`updateFiatRates`) fetches live rates from
/// open.er-api.com every 1 minute and writes them to
/// `app_config/fiat_rates`. All users read from that single document
/// via a Firestore listener — no per-user API calls.
///
/// **No fallback rates.** If rates aren't in Firestore yet, conversions
/// return null and the UI shows a loading state.
///
/// Admin profit margins (buy/sell spread percentages) are read from
/// `app_config/fiat_spreads` and applied on top of the live rates.
class FiatRateService extends ChangeNotifier {
  FiatRateService._();
  static final FiatRateService instance = FiatRateService._();

  FirebaseFirestore? _dbInstance;
  FirebaseFirestore get _db => _dbInstance ??= FirebaseFirestore.instance;

  /// Live rates relative to USD: { 'NGN': 1363.19, 'GBP': 0.74, ... }
  Map<String, double> _rates = {};
  DateTime? _lastUpdated;

  /// Admin-configured profit margins from Firestore.
  double _buySpreadPercent = 0;
  double _sellSpreadPercent = 0;

  StreamSubscription<DocumentSnapshot>? _ratesSub;
  StreamSubscription<DocumentSnapshot>? _spreadSub;
  bool _started = false;

  Map<String, double> get rates => _rates;
  DateTime? get lastUpdated => _lastUpdated;
  bool get hasRates => _rates.isNotEmpty;
  double get buySpreadPercent => _buySpreadPercent;
  double get sellSpreadPercent => _sellSpreadPercent;

  /// Starts listening to the `app_config/fiat_rates` and
  /// `app_config/fiat_spreads` Firestore documents.
  /// Called once from MarketDataNotifier when it starts listening.
  void start() {
    if (_started) return;
    _started = true;

    // Listen to fiat rates (written by the updateFiatRates scheduled function)
    _ratesSub = _db
        .collection('app_config')
        .doc('fiat_rates')
        .snapshots(includeMetadataChanges: false)
        .listen((snap) {
      if (snap.exists) {
        final data = snap.data()!;
        final rawRates = data['rates'] as Map<String, dynamic>?;
        if (rawRates != null) {
          _rates = rawRates.map((k, v) => MapEntry(k, (v as num).toDouble()));
          _lastUpdated = DateTime.now();
          debugPrint('[FiatRateService] Loaded ${_rates.length} rates from Firestore');
          notifyListeners();
        }
      }
    }, onError: (e) {
      debugPrint('[FiatRateService] Rates listener error: $e');
    });

    // Listen to admin spread config
    _spreadSub = _db
        .collection('app_config')
        .doc('fiat_spreads')
        .snapshots(includeMetadataChanges: false)
        .listen((snap) {
      if (snap.exists) {
        final data = snap.data()!;
        _buySpreadPercent = (data['buySpreadPercent'] as num?)?.toDouble() ?? 0;
        _sellSpreadPercent = (data['sellSpreadPercent'] as num?)?.toDouble() ?? 0;
        debugPrint('[FiatRateService] Spreads: buy=$_buySpreadPercent%, sell=$_sellSpreadPercent%');
        notifyListeners();
      }
    }, onError: (e) {
      debugPrint('[FiatRateService] Spread listener error: $e');
    });
  }

  /// Converts an amount from one currency to another using live rates
  /// with the admin's profit margin applied.
  ///
  /// Returns null if live rates are not available. **Never falls back
  /// to hardcoded rates.**
  double? convert(double amount, String fromCurrency, String toCurrency) {
    if (fromCurrency == toCurrency) return amount;
    if (_rates.isEmpty) return null;
    final fromRate = _rates[fromCurrency];
    final toRate = _rates[toCurrency];
    if (fromRate == null || toRate == null) return null;

    // Raw conversion via USD as base
    final rawConverted = (amount / fromRate) * toRate;

    // Apply admin spread: user gets less than market rate
    final spreadPercent = _sellSpreadPercent;
    if (spreadPercent > 0) {
      return rawConverted * (1 - spreadPercent / 100);
    }
    return rawConverted;
  }

  /// Converts a local currency amount to USD (with spread applied).
  double? toUsd(double amount, String fromCurrency) {
    return convert(amount, fromCurrency, 'USD');
  }

  /// Converts a USD amount to a target currency (with spread applied).
  double? fromUsd(double usdAmount, String toCurrency) {
    return convert(usdAmount, 'USD', toCurrency);
  }

  /// Converts a NGN amount to a target currency using a KNOWN NGN rate
  /// (from market_data/_ngn_rate) instead of the fiat_rates NGN rate.
  ///
  /// This is critical because `totalValueNaira` in the wallet is calculated
  /// server-side using the market_data NGN rate. If we convert it back to
  /// USD using a different NGN rate from fiat_rates, we get a double-
  /// conversion error.
  ///
  /// Flow: NGN → USD (using knownNgnRate) → target currency (using fiat_rates)
  double? convertFromNgnWithKnownRate(double ngnAmount, String toCurrency, double knownNgnRate) {
    if (toCurrency == 'NGN') return ngnAmount;
    if (_rates.isEmpty) return null;
    if (knownNgnRate <= 0) return null;
    final toRate = _rates[toCurrency];
    if (toRate == null || toRate <= 0) return null;
    // Step 1: NGN → USD using the known rate
    final usdValue = ngnAmount / knownNgnRate;
    // Step 2: USD → target currency using fiat_rates
    final rawConverted = usdValue * toRate;
    // Apply admin spread
    final spreadPercent = _sellSpreadPercent;
    if (spreadPercent > 0) {
      return rawConverted * (1 - spreadPercent / 100);
    }
    return rawConverted;
  }

  /// Raw market rate for a currency relative to USD (no spread).
  double? rateFor(String currency) {
    return _rates[currency];
  }

  /// Effective rate with admin's sell spread applied.
  double? effectiveRateFor(String currency) {
    final raw = _rates[currency];
    if (raw == null) return null;
    if (_sellSpreadPercent > 0) {
      return raw * (1 - _sellSpreadPercent / 100);
    }
    return raw;
  }

  @override
  void dispose() {
    _ratesSub?.cancel();
    _spreadSub?.cancel();
    _ratesSub = null;
    _spreadSub = null;
    _started = false;
    super.dispose();
  }

  // ─── Test helpers (only used in tests) ────────────────────────────

  /// Sets rates directly for testing. Not for production use.
  @visibleForTesting
  void testSetRates(Map<String, double> rates) {
    _rates = rates;
  }

  /// Sets spreads directly for testing. Not for production use.
  @visibleForTesting
  void testSetSpreads(double buy, double sell) {
    _buySpreadPercent = buy;
    _sellSpreadPercent = sell;
  }
}

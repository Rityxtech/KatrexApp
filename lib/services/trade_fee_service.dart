import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';

import '../utils/constants.dart';

/// Manages trade fee configuration from Firestore `app_config/trade_fees` document.
///
/// Admin can update fees at any time in Firestore and all clients get the update
/// in real-time via the stream.
///
/// Expected Firestore document structure:
/// ```
/// app_config/trade_fees:
///   buyFeePercent: 0.5
///   sellFeePercent: 0.5
///   swapFeePercent: 0.5
///   sendFeePercent: 1.0
///   updatedAt: Timestamp
/// ```
class TradeFeeService {
  static final FirebaseFirestore _db = FirebaseFirestore.instance;

  static const _defaultBuyFee = 0.5;
  static const _defaultSellFee = 0.5;
  static const _defaultSwapFee = 0.5;
  static const _defaultSendFee = 1.0;

  static double _buyFee = _defaultBuyFee;
  static double _sellFee = _defaultSellFee;
  static double _swapFee = _defaultSwapFee;
  static double _sendFee = _defaultSendFee;

  static double get buyFeePercent => _buyFee;
  static double get sellFeePercent => _sellFee;
  static double get swapFeePercent => _swapFee;
  static double get sendFeePercent => _sendFee;

  static StreamSubscription? _sub;

  /// Start listening for fee config changes in real-time.
  static void init() {
    _sub?.cancel();
    _sub = _db
        .collection(FirestoreCollections.appConfig)
        .doc('trade_fees')
        .snapshots()
        .listen((snap) {
      if (snap.exists) {
        final data = snap.data()!;
        _buyFee = (data['buyFeePercent'] as num?)?.toDouble() ?? _defaultBuyFee;
        _sellFee = (data['sellFeePercent'] as num?)?.toDouble() ?? _defaultSellFee;
        _swapFee = (data['swapFeePercent'] as num?)?.toDouble() ?? _defaultSwapFee;
        _sendFee = (data['sendFeePercent'] as num?)?.toDouble() ?? _defaultSendFee;
      }
    });
  }

  /// Stop listening for fee config changes.
  static void dispose() {
    _sub?.cancel();
    _sub = null;
  }

  /// Calculate the fee amount for a buy trade.
  /// Returns the fee in NGN.
  static double calculateBuyFee(double nairaAmount) {
    return nairaAmount * (_buyFee / 100);
  }

  /// Calculate the fee for a sell trade.
  /// Returns the fee in NGN.
  static double calculateSellFee(double nairaAmount) {
    return nairaAmount * (_sellFee / 100);
  }

  /// Calculate the fee for a swap trade.
  /// Returns the fee in the destination coin amount.
  static double calculateSwapFee(double toAmount) {
    return toAmount * (_swapFee / 100);
  }

  /// Calculate the fee for a send trade.
  /// Returns the fee in the coin amount being sent.
  static double calculateSendFee(double coinAmount) {
    return coinAmount * (_sendFee / 100);
  }
}

import 'package:cloud_firestore/cloud_firestore.dart';

enum TransactionType {
  deposit,
  withdrawal,
  buy,
  sell,
  swap,
  send,
  receive,
  airtime,
  data,
  giftcard,
  referralBonus,
}

enum TransactionStatus {
  pending,
  processing,
  completed,
  failed,
  cancelled,
}

extension TransactionTypeX on TransactionType {
  String get label {
    switch (this) {
      case TransactionType.deposit: return 'Deposit';
      case TransactionType.withdrawal: return 'Withdrawal';
      case TransactionType.buy: return 'Buy';
      case TransactionType.sell: return 'Sell';
      case TransactionType.swap: return 'Swap';
      case TransactionType.send: return 'Send';
      case TransactionType.receive: return 'Receive';
      case TransactionType.airtime: return 'Airtime Purchase';
      case TransactionType.data: return 'Data Purchase';
      case TransactionType.giftcard: return 'Gift Card Trade';
      case TransactionType.referralBonus: return 'Referral Bonus';
    }
  }

  String get value {
    switch (this) {
      case TransactionType.deposit: return 'deposit';
      case TransactionType.withdrawal: return 'withdrawal';
      case TransactionType.buy: return 'buy';
      case TransactionType.sell: return 'sell';
      case TransactionType.swap: return 'swap';
      case TransactionType.send: return 'send';
      case TransactionType.receive: return 'receive';
      case TransactionType.airtime: return 'airtime';
      case TransactionType.data: return 'data';
      case TransactionType.giftcard: return 'giftcard';
      case TransactionType.referralBonus: return 'referral_bonus';
    }
  }

  static TransactionType fromString(String? v) {
    return TransactionType.values.firstWhere(
      (e) => e.value == v,
      orElse: () => TransactionType.deposit,
    );
  }
}

extension TransactionStatusX on TransactionStatus {
  String get value {
    switch (this) {
      case TransactionStatus.pending: return 'pending';
      case TransactionStatus.processing: return 'processing';
      case TransactionStatus.completed: return 'completed';
      case TransactionStatus.failed: return 'failed';
      case TransactionStatus.cancelled: return 'cancelled';
    }
  }

  static TransactionStatus fromString(String? v) {
    return TransactionStatus.values.firstWhere(
      (e) => e.value == v,
      orElse: () => TransactionStatus.pending,
    );
  }
}

class TransactionModel {
  final String id;
  final String uid;
  final TransactionType type;
  final TransactionStatus status;
  final double amountNaira;
  final String? amountCoin;
  final String? coinSymbol;
  final String? description;
  final String? reference;
  final DateTime createdAt;
  final DateTime? completedAt;

  /// For gift card trades: the card type / brand name.
  final String? cardBrand;

  /// For airtime/data: the network provider.
  final String? networkProvider;

  /// For transfers: the recipient's identifier (phone, address, or account).
  final String? recipient;

  /// For deposits/withdrawals: the payment method used.
  final String? paymentMethod;

  final double? feeAmount;
  final String? feeSymbol;
  final String? adminNote;

  TransactionModel({
    required this.id,
    required this.uid,
    required this.type,
    required this.status,
    required this.amountNaira,
    this.amountCoin,
    this.coinSymbol,
    this.description,
    this.reference,
    required this.createdAt,
    this.completedAt,
    this.cardBrand,
    this.networkProvider,
    this.recipient,
    this.paymentMethod,
    this.feeAmount,
    this.feeSymbol,
    this.adminNote,
  });

  factory TransactionModel.fromMap(Map<String, dynamic> map) {
    return TransactionModel(
      id: map['id'] as String,
      uid: map['uid'] as String,
      type: TransactionTypeX.fromString(map['type'] as String?),
      status: TransactionStatusX.fromString(map['status'] as String?),
      amountNaira: (map['amountNaira'] as num?)?.toDouble() ?? 0,
      amountCoin: map['amountCoin'] as String?,
      coinSymbol: map['coinSymbol'] as String?,
      description: map['description'] as String?,
      reference: map['reference'] as String?,
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      completedAt: map['completedAt'] != null
          ? (map['completedAt'] as Timestamp?)?.toDate()
          : null,
      cardBrand: map['cardBrand'] as String?,
      networkProvider: map['networkProvider'] as String?,
      recipient: map['recipient'] as String?,
      paymentMethod: map['paymentMethod'] as String?,
      feeAmount: (map['feeAmount'] as num?)?.toDouble(),
      feeSymbol: map['feeSymbol'] as String?,
      adminNote: map['adminNote'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'uid': uid,
      'type': type.value,
      'status': status.value,
      'amountNaira': amountNaira,
      'amountCoin': amountCoin,
      'coinSymbol': coinSymbol,
      'description': description,
      'reference': reference,
      'createdAt': Timestamp.fromDate(createdAt),
      'completedAt': completedAt != null
          ? Timestamp.fromDate(completedAt!)
          : null,
      'cardBrand': cardBrand,
      'networkProvider': networkProvider,
      'recipient': recipient,
      'paymentMethod': paymentMethod,
      'feeAmount': feeAmount,
      'feeSymbol': feeSymbol,
      'adminNote': adminNote,
    };
  }
}

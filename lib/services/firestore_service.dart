import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/transaction_model.dart';
import '../models/notification_model.dart';
import '../models/wallet_model.dart';
import '../utils/constants.dart';
import 'trade_fee_service.dart';

/// Handles all Firestore CRUD operations for app data.
class FirestoreService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  // ─── Wallet ──────────────────────────────────────────────

  /// Stream the user's wallet document for real-time balance updates.
  Stream<WalletModel> watchWallet(String uid) {
    return _db
        .collection(FirestoreCollections.wallets)
        .doc(uid)
        .snapshots()
        .where((snap) => snap.exists && snap.data() != null)
        .map((snap) => WalletModel.fromMap(snap.data()!));
  }

  /// Get the user's wallet once.
  Future<WalletModel> getWallet(String uid) async {
    final doc = await _db
        .collection(FirestoreCollections.wallets)
        .doc(uid)
        .get();
    if (!doc.exists || doc.data() == null) {
      return WalletModel(
        uid: uid,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
    }
    return WalletModel.fromMap(doc.data()!);
  }

  /// Update the wallet document (use with Cloud Functions for security in prod).
  Future<void> updateWallet(WalletModel wallet) async {
    await _db
        .collection(FirestoreCollections.wallets)
        .doc(wallet.uid)
        .set(wallet.toMap(), SetOptions(merge: true));
  }

  /// Persist the user's visible coin preferences.
  Future<void> updateVisibleCoins(String uid, List<String> coins) async {
    await _db
        .collection(FirestoreCollections.wallets)
        .doc(uid)
        .set({
          'visibleCoins': coins,
          'updatedAt': FieldValue.serverTimestamp(),
        }, SetOptions(merge: true));
  }

  // ─── Transactions ────────────────────────────────────────

  /// Create a new transaction record.
  Future<String> createTransaction(TransactionModel tx) async {
    final docRef = await _db
        .collection(FirestoreCollections.transactions)
        .add(tx.toMap());

    await _createTransactionNotification(tx);

    return docRef.id;
  }

  Future<void> _createTransactionNotification(TransactionModel tx) async {
    final typeStr = tx.type.name;
    final statusStr = tx.status.name;
    final amount = tx.amountNaira;

    NotificationType notifType;
    String title;
    String body;

    switch (tx.type) {
      case TransactionType.deposit:
        notifType = NotificationType.deposit;
        title = tx.status == TransactionStatus.failed
            ? 'Deposit Failed'
            : tx.status == TransactionStatus.pending
                ? 'Deposit Pending'
                : 'Deposit Successful';
        body = tx.status == TransactionStatus.failed
            ? 'Your deposit of \u20A6${_fmtAmount(amount)} could not be completed.'
            : 'Your deposit of \u20A6${_fmtAmount(amount)} has been ${tx.status == TransactionStatus.pending ? "initiated" : "credited"}.';
        break;
      case TransactionType.withdrawal:
        notifType = NotificationType.withdrawal;
        title = tx.status == TransactionStatus.failed
            ? 'Withdrawal Failed'
            : tx.status == TransactionStatus.processing
                ? 'Withdrawal Processing'
                : tx.status == TransactionStatus.pending
                    ? 'Withdrawal Initiated'
                    : 'Withdrawal Successful';
        body = tx.status == TransactionStatus.failed
            ? 'Your withdrawal of \u20A6${_fmtAmount(amount)} could not be completed.'
            : 'Your withdrawal of \u20A6${_fmtAmount(amount)} is ${tx.status == TransactionStatus.processing || tx.status == TransactionStatus.pending ? "being processed" : "completed"}.';
        break;
      case TransactionType.airtime:
      case TransactionType.data:
        notifType = NotificationType.general;
        title = tx.status == TransactionStatus.failed
            ? '${tx.type == TransactionType.airtime ? "Airtime" : "Data"} Purchase Failed'
            : '${tx.type == TransactionType.airtime ? "Airtime" : "Data"} Purchase Successful';
        body = '${tx.type == TransactionType.airtime ? "Airtime" : "Data"} purchase of \u20A6${_fmtAmount(amount)} ${tx.status == TransactionStatus.failed ? "failed" : "was successful"}.';
        break;
      case TransactionType.giftcard:
        notifType = NotificationType.general;
        title = tx.status == TransactionStatus.failed
            ? 'Gift Card Trade Failed'
            : 'Gift Card Trade Successful';
        body = 'Gift card trade of \u20A6${_fmtAmount(amount)} ${tx.status == TransactionStatus.failed ? "failed" : "was successful"}.';
        break;
      case TransactionType.referralBonus:
        notifType = NotificationType.bonus;
        title = 'Referral Bonus';
        body = 'You earned \u20A6${_fmtAmount(amount)} referral bonus.';
        break;
      default:
        notifType = NotificationType.trade;
        title = tx.status == TransactionStatus.failed
            ? 'Transaction Failed'
            : tx.status == TransactionStatus.processing
                ? 'Transaction Processing'
                : 'Transaction ${tx.status.name[0].toUpperCase()}${tx.status.name.substring(1)}';
        body = tx.status == TransactionStatus.processing
            ? '${typeStr[0].toUpperCase()}${typeStr.substring(1)} of ${tx.amountCoin != null ? tx.amountCoin! + " " + (tx.coinSymbol ?? "") : "\u20A6" + _fmtAmount(amount)} is processing.'
            : '${typeStr[0].toUpperCase()}${typeStr.substring(1)} of \u20A6${_fmtAmount(amount)} ${tx.status == TransactionStatus.failed ? "failed" : "completed"}.';
    }

    await createNotification(
      uid: tx.uid,
      type: notifType,
      title: title,
      body: body,
      preview: body,
    );
  }

  String _fmtAmount(double amount) {
    return amount.toStringAsFixed(2);
  }

  /// Stream the user's recent transactions (real-time).
  Stream<List<TransactionModel>> watchTransactions(
    String uid, {
    int limit = 200,
  }) {
    return _db
        .collection(FirestoreCollections.transactions)
        .where('uid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => TransactionModel.fromMap(doc.data()))
            .toList());
  }

  /// Get a single transaction by reference.
  Future<TransactionModel?> getTransaction(String reference) async {
    final snapshot = await _db
        .collection(FirestoreCollections.transactions)
        .where('reference', isEqualTo: reference)
        .limit(1)
        .get();
    if (snapshot.docs.isEmpty) return null;
    return TransactionModel.fromMap(snapshot.docs.first.data());
  }

  /// Update a transaction's status.
  Future<void> updateTransactionStatus(
    String txId,
    TransactionStatus status,
  ) async {
    final data = <String, dynamic>{
      'status': status.value,
    };
    if (status == TransactionStatus.completed ||
        status == TransactionStatus.failed) {
      data['completedAt'] = Timestamp.fromDate(DateTime.now());
    }
    await _db
        .collection(FirestoreCollections.transactions)
        .doc(txId)
        .update(data);

    if (status == TransactionStatus.completed || status == TransactionStatus.failed) {
      final snap = await _db
          .collection(FirestoreCollections.transactions)
          .doc(txId)
          .get();
      if (snap.exists) {
        final tx = TransactionModel.fromMap(snap.data()!);
        await _createTransactionNotification(tx);
      }
    }
  }

  // ─── Notifications ───────────────────────────────────────

  /// Create a notification for a user.
  Future<void> createNotification({
    required String uid,
    required NotificationType type,
    required String title,
    required String body,
    String? preview,
    String? ctaLabel,
    String? ctaRoute,
  }) async {
    final docRef = _db.collection(FirestoreCollections.notifications).doc();
    await docRef.set({
      'id': docRef.id,
      'uid': uid,
      'type': type.value,
      'title': title,
      'body': body,
      'preview': preview,
      'isRead': false,
      'createdAt': Timestamp.fromDate(DateTime.now()),
      'ctaLabel': ctaLabel,
      'ctaRoute': ctaRoute,
    });
  }

  /// Stream the user's notifications (real-time).
  Stream<List<NotificationModel>> watchNotifications(
    String uid, {
    int limit = 50,
  }) {
    return _db
        .collection(FirestoreCollections.notifications)
        .where('uid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .limit(limit)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => NotificationModel.fromMap(doc.data()))
            .toList());
  }

  /// Mark a notification as read.
  Future<void> markNotificationRead(String notificationId) async {
    await _db
        .collection(FirestoreCollections.notifications)
        .doc(notificationId)
        .update({'isRead': true});
  }

  /// Mark all notifications as read for a user.
  Future<void> markAllNotificationsRead(String uid) async {
    final batch = _db.batch();
    final snapshot = await _db
        .collection(FirestoreCollections.notifications)
        .where('uid', isEqualTo: uid)
        .where('isRead', isEqualTo: false)
        .get();
    for (final doc in snapshot.docs) {
      batch.update(doc.reference, {'isRead': true});
    }
    await batch.commit();
  }

  /// Delete all notifications for a user (clear all).
  Future<void> clearAllNotifications(String uid) async {
    final snapshot = await _db
        .collection(FirestoreCollections.notifications)
        .where('uid', isEqualTo: uid)
        .get();
    final batch = _db.batch();
    for (final doc in snapshot.docs) {
      batch.delete(doc.reference);
    }
    await batch.commit();
  }

  // ─── Support Tickets ─────────────────────────────────────

  /// Create a support ticket.
  Future<String> createSupportTicket(Map<String, dynamic> data) async {
    data['createdAt'] = Timestamp.fromDate(DateTime.now());
    data['status'] = 'open';
    final docRef = await _db
        .collection(FirestoreCollections.supportTickets)
        .add(data);
    return docRef.id;
  }

  /// Stream the user's support tickets.
  Stream<QuerySnapshot> watchSupportTickets(String uid) {
    return _db
        .collection(FirestoreCollections.supportTickets)
        .where('uid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .snapshots();
  }

  // ─── Gift Card Trades ────────────────────────────────────

  /// Create a gift card trade record.
  Future<String> createGiftcardTrade(Map<String, dynamic> data) async {
    data['createdAt'] = Timestamp.fromDate(DateTime.now());
    data['status'] = 'pending';
    final docRef = await _db
        .collection(FirestoreCollections.giftcardTrades)
        .add(data);
    return docRef.id;
  }

  /// Stream the user's gift card trades.
  Stream<QuerySnapshot> watchGiftcardTrades(String uid) {
    return _db
        .collection(FirestoreCollections.giftcardTrades)
        .where('uid', isEqualTo: uid)
        .orderBy('createdAt', descending: true)
        .snapshots();
  }

  // ─── Referrals ───────────────────────────────────────────

  /// Get a list of users who were referred by this user.
  Future<List<Map<String, dynamic>>> getReferrals(String referrerUid) async {
    final snapshot = await _db
        .collection(FirestoreCollections.users)
        .where('referredBy', isEqualTo: referrerUid)
        .get();
    return snapshot.docs.map((doc) => doc.data()).toList();
  }

  // ─── Virtual Bank Accounts ───────────────────────────────

  /// Save a virtual bank account for a user.
  Future<void> saveVirtualAccount(String uid, Map<String, dynamic> data) async {
    await _db
        .collection(FirestoreCollections.virtualAccounts)
        .doc(uid)
        .set(data, SetOptions(merge: true));
  }

  /// Get a user's virtual bank account. Returns null if none exists.
  Future<Map<String, dynamic>?> getVirtualAccount(String uid) async {
    final doc = await _db
        .collection(FirestoreCollections.virtualAccounts)
        .doc(uid)
        .get();
    if (!doc.exists || doc.data() == null) return null;
    return doc.data();
  }

  /// Save a crypto deposit address for a user.
  Future<void> saveCryptoDeposit(String uid, Map<String, dynamic> data) async {
    await _db
        .collection(FirestoreCollections.cryptoDeposits)
        .doc(uid)
        .set(data, SetOptions(merge: true));
  }

  /// Get a user's saved crypto deposit info. Returns null if none exists.
  Future<Map<String, dynamic>?> getCryptoDeposit(String uid) async {
    final doc = await _db
        .collection(FirestoreCollections.cryptoDeposits)
        .doc(uid)
        .get();
    if (!doc.exists || doc.data() == null) return null;
    return doc.data();
  }

  // ─── Trade Operations (Internal Ledger) ──────────────────

  /// Buy crypto with NGN wallet balance. Internal ledger only.
  /// Fee is deducted from the coin amount the user receives.
  Future<bool> executeBuy({
    required String uid,
    required String coinSymbol,
    required double nairaAmount,
    required double coinAmount,
  }) async {
    final feeNaira = TradeFeeService.calculateBuyFee(nairaAmount);
    final feeCoin = coinAmount * (TradeFeeService.buyFeePercent / 100);
    final netCoinAmount = coinAmount - feeCoin;

    final walletRef = _db.collection(FirestoreCollections.wallets).doc(uid);
    final txRef = _db.collection(FirestoreCollections.transactions).doc();

    return _db.runTransaction((txn) async {
      final snap = await txn.get(walletRef);
      if (!snap.exists) throw Exception('Wallet not found');
      final wallet = WalletModel.fromMap(snap.data()!);
      if (wallet.nairaBalance < nairaAmount) {
        throw Exception('Insufficient NGN balance');
      }

      final newCrypto = Map<String, double>.from(wallet.cryptoBalances);
      newCrypto[coinSymbol] = (newCrypto[coinSymbol] ?? 0) + netCoinAmount;

      txn.set(
        walletRef,
        wallet.copyWith(
          nairaBalance: wallet.nairaBalance - nairaAmount,
          cryptoBalances: newCrypto,
          updatedAt: DateTime.now(),
        ).toMap(),
        SetOptions(merge: true),
      );

      txn.set(
        txRef,
        TransactionModel(
          id: txRef.id,
          uid: uid,
          type: TransactionType.buy,
          status: TransactionStatus.completed,
          amountNaira: nairaAmount,
          amountCoin: netCoinAmount.toStringAsFixed(8),
          coinSymbol: coinSymbol,
          description: 'Buy $coinSymbol (fee: $feeCoin $coinSymbol)',
          reference: 'BUY_${DateTime.now().millisecondsSinceEpoch}',
          createdAt: DateTime.now(),
          completedAt: DateTime.now(),
          paymentMethod: 'internal',
        ).toMap(),
      );
      return true;
    });
  }

  /// Sell crypto to NGN wallet balance. Internal ledger only.
  /// Fee is deducted from the NGN amount the user receives.
  Future<bool> executeSell({
    required String uid,
    required String coinSymbol,
    required double coinAmount,
    required double nairaAmount,
  }) async {
    final feeNaira = TradeFeeService.calculateSellFee(nairaAmount);
    final netNairaAmount = nairaAmount - feeNaira;

    final walletRef = _db.collection(FirestoreCollections.wallets).doc(uid);
    final txRef = _db.collection(FirestoreCollections.transactions).doc();

    return _db.runTransaction((txn) async {
      final snap = await txn.get(walletRef);
      if (!snap.exists) throw Exception('Wallet not found');
      final wallet = WalletModel.fromMap(snap.data()!);
      final bal = wallet.cryptoBalances[coinSymbol] ?? 0;
      if (bal < coinAmount) {
        throw Exception('Insufficient $coinSymbol balance');
      }

      final newCrypto = Map<String, double>.from(wallet.cryptoBalances);
      newCrypto[coinSymbol] = bal - coinAmount;

      txn.set(
        walletRef,
        wallet.copyWith(
          nairaBalance: wallet.nairaBalance + netNairaAmount,
          cryptoBalances: newCrypto,
          updatedAt: DateTime.now(),
        ).toMap(),
        SetOptions(merge: true),
      );

      txn.set(
        txRef,
        TransactionModel(
          id: txRef.id,
          uid: uid,
          type: TransactionType.sell,
          status: TransactionStatus.completed,
          amountNaira: netNairaAmount,
          amountCoin: coinAmount.toStringAsFixed(8),
          coinSymbol: coinSymbol,
          description: 'Sell $coinSymbol (fee: \u20A6$feeNaira)',
          reference: 'SELL_${DateTime.now().millisecondsSinceEpoch}',
          createdAt: DateTime.now(),
          completedAt: DateTime.now(),
          paymentMethod: 'internal',
        ).toMap(),
      );
      return true;
    });
  }

  /// Swap one crypto for another. Internal ledger only.
  /// Fee is deducted from the destination coin amount the user receives.
  Future<bool> executeSwap({
    required String uid,
    required String fromCoin,
    required String toCoin,
    required double fromAmount,
    required double toAmount,
  }) async {
    final feeToAmount = TradeFeeService.calculateSwapFee(toAmount);
    final netToAmount = toAmount - feeToAmount;

    final walletRef = _db.collection(FirestoreCollections.wallets).doc(uid);
    final txRef = _db.collection(FirestoreCollections.transactions).doc();

    return _db.runTransaction((txn) async {
      final snap = await txn.get(walletRef);
      if (!snap.exists) throw Exception('Wallet not found');
      final wallet = WalletModel.fromMap(snap.data()!);
      final bal = wallet.cryptoBalances[fromCoin] ?? 0;
      if (bal < fromAmount) {
        throw Exception('Insufficient $fromCoin balance');
      }

      final newCrypto = Map<String, double>.from(wallet.cryptoBalances);
      newCrypto[fromCoin] = bal - fromAmount;
      newCrypto[toCoin] = (newCrypto[toCoin] ?? 0) + netToAmount;

      txn.set(
        walletRef,
        wallet.copyWith(
          cryptoBalances: newCrypto,
          updatedAt: DateTime.now(),
        ).toMap(),
        SetOptions(merge: true),
      );

      txn.set(
        txRef,
        TransactionModel(
          id: txRef.id,
          uid: uid,
          type: TransactionType.swap,
          status: TransactionStatus.completed,
          amountNaira: 0,
          amountCoin: fromAmount.toStringAsFixed(8),
          coinSymbol: fromCoin,
          description: 'Swap $fromCoin to $toCoin (fee: $feeToAmount $toCoin)',
          reference: 'SWAP_${DateTime.now().millisecondsSinceEpoch}',
          createdAt: DateTime.now(),
          completedAt: DateTime.now(),
          paymentMethod: 'internal',
          recipient: toCoin,
        ).toMap(),
      );
      return true;
    });
  }

  /// Request to send crypto to external wallet. Saved as processing for admin.
  /// Fee is deducted from the user's coin balance alongside the send amount.
  Future<String> requestSend({
    required String uid,
    required String coinSymbol,
    required double coinAmount,
    required String recipientAddress,
    String? networkFee,
  }) async {
    final feeCoin = TradeFeeService.calculateSendFee(coinAmount);
    final totalDeduct = coinAmount + feeCoin;

    final walletRef = _db.collection(FirestoreCollections.wallets).doc(uid);
    final txRef = _db.collection(FirestoreCollections.transactions).doc();

    await _db.runTransaction((txn) async {
      final snap = await txn.get(walletRef);
      if (!snap.exists) throw Exception('Wallet not found');
      final wallet = WalletModel.fromMap(snap.data()!);
      final bal = wallet.cryptoBalances[coinSymbol] ?? 0;
      if (bal < totalDeduct) {
        throw Exception('Insufficient $coinSymbol balance (need $totalDeduct including fee)');
      }

      final newCrypto = Map<String, double>.from(wallet.cryptoBalances);
      newCrypto[coinSymbol] = bal - totalDeduct;

      txn.set(
        walletRef,
        wallet.copyWith(
          cryptoBalances: newCrypto,
          updatedAt: DateTime.now(),
        ).toMap(),
        SetOptions(merge: true),
      );

      txn.set(
        txRef,
        TransactionModel(
          id: txRef.id,
          uid: uid,
          type: TransactionType.send,
          status: TransactionStatus.processing,
          amountNaira: 0,
          amountCoin: coinAmount.toStringAsFixed(8),
          coinSymbol: coinSymbol,
          description: 'Send $coinSymbol to external wallet (fee: $feeCoin $coinSymbol)',
          reference: 'SEND_${DateTime.now().millisecondsSinceEpoch}',
          createdAt: DateTime.now(),
          recipient: recipientAddress,
          paymentMethod: networkFee,
        ).toMap(),
      );
    });
    return txRef.id;
  }

  /// Request an NGN withdrawal to a saved bank account.
  /// Deducts NGN balance atomically and creates a processing transaction.
  /// Admin must manually execute the bank transfer.
  Future<String> requestWithdrawal({
    required String uid,
    required double amount,
    required String bankName,
    required String accountNumber,
    required String accountName,
    String? bankCode,
  }) async {
    const fee = 50.0; // flat withdrawal fee
    final totalDeduct = amount + fee;

    final walletRef = _db.collection(FirestoreCollections.wallets).doc(uid);
    final txRef = _db.collection(FirestoreCollections.transactions).doc();

    await _db.runTransaction((txn) async {
      final snap = await txn.get(walletRef);
      if (!snap.exists) throw Exception('Wallet not found');
      final wallet = WalletModel.fromMap(snap.data()!);
      if (wallet.nairaBalance < totalDeduct) {
        throw Exception('Insufficient balance (need ₦${totalDeduct.toStringAsFixed(2)} including ₦$fee fee)');
      }

      txn.set(
        walletRef,
        wallet.copyWith(
          nairaBalance: wallet.nairaBalance - totalDeduct,
          updatedAt: DateTime.now(),
        ).toMap(),
        SetOptions(merge: true),
      );

      txn.set(
        txRef,
        TransactionModel(
          id: txRef.id,
          uid: uid,
          type: TransactionType.withdrawal,
          status: TransactionStatus.processing,
          amountNaira: amount,
          description: 'Withdrawal to $bankName ($accountNumber) — $accountName',
          reference: 'WD-${DateTime.now().millisecondsSinceEpoch}',
          createdAt: DateTime.now(),
          recipient: accountNumber,
          paymentMethod: bankName,
          feeAmount: fee,
          feeSymbol: 'NGN',
        ).toMap(),
      );
    });

    // Notify
    await createNotification(
      uid: uid,
      type: NotificationType.withdrawal,
      title: 'Withdrawal Processing',
      body: 'Your withdrawal of ₦${amount.toStringAsFixed(2)} to $bankName is being processed.',
      preview: 'Withdrawal of ₦${amount.toStringAsFixed(2)} queued',
    );

    return txRef.id;
  }

  /// Stream all transactions with status=processing across all users.
  /// Only accessible by admin. The admin Firestore rules will enforce this.
  Stream<List<TransactionModel>> watchAdminProcessingQueue() {
    return _db
        .collection(FirestoreCollections.transactions)
        .where('status', isEqualTo: 'processing')
        .orderBy('createdAt', descending: true)
        .limit(200)
        .snapshots()
        .map((snap) => snap.docs
            .map((doc) => TransactionModel.fromMap(doc.data()))
            .toList());
  }

  /// Admin: mark a processing transaction as completed.
  Future<void> adminCompleteTransaction(String txId, {String? adminNote}) async {
    final data = <String, dynamic>{
      'status': TransactionStatus.completed.value,
      'completedAt': Timestamp.fromDate(DateTime.now()),
      if (adminNote != null) 'adminNote': adminNote,
    };
    await _db.collection(FirestoreCollections.transactions).doc(txId).update(data);
  }

  /// Admin: mark a processing transaction as failed and refund the user.
  Future<void> adminFailTransaction(String txId, String reason) async {
    final txSnap = await _db.collection(FirestoreCollections.transactions).doc(txId).get();
    if (!txSnap.exists) return;
    final tx = TransactionModel.fromMap(txSnap.data()!);

    final walletRef = _db.collection(FirestoreCollections.wallets).doc(tx.uid);

    await _db.runTransaction((txn) async {
      final walletSnap = await txn.get(walletRef);
      if (!walletSnap.exists) return;
      final wallet = WalletModel.fromMap(walletSnap.data()!);

      // Refund: for withdrawal, add NGN back. For send, add crypto back.
      if (tx.type == TransactionType.withdrawal) {
        final refundAmount = tx.amountNaira + (tx.feeAmount ?? 0);
        txn.set(
          walletRef,
          wallet.copyWith(
            nairaBalance: wallet.nairaBalance + refundAmount,
            updatedAt: DateTime.now(),
          ).toMap(),
          SetOptions(merge: true),
        );
      } else if (tx.type == TransactionType.send && tx.coinSymbol != null && tx.amountCoin != null) {
        final coinAmount = double.tryParse(tx.amountCoin!) ?? 0;
        final feeCoin = TradeFeeService.calculateSendFee(coinAmount);
        final refundCoin = coinAmount + feeCoin;
        final newCrypto = Map<String, double>.from(wallet.cryptoBalances);
        newCrypto[tx.coinSymbol!] = (newCrypto[tx.coinSymbol!] ?? 0) + refundCoin;
        txn.set(
          walletRef,
          wallet.copyWith(
            cryptoBalances: newCrypto,
            updatedAt: DateTime.now(),
          ).toMap(),
          SetOptions(merge: true),
        );
      }

      txn.update(
        _db.collection(FirestoreCollections.transactions).doc(txId),
        {
          'status': TransactionStatus.failed.value,
          'completedAt': Timestamp.fromDate(DateTime.now()),
          'adminNote': reason,
        },
      );
    });

    // Notify user of failure
    await createNotification(
      uid: tx.uid,
      type: tx.type == TransactionType.withdrawal ? NotificationType.withdrawal : NotificationType.general,
      title: tx.type == TransactionType.withdrawal ? 'Withdrawal Failed' : 'Send Failed',
      body: 'Your ${tx.type == TransactionType.withdrawal ? 'withdrawal' : 'send'} request was declined. Reason: $reason. Your funds have been refunded.',
      preview: 'Transaction failed: $reason',
    );
  }
}

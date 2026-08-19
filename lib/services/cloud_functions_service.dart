import 'dart:math';

import 'package:cloud_functions/cloud_functions.dart';

class GiftcardTradeSubmission {
  const GiftcardTradeSubmission({
    required this.tradeId,
    required this.payoutAmount,
    required this.rateApplied,
  });

  final String tradeId;
  final double payoutAmount;
  final double rateApplied;
}

class GiftcardUploadSlot {
  const GiftcardUploadSlot({
    required this.objectKey,
    required this.uploadUrl,
    required this.publicUrl,
    required this.contentType,
  });

  final String objectKey;
  final String uploadUrl;
  final String publicUrl;
  final String contentType;
}

/// Service that calls secure Cloud Functions for all sensitive operations.
///
/// All financial operations, wallet updates, and API calls go through the
/// single `secureApi` Cloud Function router which:
///   - Verifies the user's auth token
///   - Checks balances and prices server-side
///   - Uses atomic Firestore transactions
///   - Keeps all API keys and mnemonics server-side
///
/// Routing every action through one callable also keeps the backend to a
/// single Cloud Run service (well within the project's regional CPU quota).
class CloudFunctionsService {
  CloudFunctionsService._();

  static final _functions = FirebaseFunctions.instanceFor(region: 'us-central1');

  /// Fresh idempotency key for a one-shot order submission. Generate per
  /// logical order attempt (per button tap); the server rejects a key it has
  /// already seen, so a double-tap or replayed request cannot double-order.
  /// Alphanumeric only — must match ^[A-Za-z0-9_-]{8,64}$ on the server.
  static String newIdempotencyKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    final rnd = Random.secure();
    return List.generate(24, (_) => chars[rnd.nextInt(chars.length)]).join();
  }

  /// Call an action on the secureApi router.
  static Future<Map<String, dynamic>> _call(
    String action,
    Map<String, dynamic> data,
  ) async {
    final result = await _functions.httpsCallable('secureApi').call({
      'action': action,
      'data': data,
    });
    if (result.data is Map) return Map<String, dynamic>.from(result.data as Map);
    return <String, dynamic>{};
  }

  // ─── HD Wallet ───────────────────────────────────────────────────

  /// Derive a deposit address for a currency. Calls the Cloud Function
  /// which holds the mnemonic server-side.
  static Future<String> deriveDepositAddress(String currencyCode) async {
    final result = await _call('deriveDepositAddress', {
      'currencyCode': currencyCode,
    });
    return result['address'] as String;
  }

  /// Submit KYC details for manual admin review.
  /// Returns {success, status: 'pending'}.
  static Future<Map<String, dynamic>> submitKyc({
    required String bvn,
    required String phone,
    required String dob,
    required String gender,
    required String address,
  }) async {
    return _call('submitKyc', {
      'bvn': bvn,
      'phone': phone,
      'dob': dob,
      'gender': gender,
      'address': address,
    });
  }

  /// Verify the 6-digit email OTP sent after signup.
  ///
  /// Verification MUST go through a Cloud Function — Firestore rules
  /// deny client reads of email_codes/{uid} and deny client writes to
  /// users/{uid}.isEmailVerified, so a client-side check is impossible.
  /// Returns `{success: true}` on success. Throws on failure.
  static Future<Map<String, dynamic>> verifyEmailCode(String code) async {
    return _call('verifyEmailCode', {
      'code': code,
    });
  }

  /// Regenerate the email verification code and re-trigger the
  /// sendVerificationEmail trigger.
  ///
  /// The client cannot reliably do this on its own — overwriting
  /// email_codes/{uid} via set() does NOT re-fire the onDocumentCreated
  /// trigger that sends the email. The Cloud Function deletes the
  /// existing doc and creates a fresh one, which re-fires the trigger.
  /// Returns `{success: true}` on success. Throws on failure.
  static Future<Map<String, dynamic>> resendVerificationEmail() async {
    return _call('resendVerificationEmail', {});
  }

  // ─── Trade Operations ────────────────────────────────────────────

  /// Buy crypto with NGN balance.
  static Future<void> executeBuy({
    required String coinSymbol,
    required double nairaAmount,
    required double coinAmount,
    String? idempotencyKey,
  }) async {
    await _call('executeBuy', {
      'coinSymbol': coinSymbol,
      'nairaAmount': nairaAmount,
      'coinAmount': coinAmount,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  /// Sell crypto to NGN balance.
  static Future<void> executeSell({
    required String coinSymbol,
    required double coinAmount,
    required double nairaAmount,
    String? idempotencyKey,
  }) async {
    await _call('executeSell', {
      'coinSymbol': coinSymbol,
      'coinAmount': coinAmount,
      'nairaAmount': nairaAmount,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  /// Swap one crypto for another.
  static Future<void> executeSwap({
    required String fromCoin,
    required String toCoin,
    required double fromAmount,
    required double toAmount,
    String? idempotencyKey,
  }) async {
    await _call('executeSwap', {
      'fromCoin': fromCoin,
      'toCoin': toCoin,
      'fromAmount': fromAmount,
      'toAmount': toAmount,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  /// Request to send crypto to external wallet.
  static Future<String> requestSend({
    required String coinSymbol,
    required double coinAmount,
    required String recipientAddress,
    String? idempotencyKey,
  }) async {
    final result = await _call('requestSend', {
      'coinSymbol': coinSymbol,
      'coinAmount': coinAmount,
      'recipientAddress': recipientAddress,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
    return result['txId'] as String;
  }

  // ─── Gift Cards ──────────────────────────────────────────────────

  /// Get presigned PUT URLs for uploading gift-card images directly to R2.
  /// Returns one upload slot per file extension requested.
  static Future<List<GiftcardUploadSlot>> getGiftcardUploadUrls({
    required String tradeId,
    required List<String> extensions,
  }) async {
    final data = await _call('getGiftcardUploadUrls', {
      'tradeId': tradeId,
      'extensions': extensions,
    });
    final items = (data['items'] as List).cast<Map>();
    return items.map((item) => GiftcardUploadSlot(
      objectKey: item['objectKey'] as String,
      uploadUrl: item['uploadUrl'] as String,
      publicUrl: item['publicUrl'] as String,
      contentType: item['contentType'] as String,
    )).toList();
  }

  /// Get presigned PUT URLs for uploading dispute evidence images to R2.
  /// Returns one upload slot per file extension requested.
  static Future<List<GiftcardUploadSlot>> getDisputeUploadUrls({
    required String tradeId,
    required List<String> extensions,
  }) async {
    final data = await _call('getDisputeUploadUrls', {
      'tradeId': tradeId,
      'extensions': extensions,
    });
    final items = (data['items'] as List).cast<Map>();
    return items.map((item) => GiftcardUploadSlot(
      objectKey: item['objectKey'] as String,
      uploadUrl: item['uploadUrl'] as String,
      publicUrl: item['publicUrl'] as String,
      contentType: item['contentType'] as String,
    )).toList();
  }

  /// Get presigned PUT URLs for uploading support attachments to R2.
  /// Supports images and videos. Returns one upload slot per file extension.
  static Future<List<GiftcardUploadSlot>> getSupportUploadUrls({
    required List<String> extensions,
  }) async {
    final data = await _call('getSupportUploadUrls', {
      'extensions': extensions,
    });
    final items = (data['items'] as List).cast<Map>();
    return items.map((item) => GiftcardUploadSlot(
      objectKey: item['objectKey'] as String,
      uploadUrl: item['uploadUrl'] as String,
      publicUrl: item['publicUrl'] as String,
      contentType: item['contentType'] as String,
    )).toList();
  }

  /// Get a presigned PUT URL for uploading a user avatar to R2.
  /// Uses getSupportUploadUrls internally. Returns a single upload slot.
  static Future<GiftcardUploadSlot> getAvatarUploadUrl({
    required String extension,
  }) async {
    final data = await _call('getSupportUploadUrls', {
      'extensions': [extension],
    });
    final items = (data['items'] as List).cast<Map>();
    return GiftcardUploadSlot(
      objectKey: items[0]['objectKey'] as String,
      uploadUrl: items[0]['uploadUrl'] as String,
      publicUrl: items[0]['publicUrl'] as String,
      contentType: items[0]['contentType'] as String,
    );
  }

  static Future<GiftcardTradeSubmission> submitGiftcardTrade({
    required String tradeId,
    required String brandId,
    required String rateId,
    required String cardType,
    required String currency,
    required double cardValue,
    required List<String> storagePaths,
    required List<String> cardImageUrls,
    String? ecode,
    String? comment,
  }) async {
    final data = await _call('submitGiftcardTrade', {
      'tradeId': tradeId,
      'brandId': brandId,
      'rateId': rateId,
      'cardType': cardType,
      'currency': currency,
      'cardValue': cardValue,
      'storagePaths': storagePaths,
      'cardImageUrls': cardImageUrls,
      'ecode': ecode,
      'comment': comment,
    });
    return GiftcardTradeSubmission(
      tradeId: data['tradeId'] as String,
      payoutAmount: (data['payoutAmount'] as num).toDouble(),
      rateApplied: (data['rateApplied'] as num).toDouble(),
    );
  }

  // ─── Withdrawal ──────────────────────────────────────────────────

  /// Request a NGN withdrawal to bank account.
  static Future<String> requestWithdrawal({
    required double amount,
    required String bankName,
    required String accountNumber,
    required String accountName,
    String? idempotencyKey,
  }) async {
    final result = await _call('requestWithdrawal', {
      'amount': amount,
      'bankName': bankName,
      'accountNumber': accountNumber,
      'accountName': accountName,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
    return result['txId'] as String;
  }

  /// Save a bank account to the user's profile.
  static Future<void> saveBankAccount({
    required String bankName,
    required String accountNumber,
    required String accountName,
    String? bankCode,
  }) async {
    await _call('saveBankAccount', {
      'bankName': bankName,
      'accountNumber': accountNumber,
      'accountName': accountName,
      'bankCode': bankCode,
    });
  }

  /// Remove a saved bank account from the user's profile.
  static Future<void> removeBankAccount({
    required String accountNumber,
  }) async {
    await _call('removeBankAccount', {
      'accountNumber': accountNumber,
    });
  }

  // ─── Airtime / Data ──────────────────────────────────────────────

  /// Fetch data plans from the active VTU provider (server-side).
  /// Returns a list of plan maps: { id, name, price, type, days, network }.
  static Future<List<Map<String, dynamic>>> getDataPlans({
    required String network,
  }) async {
    final data = await _call('getDataPlans', {
      'network': network,
    });
    final rawPlans = data['plans'] as List? ?? [];
    return rawPlans
        .whereType<Map>()
        .map((e) => Map<String, dynamic>.from(e))
        .toList();
  }

  /// Purchase airtime. Returns {success, refunded, message}.
  static Future<Map<String, dynamic>> purchaseAirtime({
    required String phone,
    required double amount,
    required String network,
    String? idempotencyKey,
  }) async {
    return _call('purchaseAirtime', {
      'phone': phone,
      'amount': amount,
      'network': network,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  /// Purchase data. Returns {success, refunded, message}.
  static Future<Map<String, dynamic>> purchaseData({
    required String phone,
    required String planId,
    required double amount,
    required String network,
    String? idempotencyKey,
  }) async {
    return _call('purchaseData', {
      'phone': phone,
      'planId': planId,
      'amount': amount,
      'network': network,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  // ─── Virtual Account ─────────────────────────────────────────────

  /// Create or get a virtual bank account.
  static Future<Map<String, dynamic>> createVirtualAccount() async {
    final data = await _call('createVirtualAccount', {});
    return Map<String, dynamic>.from(data['account'] as Map);
  }

  // ─── Card Payment ────────────────────────────────────────────────

  /// Initialize a card payment via Squad.
  static Future<Map<String, dynamic>> initializeCardPayment({
    required double amount,
    required String email,
    String? idempotencyKey,
  }) async {
    return _call('initializeCardPayment', {
      'amount': amount,
      'email': email,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  /// Verify a Squad transaction by reference.
  static Future<Map<String, dynamic>> verifyTransaction({
    required String transactionRef,
  }) async {
    return _call('verifyTransaction', {
      'transactionRef': transactionRef,
    });
  }

  /// Complete a card/checkout NGN deposit: server verifies the Squad payment,
  /// consumes it exactly once, and credits the wallet atomically.
  /// Returns {success, amountNaira}.
  static Future<Map<String, dynamic>> completeCardDeposit({
    required String squadRef,
    required double amount,
    required String transactionId,
    String? idempotencyKey,
  }) async {
    return _call('completeCardDeposit', {
      'squadRef': squadRef,
      'amount': amount,
      'transactionId': transactionId,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  /// Complete a card-based airtime purchase.
  /// Verifies the Squad payment, delivers airtime, and updates the transaction.
  static Future<Map<String, dynamic>> completeCardAirtime({
    required String squadRef,
    required String phone,
    required double amount,
    required String network,
    required String transactionId,
    String? idempotencyKey,
  }) async {
    return _call('completeCardAirtime', {
      'squadRef': squadRef,
      'phone': phone,
      'amount': amount,
      'network': network,
      'transactionId': transactionId,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  /// Complete a card-based data purchase.
  /// Verifies the Squad payment, delivers data, and updates the transaction.
  static Future<Map<String, dynamic>> completeCardData({
    required String squadRef,
    required String phone,
    required String planId,
    required double amount,
    required String network,
    required String planName,
    required String transactionId,
    String? idempotencyKey,
  }) async {
    return _call('completeCardData', {
      'squadRef': squadRef,
      'phone': phone,
      'planId': planId,
      'amount': amount,
      'network': network,
      'planName': planName,
      'transactionId': transactionId,
      if (idempotencyKey != null) 'idempotencyKey': idempotencyKey,
    });
  }

  // ─── Referrals ───────────────────────────────────────────────
  // (Still on their own callables — could be merged later.)

  /// Claim all qualified referral rewards.
  /// Returns {success, amountClaimed, count}.
  static Future<Map<String, dynamic>> claimReferralRewards() async {
    final result = await _functions.httpsCallable('claimReferralRewards').call({});
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Update referral program config (admin only).
  static Future<Map<String, dynamic>> updateReferralConfig({
    double? bonusAmount,
    bool? active,
  }) async {
    final data = <String, dynamic>{};
    if (bonusAmount != null) data['bonusAmount'] = bonusAmount;
    if (active != null) data['active'] = active;
    final result = await _functions.httpsCallable('updateReferralConfig').call(data);
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Process a referral payout (admin only).
  static Future<Map<String, dynamic>> processReferralPayout({
    required String referralId,
    required String action, // 'approve' or 'reject'
  }) async {
    final result = await _functions.httpsCallable('processReferralPayout').call({
      'referralId': referralId,
      'action': action,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }

  /// Flag/unflag a referral (admin only).
  static Future<Map<String, dynamic>> flagReferral({
    required String referralId,
    bool flagged = true,
  }) async {
    final result = await _functions.httpsCallable('flagReferral').call({
      'referralId': referralId,
      'flagged': flagged,
    });
    return Map<String, dynamic>.from(result.data as Map);
  }
}

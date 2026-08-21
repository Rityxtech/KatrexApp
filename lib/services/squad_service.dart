import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../utils/api_config.dart';
import 'cloud_functions_service.dart';

/// Result of a Squad checkout initialization.
class SquadResult {
  final bool success;
  final String? checkoutUrl;
  final String? reference;
  final String? errorMessage;

  SquadResult({
    required this.success,
    this.checkoutUrl,
    this.reference,
    this.errorMessage,
  });
}

/// Result of verifying a Squad transaction.
class SquadVerificationResult {
  final bool success;
  final String status;
  final double amount;
  final String? reference;
  final String? errorMessage;

  SquadVerificationResult({
    required this.success,
    required this.status,
    this.amount = 0,
    this.reference,
    this.errorMessage,
  });
}

/// Result of creating or retrieving a Squad virtual bank account.
class SquadVirtualAccount {
  final bool success;
  final String? accountName;
  final String? accountNumber;
  final String? bankName;
  final String? accountReference;
  final String? errorMessage;

  SquadVirtualAccount({
    required this.success,
    this.accountName,
    this.accountNumber,
    this.bankName,
    this.accountReference,
    this.errorMessage,
  });
}

/// Service that integrates with Squad's Payment API.
///
/// Uses Cloud Functions for server-side secret key protection.
class SquadService {
  static const _base = ApiConfig.squadBaseUrl;
  static const _secretKey = ApiConfig.squadSecretKey;

  /// Initialize a Squad checkout session.
  ///
  /// Returns a [SquadResult] with the checkout URL to redirect the user to.
  /// Amount is in naira.
  static Future<SquadResult> initializeCheckout({
    required double amount,
    required String customerName,
    required String customerEmail,
    String? reference,
    String currency = 'NGN',
    List<String> paymentChannels = const ['card', 'transfer', 'ussd'],
    bool isRecurring = false,
  }) async {
    final ref = reference ?? 'smclientkx-${DateTime.now().millisecondsSinceEpoch}';

    try {
      final res = await CloudFunctionsService.initializeCardPayment(
        amount: amount,
        email: customerEmail,
      );

      final checkoutUrl = res['checkoutUrl'] as String?;
      final txRef = res['transactionRef'] as String? ?? ref;

      if (checkoutUrl != null) {
        return SquadResult(
          success: true,
          checkoutUrl: checkoutUrl,
          reference: txRef,
        );
      }

      return SquadResult(
        success: false,
        errorMessage: res['message'] as String? ?? 'Failed to initialize payment',
      );
    } catch (e) {
      debugPrint('Squad initializeCheckout error: $e');
      return SquadResult(success: false, errorMessage: 'Payment error: $e');
    }
  }

  /// Verify a Squad transaction by reference.
  static Future<SquadVerificationResult> verifyTransaction({
    required String reference,
  }) async {
    try {
      final res = await CloudFunctionsService.verifyTransaction(
        transactionRef: reference,
      );

      final success = res['success'] == true;
      final status = res['status'] as String? ?? (success ? 'success' : 'failed');
      final amount = (res['amount'] as num?)?.toDouble() ?? 0.0;

      return SquadVerificationResult(
        success: success,
        status: status,
        amount: amount,
        reference: (res['reference'] as String?) ?? reference,
        errorMessage: res['message'] as String?,
      );
    } catch (e) {
      debugPrint('Squad verifyTransaction error: $e');
      return SquadVerificationResult(
        success: false,
        status: 'failed',
        errorMessage: 'Verification error: $e',
      );
    }
  }

  /// Create a permanent virtual bank account for a customer (B2C model).
  ///
  /// Requires: first_name, last_name, mobile_num, dob, gender, address,
  /// customer_identifier, bvn, and beneficiary_account (merchant's GTBank account).
  /// Squad validates BVN against names, DOB, and phone number.
  static Future<SquadVirtualAccount> createCustomerVirtualAccount({
    required String firstName,
    required String lastName,
    required String mobileNum,
    required String dob,
    required String gender,
    required String address,
    required String customerIdentifier,
    required String bvn,
    String? email,
  }) async {
    try {
      final body = <String, dynamic>{
        'first_name': firstName,
        'last_name': lastName,
        'mobile_num': mobileNum,
        'dob': dob,
        'gender': gender,
        'address': address,
        'customer_identifier': customerIdentifier,
        'bvn': bvn,
      };
      if (email != null) body['email'] = email;
      body['beneficiary_account'] = ApiConfig.squadBeneficiaryAccount;

      debugPrint('Squad createCustomerVirtualAccount request: ${jsonEncode(body)}');

      final res = await http.post(
        Uri.parse('$_base/virtual-account'),
        headers: {
          'Authorization': 'Bearer $_secretKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode(body),
      );

      debugPrint('Squad createCustomerVirtualAccount response: ${res.statusCode} ${res.body}');

      final data = jsonDecode(res.body);

      if (data['success'] == true || data['status'] == 200) {
        final d = data['data'] as Map<String, dynamic>;
        return SquadVirtualAccount(
          success: true,
          accountName: '${d['first_name'] ?? ''} ${d['last_name'] ?? ''}'.trim(),
          accountNumber: (d['virtual_account_number'] ?? d['account_number']) as String?,
          bankName: d['bank_name'] as String? ?? 'GTBank',
          accountReference: d['customer_identifier'] as String?,
        );
      }

      return SquadVirtualAccount(
        success: false,
        errorMessage: data['message'] as String? ?? 'Failed to create virtual account',
      );
    } catch (e) {
      debugPrint('Squad createCustomerVirtualAccount error: $e');
      return SquadVirtualAccount(success: false, errorMessage: 'Network error: $e');
    }
  }

  /// Initiate a dynamic virtual account for a customer.
  ///
  /// This generates a virtual account tied to a specific amount and
  /// transaction reference. The account expires after [duration] seconds.
  /// Amount is in naira — converted to kobo internally.
  static Future<SquadVirtualAccount> createDynamicVirtualAccount({
    required double amount,
    required String customerEmail,
    required String transactionRef,
    int duration = 3600,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_base/virtual-account/initiate-dynamic-virtual-account'),
        headers: {
          'Authorization': 'Bearer $_secretKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'amount': (amount * 100).toInt(),
          'duration': duration,
          'email': customerEmail,
          'transaction_ref': transactionRef,
        }),
      );

      final body = jsonDecode(res.body);

      if (body['success'] == true || body['status'] == 200) {
        final data = body['data'] as Map<String, dynamic>;
        return SquadVirtualAccount(
          success: true,
          accountName: data['account_name'] as String?,
          accountNumber: data['account_number'] as String?,
          bankName: data['bank'] as String?,
          accountReference: data['transaction_reference'] as String?,
        );
      }

      return SquadVirtualAccount(
        success: false,
        errorMessage: body['message'] as String? ?? 'Failed to create virtual account',
      );
    } catch (e) {
      debugPrint('Squad createDynamicVirtualAccount error: $e');
      return SquadVirtualAccount(success: false, errorMessage: 'Network error: $e');
    }
  }

  /// Retrieve details of an existing virtual account by account number.
  static Future<SquadVirtualAccount> getVirtualAccount(String accountNumber) async {
    try {
      final res = await http.get(
        Uri.parse('$_base/virtual-account/customer/$accountNumber'),
        headers: {
          'Authorization': 'Bearer $_secretKey',
        },
      );

      final body = jsonDecode(res.body);

      if (body['success'] == true || body['status'] == 200) {
        final data = body['data'] as Map<String, dynamic>;
        return SquadVirtualAccount(
          success: true,
          accountName: data['account_name'] as String?,
          accountNumber: data['account_number'] as String?,
          bankName: data['bank_name'] as String?,
          accountReference: data['customer_identifier'] as String?,
        );
      }

      return SquadVirtualAccount(
        success: false,
        errorMessage: body['message'] as String? ?? 'Failed to retrieve virtual account',
      );
    } catch (e) {
      debugPrint('Squad getVirtualAccount error: $e');
      return SquadVirtualAccount(success: false, errorMessage: 'Network error: $e');
    }
  }

  /// Charge a previously tokenized card using the token_id from webhook.
  ///
  /// Amount is in naira — converted to kobo internally.
  static Future<SquadResult> chargeCard({
    required double amount,
    required String tokenId,
    String? reference,
  }) async {
    final ref = reference ?? 'smclientkx-charge-${DateTime.now().millisecondsSinceEpoch}';

    try {
      final res = await http.post(
        Uri.parse('$_base/transaction/charge_card'),
        headers: {
          'Authorization': 'Bearer $_secretKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'amount': (amount * 100).toInt(),
          'token_id': tokenId,
          'transaction_ref': ref,
        }),
      );

      final body = jsonDecode(res.body);

      if (body['success'] == true || body['status'] == 200) {
        final data = body['data'] as Map<String, dynamic>;
        return SquadResult(
          success: true,
          reference: data['transaction_ref'] as String? ?? ref,
        );
      }

      return SquadResult(
        success: false,
        errorMessage: body['message'] as String? ?? 'Failed to charge card',
      );
    } catch (e) {
      debugPrint('Squad chargeCard error: $e');
      return SquadResult(success: false, errorMessage: 'Network error: $e');
    }
  }

  /// Cancel a card tokenization to stop recurring payments.
  static Future<bool> cancelCardToken(String tokenId) async {
    try {
      final res = await http.patch(
        Uri.parse('$_base/transaction/cancel/recurring'),
        headers: {
          'Authorization': 'Bearer $_secretKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'token_id': tokenId,
        }),
      );

      final body = jsonDecode(res.body);
      return body['success'] == true || body['status'] == 200;
    } catch (e) {
      debugPrint('Squad cancelCardToken error: $e');
      return false;
    }
  }

  /// Simulate a payment to a virtual account (sandbox only).
  static Future<bool> simulatePayment({
    required String accountNumber,
    required double amount,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_base/virtual-account/simulate/payment'),
        headers: {
          'Authorization': 'Bearer $_secretKey',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'virtual_account_number': accountNumber,
          'amount': amount.toString(),
        }),
      );
      final body = jsonDecode(res.body);
      return body['success'] == true || body['status'] == 200;
    } catch (e) {
      debugPrint('Squad simulatePayment error: $e');
      return false;
    }
  }
}

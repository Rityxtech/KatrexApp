import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../utils/api_config.dart';

class KorapayVirtualAccount {
  final bool success;
  final String? accountName;
  final String? accountNumber;
  final String? bankName;
  final String? accountReference;
  final String? errorMessage;

  KorapayVirtualAccount({
    required this.success,
    this.accountName,
    this.accountNumber,
    this.bankName,
    this.accountReference,
    this.errorMessage,
  });
}

class KorapayService {
  static const String _base = '${ApiConfig.korapayBaseUrl}/api/v1';

  static Future<KorapayVirtualAccount> createVirtualAccount({
    required String accountName,
    required String accountReference,
    required String customerName,
    required String customerEmail,
    required String bvn,
    String bankCode = ApiConfig.korapayBankCode,
    bool permanent = true,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$_base/virtual-bank-account'),
        headers: {
          'Authorization': 'Bearer ${ApiConfig.korapaySecretKey}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'account_name': accountName,
          'account_reference': accountReference,
          'permanent': permanent,
          'bank_code': bankCode,
          'customer': {
            'name': customerName,
            'email': customerEmail,
          },
          'kyc': {
            'bvn': bvn,
          },
          'currency': 'NGN',
        }),
      );

      final body = jsonDecode(res.body);
      debugPrint('Korapay createVirtualAccount response: ${res.statusCode} ${res.body}');

      if (body['status'] == true) {
        final data = body['data'] as Map<String, dynamic>;
        return KorapayVirtualAccount(
          success: true,
          accountName: data['account_name'] as String?,
          accountNumber: data['account_number'] as String?,
          bankName: data['bank_name'] as String?,
          accountReference: data['account_reference'] as String?,
        );
      }

      return KorapayVirtualAccount(
        success: false,
        errorMessage: body['message'] as String? ?? 'Failed to create virtual account',
      );
    } catch (e) {
      debugPrint('Korapay createVirtualAccount error: $e');
      return KorapayVirtualAccount(success: false, errorMessage: 'Network error: $e');
    }
  }

  static Future<KorapayVirtualAccount> getVirtualAccount(String accountReference) async {
    try {
      final res = await http.get(
        Uri.parse('$_base/virtual-bank-account/$accountReference'),
        headers: {
          'Authorization': 'Bearer ${ApiConfig.korapaySecretKey}',
        },
      );

      final body = jsonDecode(res.body);

      if (body['status'] == true) {
        final data = body['data'] as Map<String, dynamic>;
        return KorapayVirtualAccount(
          success: true,
          accountName: data['account_name'] as String?,
          accountNumber: data['account_number'] as String?,
          bankName: data['bank_name'] as String?,
          accountReference: data['account_reference'] as String?,
        );
      }

      return KorapayVirtualAccount(
        success: false,
        errorMessage: body['message'] as String? ?? 'Failed to retrieve virtual account',
      );
    } catch (e) {
      debugPrint('Korapay getVirtualAccount error: $e');
      return KorapayVirtualAccount(success: false, errorMessage: 'Network error: $e');
    }
  }
}

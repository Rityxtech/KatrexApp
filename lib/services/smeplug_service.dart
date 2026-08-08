import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../utils/api_config.dart';

/// Represents a data plan fetched live from SMEPLUG.
class SmePlugDataPlan {
  final int id;
  final String name;
  final double price;

  const SmePlugDataPlan({
    required this.id,
    required this.name,
    required this.price,
  });

  factory SmePlugDataPlan.fromJson(Map<String, dynamic> json) {
    return SmePlugDataPlan(
      id: json['id'] as int,
      name: json['name'] as String,
      price: (json['price'] as num?)?.toDouble() ?? 0,
    );
  }
}

/// Result of a SMEPLUG purchase operation.
class SmePlugResult {
  final bool success;
  final String message;
  final String? reference;

  const SmePlugResult({
    required this.success,
    required this.message,
    this.reference,
  });
}

/// Service that talks to the SMEPLUG API for live data plans and purchases.
class SmePlugService {
  static const _base = ApiConfig.smeplugBaseUrl;

  static Map<String, String> get _headers => {
        'Authorization': 'Bearer ${ApiConfig.smeplugApiKey}',
        'Content-Type': 'application/json',
        'Accept': '*/*',
      };

  static Map<String, dynamic>? _cachedPlans;
  static DateTime? _cachedPlansTime;

  /// Fetch live data plans for a specific network.
  /// [networkId] should be: 1=MTN, 2=Airtel, 3=T2(9Mobile), 4=Glo.
  static Future<List<SmePlugDataPlan>> getDataPlans(String networkId) async {
    const url = '$_base/data/plans';
    debugPrint('SmePlug getDataPlans: $url (network=$networkId)');

    try {
      // Use cache if fetched within the last 5 minutes
      Map<String, dynamic> allData;
      if (_cachedPlans != null &&
          _cachedPlansTime != null &&
          DateTime.now().difference(_cachedPlansTime!) < const Duration(minutes: 5)) {
        allData = _cachedPlans!;
      } else {
        final res = await http.get(Uri.parse(url), headers: _headers)
            .timeout(const Duration(seconds: 15));
        debugPrint('SmePlug getDataPlans response length: ${res.body.length}');
        final json = jsonDecode(res.body) as Map<String, dynamic>;
        if (json['status'] != true) return [];
        allData = json['data'] as Map<String, dynamic>;
        _cachedPlans = allData;
        _cachedPlansTime = DateTime.now();
      }

      final plans = allData[networkId] as List?;
      if (plans != null) {
        return plans
            .map((e) => SmePlugDataPlan.fromJson(e as Map<String, dynamic>))
            .where((p) => p.price > 0)
            .toList()
          ..sort((a, b) => a.price.compareTo(b.price));
      }
      return [];
    } catch (e) {
      debugPrint('SmePlug getDataPlans error: $e');
      return [];
    }
  }

  /// Purchase a data bundle for a mobile number.
  ///
  /// [networkId] is the SMEPLUG network ID (1=MTN, 2=Airtel, 3=9Mobile, 4=Glo).
  /// [planId] is the plan ID from getDataPlans().
  /// [phone] is the recipient phone number.
  static Future<SmePlugResult> purchaseData({
    required String networkId,
    required String planId,
    required String phone,
    String? customerReference,
  }) async {
    const url = '$_base/data/purchase';
    final body = {
      'network_id': networkId,
      'plan_id': planId,
      'phone': phone,
      'customer_reference': customerReference,
      'async': false,
    };
    debugPrint('SmePlug purchaseData: $url body=$body');

    try {
      final res = await http.post(
        Uri.parse(url),
        headers: _headers,
        body: jsonEncode(body),
      );
      debugPrint('SmePlug purchaseData response: ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final rawData = json['data'];
      final dataMap = rawData is Map<String, dynamic> ? rawData : null;
      final currentStatus = dataMap?['current_status'] as String?;
      // Treat as success if API says true OR data.current_status is 'success'
      final success = json['status'] == true || currentStatus == 'success';
      String message;
      if (success) {
        message = dataMap?['msg'] as String? ?? json['message'] as String? ?? 'Success';
      } else {
        final dataMsg = dataMap?['msg'] as String?;
        message = json['errors'] as String? ??
            json['msg'] as String? ??
            dataMsg ??
            json['message'] as String? ??
            'Failed';
      }
      return SmePlugResult(
        success: success,
        message: message,
        reference: dataMap?['reference'] as String?,
      );
    } catch (e) {
      debugPrint('SmePlug purchaseData error: $e');
      return SmePlugResult(success: false, message: 'Network error: $e');
    }
  }

  /// Purchase airtime for a mobile number.
  ///
  /// [networkId] is the SMEPLUG network ID (1=MTN, 2=Airtel, 3=9Mobile, 4=Glo).
  /// [amount] is the airtime amount in naira.
  /// [phone] is the recipient phone number.
  static Future<SmePlugResult> purchaseAirtime({
    required String networkId,
    required double amount,
    required String phone,
    String? customerReference,
  }) async {
    const url = '$_base/airtime/purchase';
    final body = {
      'network_id': networkId,
      'amount': amount,
      'phone': phone,
      'customer_reference': customerReference,
    };
    debugPrint('SmePlug purchaseAirtime: $url body=$body');

    try {
      final res = await http.post(
        Uri.parse(url),
        headers: _headers,
        body: jsonEncode(body),
      );
      debugPrint('SmePlug purchaseAirtime response: ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final rawData = json['data'];
      final dataMap = rawData is Map<String, dynamic> ? rawData : null;
      final currentStatus = dataMap?['current_status'] as String?;
      final success = json['status'] == true || currentStatus == 'success';
      String message;
      if (success) {
        message = dataMap?['msg'] as String? ?? json['message'] as String? ?? 'Success';
      } else {
        final dataMsg = dataMap?['msg'] as String?;
        message = json['errors'] as String? ??
            json['msg'] as String? ??
            dataMsg ??
            json['message'] as String? ??
            'Failed';
      }
      return SmePlugResult(
        success: success,
        message: message,
        reference: dataMap?['reference'] as String?,
      );
    } catch (e) {
      debugPrint('SmePlug purchaseAirtime error: $e');
      return SmePlugResult(success: false, message: 'Network error: $e');
    }
  }

  /// Query the status of a transaction by reference.
  static Future<SmePlugResult> queryTransaction(String reference) async {
    final url = '$_base/transactions/$reference';
    debugPrint('SmePlug queryTransaction: $url');

    try {
      final res = await http.get(Uri.parse(url), headers: _headers);
      debugPrint('SmePlug queryTransaction response: ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final success = json['status'] == true;
      return SmePlugResult(
        success: success,
        message: json['message'] as String? ?? (success ? 'Success' : 'Failed'),
        reference: reference,
      );
    } catch (e) {
      debugPrint('SmePlug queryTransaction error: $e');
      return SmePlugResult(success: false, message: 'Network error: $e');
    }
  }
}

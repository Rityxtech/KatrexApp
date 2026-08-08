import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../utils/api_config.dart';

/// Represents a data plan fetched from SME API.
class SmeApiDataPlan {
  final int id;
  final String name;
  final double price;
  final String network;
  final String type;
  final String days;

  const SmeApiDataPlan({
    required this.id,
    required this.name,
    required this.price,
    required this.network,
    required this.type,
    required this.days,
  });

  factory SmeApiDataPlan.fromJson(Map<String, dynamic> json) {
    return SmeApiDataPlan(
      id: json['id'] as int,
      name: json['name'] as String,
      price: (json['user_price'] as num?)?.toDouble() ?? 0,
      network: json['network'] as String? ?? '',
      type: json['type'] as String? ?? '',
      days: json['days'] as String? ?? '',
    );
  }
}

/// Result of an SME API purchase operation.
class SmeApiResult {
  final bool success;
  final String message;
  final String? reference;

  const SmeApiResult({
    required this.success,
    required this.message,
    this.reference,
  });
}

/// Service that talks to the SME API (smeapi.com.ng) for data plans and purchases.
class SmeApiService {
  static const _base = ApiConfig.smeapiBaseUrl;

  static Map<String, String> get _headers => {
        'Authorization': 'Token ${ApiConfig.smeapiKey}',
        'Content-Type': 'application/json',
      };

  static List<SmeApiDataPlan>? _cachedPlans;
  static DateTime? _cachedPlansTime;
  static String? _cachedPlansAuthKey;

  /// Fetch data plans from SME API, optionally filtered by network name.
  /// [networkName] should be one of: "MTN", "Airtel", "Glo", "9mobile".
  static Future<List<SmeApiDataPlan>> getDataPlans(String networkName) async {
    const url = '$_base/dataplans/';
    debugPrint('SmeApi getDataPlans: $url (network=$networkName)');

    try {
      final authKey = ApiConfig.smeapiKey;
      final cacheValid = _cachedPlans != null &&
          _cachedPlansTime != null &&
          _cachedPlansAuthKey == authKey &&
          DateTime.now().difference(_cachedPlansTime!) < const Duration(minutes: 5);
      if (cacheValid) {
        return _filterPlansByNetwork(_cachedPlans!, networkName);
      }

      final res = await http.get(Uri.parse(url), headers: _headers).timeout(const Duration(seconds: 15));

      debugPrint('SmeApi getDataPlans response length: ${res.body.length}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;

      if (json['status'] != 'success') return [];

      final data = json['data'] as List;
      final allPlans = data
          .map((e) => SmeApiDataPlan.fromJson(e as Map<String, dynamic>))
          .where((p) => p.price > 0)
          .toList();

      _cachedPlans = allPlans;
      _cachedPlansTime = DateTime.now();
      _cachedPlansAuthKey = authKey;

      return _filterPlansByNetwork(allPlans, networkName);
    } catch (e) {
      debugPrint('SmeApi getDataPlans error: $e');
      return [];
    }
  }

  static List<SmeApiDataPlan> _filterPlansByNetwork(
      List<SmeApiDataPlan> plans, String networkName) {
    final target = networkName.toLowerCase();
    final filtered = plans.where((p) {
      final planNetwork = p.network.toLowerCase();
      if (networkName == '9Mobile') {
        return planNetwork == '9mobile' || planNetwork == '9 mobile' || planNetwork == 'etisalat';
      }
      return planNetwork == target;
    }).toList()
      ..sort((a, b) => a.price.compareTo(b.price));
    return filtered;
  }

  /// Purchase a data bundle for a mobile number.
  ///
  /// [networkId] is the SME API network ID (1=MTN, 2=Airtel, 3=Glo, 4=9mobile).
  /// [planId] is the plan ID from getDataPlans().
  /// [phone] is the recipient phone number.
  static Future<SmeApiResult> purchaseData({
    required int networkId,
    required int planId,
    required String phone,
    String? ref,
  }) async {
    final url = '$_base/data/';
    final body = {
      'network': networkId,
      'data_plan': planId,
      'phone': phone,
      'ref': ref ?? 'smclientkx-${DateTime.now().millisecondsSinceEpoch}',
      'ported_number': 'false',
    };
    debugPrint('SmeApi purchaseData: $url body=$body');

    try {
      final res = await http.post(
        Uri.parse(url),
        headers: _headers,
        body: jsonEncode(body),
      );
      debugPrint('SmeApi purchaseData response: ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final success = json['status'] == 'success' || json['status'] == true;
      final message = json['message'] as String? ?? json['msg'] as String? ?? (success ? 'Success' : 'Failed');
      final data = json['data'];
      final refReturned = data is Map<String, dynamic> ? data['ref'] as String? : null;
      return SmeApiResult(
        success: success,
        message: message,
        reference: refReturned ?? body['ref'] as String?,
      );
    } catch (e) {
      debugPrint('SmeApi purchaseData error: $e');
      return SmeApiResult(success: false, message: 'Network error: $e');
    }
  }

  /// Purchase airtime for a mobile number.
  ///
  /// [networkId] is the SME API network ID (1=MTN, 2=Airtel, 3=Glo, 4=9mobile).
  /// [amount] is the airtime amount in naira.
  /// [phone] is the recipient phone number.
  static Future<SmeApiResult> purchaseAirtime({
    required int networkId,
    required double amount,
    required String phone,
    String? ref,
  }) async {
    final url = '$_base/airtime/';
    final body = {
      'network': networkId,
      'amount': amount.toInt(),
      'phone': phone,
      'ref': ref ?? 'smclientkx-${DateTime.now().millisecondsSinceEpoch}',
    };
    debugPrint('SmeApi purchaseAirtime: $url body=$body');

    try {
      final res = await http.post(
        Uri.parse(url),
        headers: _headers,
        body: jsonEncode(body),
      );
      debugPrint('SmeApi purchaseAirtime response: ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final success = json['status'] == 'success' || json['status'] == true;
      final message = json['message'] as String? ?? json['msg'] as String? ?? (success ? 'Success' : 'Failed');
      final data = json['data'];
      final refReturned = data is Map<String, dynamic> ? data['ref'] as String? : null;
      return SmeApiResult(
        success: success,
        message: message,
        reference: refReturned ?? body['ref'] as String?,
      );
    } catch (e) {
      debugPrint('SmeApi purchaseAirtime error: $e');
      return SmeApiResult(success: false, message: 'Network error: $e');
    }
  }
}

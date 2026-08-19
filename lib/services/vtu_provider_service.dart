import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';
import 'cloud_functions_service.dart';

/// Enum of available VTU providers.
enum VtuProvider { smeplug, smeapi }

/// Extension to convert VtuProvider to/from strings for Firestore storage.
extension VtuProviderX on VtuProvider {
  String get label {
    switch (this) {
      case VtuProvider.smeplug:
        return 'smeplug';
      case VtuProvider.smeapi:
        return 'smeapi';
    }
  }

  static VtuProvider fromString(String? v) {
    switch (v) {
      case 'smeplug':
        return VtuProvider.smeplug;
      case 'smeapi':
        return VtuProvider.smeapi;
      default:
        return VtuProvider.smeapi; // default to new provider
    }
  }
}

/// A unified data plan that works across providers.
class VtuDataPlan {
  final int id;
  final String name;
  final double price;
  final String? type;
  final String? days;

  const VtuDataPlan({
    required this.id,
    required this.name,
    required this.price,
    this.type,
    this.days,
  });
}

/// Result of a VTU purchase operation (unified across providers).
class VtuResult {
  final bool success;
  final String message;
  final String? reference;

  const VtuResult({
    required this.success,
    required this.message,
    this.reference,
  });
}

/// Unified VTU service that delegates to secure Cloud Functions.
///
/// The backend manages API keys, active provider selection from `config/vtu_provider`,
/// custom pricing markups, and plan visibility.
class VtuProviderService {
  static VtuProvider? _cachedProvider;
  static DateTime? _cachedProviderTime;

  /// Get the currently active provider, checking Firestore cache first.
  static Future<VtuProvider> getActiveProvider() async {
    // Use cached value for 30 seconds to avoid excessive Firestore reads
    if (_cachedProvider != null &&
        _cachedProviderTime != null &&
        DateTime.now().difference(_cachedProviderTime!) < const Duration(seconds: 30)) {
      return _cachedProvider!;
    }

    try {
      final doc = await FirebaseFirestore.instance
          .collection('config')
          .doc('vtu_provider')
          .get();

      if (doc.exists && doc.data() != null) {
        final providerStr = doc.data()!['provider'] as String?;
        _cachedProvider = VtuProviderX.fromString(providerStr);
      } else {
        _cachedProvider = VtuProvider.smeapi; // default to new provider
      }
    } catch (e) {
      debugPrint('VtuProviderService getActiveProvider error: $e');
      _cachedProvider ??= VtuProvider.smeapi;
    }

    _cachedProviderTime = DateTime.now();
    return _cachedProvider!;
  }

  /// Set the active provider (for admin dashboard use).
  static Future<void> setActiveProvider(VtuProvider provider) async {
    await FirebaseFirestore.instance
        .collection('config')
        .doc('vtu_provider')
        .set({
      'provider': provider.label,
      'updatedAt': DateTime.now().toIso8601String(),
    }, SetOptions(merge: true));

    _cachedProvider = provider;
    _cachedProviderTime = DateTime.now();
  }

  /// Fetch data plans for a given network via secure Cloud Functions backend.
  ///
  /// [networkIndex] is the app's internal index: 0=MTN, 1=Airtel, 2=Glo, 3=9Mobile.
  static Future<List<VtuDataPlan>> getDataPlans(int networkIndex) async {
    final networkName = _networkName(networkIndex);

    try {
      final plans = await CloudFunctionsService.getDataPlans(network: networkName);
      return plans.map((p) {
        final idVal = p['id'];
        final int id = idVal is int ? idVal : (int.tryParse(idVal?.toString() ?? '') ?? 0);
        final double price = (p['price'] as num?)?.toDouble() ?? 0.0;
        final name = p['name']?.toString() ?? '';
        final type = p['type']?.toString();
        final days = p['days']?.toString();
        return VtuDataPlan(
          id: id,
          name: name,
          price: price,
          type: type,
          days: days,
        );
      }).where((p) => p.price > 0).toList();
    } catch (e) {
      debugPrint('VtuProviderService getDataPlans error: $e');
      return [];
    }
  }

  /// Purchase data for a given network via secure Cloud Functions backend.
  ///
  /// [networkIndex] is the app's internal index: 0=MTN, 1=Airtel, 2=Glo, 3=9Mobile.
  /// [planId] is the plan ID from getDataPlans().
  static Future<VtuResult> purchaseData({
    required int networkIndex,
    required int planId,
    required String phone,
    double? amount,
    String? customerReference,
  }) async {
    final networkName = _networkName(networkIndex);

    try {
      final res = await CloudFunctionsService.purchaseData(
        phone: phone,
        planId: planId.toString(),
        amount: amount ?? 0,
        network: networkName,
      );
      final success = res['success'] == true;
      final message = res['message']?.toString() ?? (success ? 'Data purchase successful' : 'Data purchase failed');
      return VtuResult(
        success: success,
        message: message,
        reference: customerReference,
      );
    } catch (e) {
      debugPrint('VtuProviderService purchaseData error: $e');
      return VtuResult(
        success: false,
        message: e.toString().replaceFirst(RegExp(r'^\[.*?\]\s*'), ''),
        reference: customerReference,
      );
    }
  }

  /// Purchase airtime for a given network via secure Cloud Functions backend.
  ///
  /// [networkIndex] is the app's internal index: 0=MTN, 1=Airtel, 2=Glo, 3=9Mobile.
  static Future<VtuResult> purchaseAirtime({
    required int networkIndex,
    required double amount,
    required String phone,
    String? customerReference,
  }) async {
    final networkName = _networkName(networkIndex);

    try {
      final res = await CloudFunctionsService.purchaseAirtime(
        phone: phone,
        amount: amount,
        network: networkName,
      );
      final success = res['success'] == true;
      final message = res['message']?.toString() ?? (success ? 'Airtime purchase successful' : 'Airtime purchase failed');
      return VtuResult(
        success: success,
        message: message,
        reference: customerReference,
      );
    } catch (e) {
      debugPrint('VtuProviderService purchaseAirtime error: $e');
      return VtuResult(
        success: false,
        message: e.toString().replaceFirst(RegExp(r'^\[.*?\]\s*'), ''),
        reference: customerReference,
      );
    }
  }

  /// Maps app network index to network name string.
  static String _networkName(int index) {
    switch (index) {
      case 0:
        return 'MTN';
      case 1:
        return 'Airtel';
      case 2:
        return 'Glo';
      case 3:
        return '9Mobile';
      default:
        return 'MTN';
    }
  }

  /// Maps app network index to SmePlug network ID string.
  static String _smeplugNetworkId(int index) {
    switch (index) {
      case 0:
        return '1'; // MTN
      case 1:
        return '2'; // Airtel
      case 2:
        return '4'; // Glo
      case 3:
        return '3'; // 9Mobile
      default:
        return '1';
    }
  }

  /// Maps app network index to SmeApi network ID integer for AIRTIME.
  /// SmeApi airtime IDs: 1=MTN, 2=Airtel, 3=9mobile, 4=Glo
  static int _smeapiNetworkId(int index) {
    switch (index) {
      case 0:
        return 1; // MTN
      case 1:
        return 2; // Airtel
      case 2:
        return 4; // Glo
      case 3:
        return 3; // 9mobile
      default:
        return 1;
    }
  }

  /// Maps app network index to SmeApi network ID integer for DATA.
  /// SmeApi data IDs: 1=MTN, 2=Glo, 3=9mobile, 4=Airtel
  /// Note: Glo and Airtel are swapped compared to airtime IDs!
  static int _smeapiDataNetworkId(int index) {
    switch (index) {
      case 0:
        return 1; // MTN
      case 1:
        return 4; // Airtel
      case 2:
        return 2; // Glo
      case 3:
        return 3; // 9mobile
      default:
        return 1;
    }
  }
}

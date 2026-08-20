import 'package:flutter/foundation.dart';

/// Handles referral link resolution.
///
/// Referral links have the format:
///   https://katrexapp.page.link/refer?code=KAT-JOH-1234
///
/// When the app is opened from such a link, this service extracts the
/// referral code and stores it so the register screen can auto-fill it.
class ReferralDeepLinkService {
  ReferralDeepLinkService._();
  static final ReferralDeepLinkService instance = ReferralDeepLinkService._();

  /// The referral code extracted from a deep link (if any).
  String? _pendingReferralCode;
  String? get pendingReferralCode => _pendingReferralCode;

  /// Clear the pending code after it's been consumed by the register screen.
  void consumeReferralCode() {
    _pendingReferralCode = null;
  }

  /// Initialize deep link handling. Call this once at app startup.
  Future<String?> init() async {
    return null;
  }

  /// Extract the referral code from a deep link URL.
  String? extractReferralCode(Uri uri) {
    // Check query parameters
    final code = uri.queryParameters['code'];
    if (code != null && code.isNotEmpty) return code;

    // Check path segments (e.g. /refer/KAT-JOH-1234)
    final segments = uri.pathSegments;
    if (segments.length >= 2 && segments[0] == 'refer') {
      return segments[1];
    }

    return null;
  }

  /// Build a shareable referral link for a referral code.
  String buildReferralLink(String referralCode) {
    return 'https://katrexapp.page.link/refer?code=$referralCode';
  }
}

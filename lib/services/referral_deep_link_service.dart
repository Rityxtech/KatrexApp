import 'package:firebase_dynamic_links_fixed/firebase_dynamic_links_fixed.dart';
import 'package:flutter/foundation.dart';

/// Handles Firebase Dynamic Links for the referral system.
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
  /// Returns the initial referral code if the app was opened from a link.
  Future<String?> init() async {
    try {
      final pendingLink = await FirebaseDynamicLinks.instance.retrieveDynamicLink();
      if (pendingLink != null) {
        final code = _extractReferralCode(pendingLink.link);
        if (code != null) {
          _pendingReferralCode = code;
          debugPrint('[ReferralDeepLink] Initial link referral code: $code');
          return code;
        }
      }
    } catch (e) {
      debugPrint('[ReferralDeepLink] Error retrieving dynamic link: $e');
    }
    return null;
  }

  /// Extract the referral code from a deep link URL.
  /// Supports: https://katrexapp.page.link/refer?code=KAT-JOH-1234
  /// Also supports: https://katrexapp.com/refer?code=KAT-JOH-1234
  String? _extractReferralCode(Uri uri) {
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
  /// The dynamic link is created in the Firebase Console with the pattern:
  ///   https://katrexapp.page.link/refer?code={code}
  /// We construct the URL manually since the fork doesn't support building links.
  String buildReferralLink(String referralCode) {
    return 'https://katrexapp.page.link/refer?code=$referralCode';
  }
}

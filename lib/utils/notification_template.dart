import 'package:flutter/material.dart';

/// Katrex brand standard for push notifications. Every push the system sends
/// (admin broadcasts, transaction events, security alerts) flows through this
/// helper so the on-device notification reads on-brand: consistent title
/// formatting, body length guard-rails, no emoji, and a fixed colour/voice
/// that matches the in-app UI.
///
/// What this gives us:
/// - Every Katrex push uses the same accent colour as the app (#2563EB).
/// - The OS-level title is the admin's title (no extra "Katrex" prefix noise)
///   — the OS already shows the app name on the small-icon row.
/// - The body is clamped to 120 chars (fits two lines on most lock screens)
///   and tagged with an internal `[type]` marker for analytics.
class NotificationTemplate {
  NotificationTemplate._();

  /// Katrex primary brand colour — used as the small-icon accent on Android
  /// and as the leading-accent on the in-app banner.
  static const Color brandColor = Color(0xFF2563EB);

  /// Lighter accent used in the in-app banner gradient.
  static const Color brandAccent = Color(0xFF3B82F6);

  /// Display name shown on the notification channel and as the OS-level
  /// "from" label fallback.
  static const String brandName = 'KatrexApp';

  /// Maximum characters kept in the title of the OS-level push. 40 fits one
  /// line on the vast majority of lock screens, so the OS never truncates
  /// the admin's message mid-word.
  static const int maxTitleChars = 40;

  /// Maximum characters kept in the body of the OS-level push. 120 fits two
  /// lines on most lock screens, mirroring the server-side cap so what the
  /// admin types and what the device shows stay identical.
  static const int maxBodyChars = 120;

  /// Emoji + ZWJ ranges. Mirrors the server-side `cleanFintechText` regex
  /// in `functions/src/admin-functions.ts` so the device-side renderer strips
  /// the same characters the server already removed from the FCM payload.
  static final RegExp _emojiAndZwjRegExp = RegExp(
    r'[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]',
    unicode: true,
  );
  static final RegExp _zeroWidthRegExp = RegExp(
    r'[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]',
  );
  static final RegExp _terminalPunctRegExp = RegExp(r'[.!?…]$');

  /// Build a `Payload` from a raw `title`/`body` pair plus a notification
  /// type. Runs the input through the clean-fintech standard so the on-device
  /// notification reads on-brand.
  static Payload build({
    required String title,
    required String body,
    required NotificationTemplateType type,
  }) {
    final cleanTitle = cleanFintechText(title, maxTitleChars);
    final cleanBody = cleanFintechText(body, maxBodyChars);
    return Payload(
      title: cleanTitle,
      body: cleanBody,
      type: type,
      tag: type.tag,
    );
  }

  /// Clean-fintech text standard. Strips emoji, zero-width noise, collapses
  /// internal whitespace, caps length, and ensures the result ends with
  /// terminal punctuation so the body always reads as a complete sentence.
  static String cleanFintechText(String input, int maxChars) {
    var s = input;
    s = s.replaceAll(_emojiAndZwjRegExp, '').replaceAll(_zeroWidthRegExp, '');
    s = s.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (s.length > maxChars) {
      s = '${s.substring(0, maxChars - 1).trimRight()}\u2026';
    }
    if (s.isNotEmpty && !_terminalPunctRegExp.hasMatch(s)) {
      s = '$s.';
    }
    return s;
  }

  /// Build the data map that travels in the FCM `data` field. The Flutter
  /// client reads this to render the in-app banner and to decide routing.
  static Map<String, String> toDataMap(Payload p) {
    return {
      'template': p.tag,
      'title': p.title,
      'body': p.body,
      'brand': 'katrex',
    };
  }
}

enum NotificationTemplateType {
  adminPush('admin_push', 'campaign'),
  transaction('transaction', 'payments'),
  security('security', 'shield'),
  system('system', 'campaign');

  const NotificationTemplateType(this.tag, this.analyticsKey);
  final String tag;
  final String analyticsKey;
}

/// A sanitised push payload ready to hand to `flutter_local_notifications`
/// or to FCM. Construct via [NotificationTemplate.build] so copy stays
/// on-brand.
class Payload {
  final String title;
  final String body;
  final NotificationTemplateType type;
  final String tag;

  const Payload({
    required this.title,
    required this.body,
    required this.type,
    required this.tag,
  });
}

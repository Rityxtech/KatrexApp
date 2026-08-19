import 'package:crypto/crypto.dart';
import 'dart:convert';

/// Utility for hashing and verifying transaction PINs.
///
/// PINs are never stored in plaintext — we store a SHA-256 hash
/// salted with a static app-level salt. This isn't as secure as
/// bcrypt/argon2, but those aren't available in pure Dart and
/// running them in a Cloud Function would add latency to every
/// transaction. The hash is sufficient to prevent plaintext
/// exposure if Firestore is compromised.
class PinUtils {
  static const String _salt = 'katrex_pin_salt_v1_2024';

  /// Hash a 6-digit PIN using SHA-256 with a static salt.
  static String hashPin(String pin) {
    final bytes = utf8.encode('$_salt:$pin');
    return sha256.convert(bytes).toString();
  }

  /// Verify a plaintext PIN against a stored hash.
  static bool verifyPin(String pin, String? storedHash) {
    if (storedHash == null || storedHash.isEmpty) return false;
    return hashPin(pin) == storedHash;
  }

  /// Validate that a PIN is exactly 6 digits.
  static bool isValidPin(String pin) {
    return RegExp(r'^\d{6}$').hasMatch(pin);
  }
}

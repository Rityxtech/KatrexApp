import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Manages secure storage of login credentials for biometric login.
///
/// When a user enables biometric login, their email and password are
/// stored securely (encrypted by the OS keychain/keystore). When they
/// return to the app and tap the fingerprint button on the login screen,
/// we retrieve the credentials and sign them in automatically after
/// biometric verification succeeds.
class BiometricAuthService {
  static const _storage = FlutterSecureStorage();

  static const _keyEmail = 'biometric_email';
  static const _keyPassword = 'biometric_password';
  static const _keyEnabled = 'biometric_login_enabled';

  /// Save credentials when biometric login is enabled.
  static Future<void> saveCredentials({
    required String email,
    required String password,
  }) async {
    await _storage.write(key: _keyEmail, value: email);
    await _storage.write(key: _keyPassword, value: password);
    await _storage.write(key: _keyEnabled, value: 'true');
  }

  /// Get the saved email (for pre-filling the login form).
  static Future<String?> getSavedEmail() async {
    return await _storage.read(key: _keyEmail);
  }

  /// Get the saved password (for auto-login after biometric auth).
  static Future<String?> getSavedPassword() async {
    return await _storage.read(key: _keyPassword);
  }

  /// Check if biometric login has saved credentials.
  static Future<bool> hasSavedCredentials() async {
    final email = await _storage.read(key: _keyEmail);
    final password = await _storage.read(key: _keyPassword);
    return email != null && password != null;
  }

  /// Clear saved credentials (when biometric login is disabled).
  static Future<void> clearCredentials() async {
    await _storage.delete(key: _keyEmail);
    await _storage.delete(key: _keyPassword);
    await _storage.delete(key: _keyEnabled);
  }
}

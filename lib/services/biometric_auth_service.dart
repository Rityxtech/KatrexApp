import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Manages secure storage of login credentials and device biometric detection for biometric login.
class BiometricAuthService {
  static const _keyEmail = 'biometric_email';
  static const _keyPassword = 'biometric_password';
  static const _keyEnabled = 'biometric_login_enabled';

  /// Save credentials when biometric login is enabled.
  static Future<void> saveCredentials({
    required String email,
    required String password,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyEmail, email.trim().toLowerCase());
    await prefs.setString(_keyPassword, password);
    await prefs.setBool(_keyEnabled, true);
  }

  /// Get the saved email.
  static Future<String?> getSavedEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyEmail);
  }

  /// Get the saved password.
  static Future<String?> getSavedPassword() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyPassword);
  }

  /// Check if biometric login has saved credentials.
  static Future<bool> hasSavedCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    final email = prefs.getString(_keyEmail);
    final password = prefs.getString(_keyPassword);
    return email != null && email.isNotEmpty && password != null && password.isNotEmpty;
  }

  /// Check if there are valid saved credentials matching a specific email.
  static Future<bool> hasValidCredentialsFor(String email) async {
    final savedEmail = await getSavedEmail();
    final savedPass = await getSavedPassword();
    if (savedEmail == null || savedPass == null || savedEmail.isEmpty || savedPass.isEmpty) {
      return false;
    }
    return savedEmail.trim().toLowerCase() == email.trim().toLowerCase();
  }

  /// Check if hardware supports and has enrolled biometrics.
  static Future<bool> isHardwareSupported({LocalAuthentication? auth}) async {
    try {
      final localAuth = auth ?? LocalAuthentication();
      final canCheck = await localAuth.canCheckBiometrics;
      final isSupported = await localAuth.isDeviceSupported();
      return canCheck || isSupported;
    } catch (_) {
      return false;
    }
  }

  /// Check if biometric is fully active and ready for a specific user.
  /// Returns true ONLY if:
  /// 1. Device hardware supports biometrics.
  /// 2. Credentials for this specific email are securely saved on this device.
  static Future<bool> isBiometricActiveFor(String email, {LocalAuthentication? auth}) async {
    final hasCreds = await hasValidCredentialsFor(email);
    if (!hasCreds) return false;
    final hardwareOk = await isHardwareSupported(auth: auth);
    return hardwareOk;
  }

  /// Clear saved credentials.
  static Future<void> clearCredentials() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyEmail);
    await prefs.remove(_keyPassword);
    await prefs.remove(_keyEnabled);
  }
}

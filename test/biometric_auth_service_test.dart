import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:katrexapp/services/biometric_auth_service.dart';

void main() {
  group('BiometricAuthService Tests', () {
    setUp(() {
      SharedPreferences.setMockInitialValues({});
    });

    test('initially has no saved credentials', () async {
      expect(await BiometricAuthService.hasSavedCredentials(), false);
      expect(await BiometricAuthService.getSavedEmail(), isNull);
      expect(await BiometricAuthService.getSavedPassword(), isNull);
    });

    test('saves and retrieves credentials correctly', () async {
      await BiometricAuthService.saveCredentials(
        email: 'trader@katrex.io',
        password: 'SuperSecretPassword#123',
      );

      expect(await BiometricAuthService.hasSavedCredentials(), true);
      expect(await BiometricAuthService.getSavedEmail(), 'trader@katrex.io');
      expect(await BiometricAuthService.getSavedPassword(), 'SuperSecretPassword#123');
    });

    test('clears credentials on clearCredentials()', () async {
      await BiometricAuthService.saveCredentials(
        email: 'trader@katrex.io',
        password: 'SuperSecretPassword#123',
      );

      expect(await BiometricAuthService.hasSavedCredentials(), true);

      await BiometricAuthService.clearCredentials();

      expect(await BiometricAuthService.hasSavedCredentials(), false);
      expect(await BiometricAuthService.getSavedEmail(), isNull);
      expect(await BiometricAuthService.getSavedPassword(), isNull);
    });

    test('hasValidCredentialsFor checks matching email case-insensitively', () async {
      await BiometricAuthService.saveCredentials(
        email: 'Trader@Katrex.IO',
        password: 'Password123#',
      );

      expect(await BiometricAuthService.hasValidCredentialsFor('trader@katrex.io'), true);
      expect(await BiometricAuthService.hasValidCredentialsFor('TRADER@KATREX.IO'), true);
      expect(await BiometricAuthService.hasValidCredentialsFor('otheruser@katrex.io'), false);
    });

    test('hasValidCredentialsFor returns false when no credentials saved', () async {
      expect(await BiometricAuthService.hasValidCredentialsFor('trader@katrex.io'), false);
    });
  });
}

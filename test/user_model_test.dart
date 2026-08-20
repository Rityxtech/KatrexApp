import 'package:flutter_test/flutter_test.dart';
import 'package:katrexapp/models/user_model.dart';

void main() {
  group('UserModel Serialization & Lifecycle Tests', () {
    final now = DateTime.now();

    test('correctly serializes and deserializes UserModel', () {
      final user = UserModel(
        uid: 'user_12345',
        fullName: 'Jane Doe',
        username: 'janedoe',
        email: 'jane@katrex.io',
        phone: '+2348000000000',
        avatarUrl: 'https://example.com/avatar.png',
        kycTier: 1,
        kycStatus: 'verified',
        isEmailVerified: true,
        isPhoneVerified: true,
        referralCode: 'KAT-JAN-1234',
        pinEnabled: true,
        biometricEnabled: true,
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
        isActive: true,
      );

      final map = user.toMap();
      expect(map['uid'], 'user_12345');
      expect(map['email'], 'jane@katrex.io');
      expect(map['isEmailVerified'], true);
      expect(map['biometricEnabled'], true);
      expect(map['pinEnabled'], true);

      final reconstructed = UserModel.fromMap(map);
      expect(reconstructed.uid, user.uid);
      expect(reconstructed.fullName, user.fullName);
      expect(reconstructed.username, user.username);
      expect(reconstructed.email, user.email);
      expect(reconstructed.isEmailVerified, true);
      expect(reconstructed.biometricEnabled, true);
      expect(reconstructed.pinEnabled, true);
    });

    test('handles fallback defaults gracefully when fields are missing in Firestore', () {
      final minimalMap = <String, dynamic>{
        'uid': 'user_min',
        'fullName': 'Min User',
        'username': 'minuser',
        'email': 'min@katrex.io',
        'referralCode': 'KAT-MIN-9999',
      };

      final user = UserModel.fromMap(minimalMap);
      expect(user.uid, 'user_min');
      expect(user.kycTier, 0);
      expect(user.isEmailVerified, false);
      expect(user.isPhoneVerified, false);
      expect(user.biometricEnabled, false);
      expect(user.pinEnabled, false);
      expect(user.isAdmin, false);
      expect(user.isActive, true);
    });

    test('copyWith properly updates specific properties without mutating others', () {
      final original = UserModel(
        uid: 'user_orig',
        fullName: 'Original User',
        username: 'original',
        email: 'orig@katrex.io',
        referralCode: 'KAT-ORI-1111',
        isEmailVerified: false,
        biometricEnabled: false,
        createdAt: now,
        updatedAt: now,
      );

      final verified = original.copyWith(isEmailVerified: true, biometricEnabled: true);
      expect(verified.isEmailVerified, true);
      expect(verified.biometricEnabled, true);
      expect(verified.uid, 'user_orig');
      expect(verified.fullName, 'Original User');
      expect(verified.referralCode, 'KAT-ORI-1111');
    });
  });
}

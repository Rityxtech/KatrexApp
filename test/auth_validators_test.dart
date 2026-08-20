import 'package:flutter_test/flutter_test.dart';
import 'package:katrexapp/utils/validators.dart';

void main() {
  group('Auth Validators Test Suite', () {
    group('Email Validation', () {
      test('accepts valid email addresses', () {
        expect(Validators.email('test@example.com'), isNull);
        expect(Validators.email('user.name+tag@katrex.io'), isNull);
        expect(Validators.email('admin123@sub.domain.co.uk'), isNull);
      });

      test('rejects empty or null email', () {
        expect(Validators.email(''), isNotNull);
        expect(Validators.email(null), isNotNull);
        expect(Validators.email('   '), isNotNull);
      });

      test('rejects invalid email formats', () {
        expect(Validators.email('plainaddress'), isNotNull);
        expect(Validators.email('@missingusername.com'), isNotNull);
        expect(Validators.email('username@.com'), isNotNull);
        expect(Validators.email('username@com'), isNotNull);
        expect(Validators.email('user..name@domain.com'), isNotNull);
      });
    });

    group('Password Validation', () {
      test('accepts strong passwords (8+ chars, 1 uppercase, 1 number)', () {
        expect(Validators.password('Password123'), isNull);
        expect(Validators.password('StrongPass#2026'), isNull);
        expect(Validators.password('Katrex9999'), isNull);
      });

      test('rejects passwords lacking uppercase, number, or under 8 chars', () {
        expect(Validators.password('pass123'), isNotNull); // under 8 chars
        expect(Validators.password('password123'), isNotNull); // missing uppercase
        expect(Validators.password('PASSWORDABC'), isNotNull); // missing number
        expect(Validators.password(''), isNotNull);
        expect(Validators.password(null), isNotNull);
      });
    });

    group('Confirm Password Validation', () {
      test('passes when confirm password matches password', () {
        expect(Validators.confirmPassword('Secret123', 'Secret123'), isNull);
      });

      test('fails when confirm password does not match password', () {
        expect(Validators.confirmPassword('Secret123', 'Different123'), isNotNull);
        expect(Validators.confirmPassword('', 'Secret123'), isNotNull);
        expect(Validators.confirmPassword(null, 'Secret123'), isNotNull);
      });
    });

    group('Username Validation', () {
      test('accepts valid usernames (4+ chars, alphanumeric + underscore)', () {
        expect(Validators.username('johndoe'), isNull);
        expect(Validators.username('trader_99'), isNull);
        expect(Validators.username('katrex_user'), isNull);
      });

      test('rejects invalid usernames', () {
        expect(Validators.username(''), isNotNull);
        expect(Validators.username('abc'), isNotNull); // Too short (min 4)
        expect(Validators.username('user name'), isNotNull); // Spaces
        expect(Validators.username('user@name'), isNotNull); // Special chars
      });
    });

    group('Phone Number Validation', () {
      test('accepts valid phone numbers', () {
        expect(Validators.phone('08012345678'), isNull);
        expect(Validators.phone('+2348012345678'), isNull);
        expect(Validators.phone('09098765432'), isNull);
      });

      test('rejects invalid phone numbers', () {
        expect(Validators.phone(''), isNotNull);
        expect(Validators.phone('12345'), isNotNull); // Too short
        expect(Validators.phone('abcdefghijk'), isNotNull); // Letters
      });
    });

    group('OTP Validation', () {
      test('accepts 6-digit OTP codes', () {
        expect(Validators.otp('123456'), isNull);
        expect(Validators.otp('987654'), isNull);
      });

      test('rejects invalid OTP codes', () {
        expect(Validators.otp(''), isNotNull);
        expect(Validators.otp('12345'), isNotNull);
        expect(Validators.otp('1234567'), isNotNull);
        expect(Validators.otp('12345A'), isNotNull);
      });
    });
  });
}

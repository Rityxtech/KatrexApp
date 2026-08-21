import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import 'package:katrexapp/models/user_model.dart';
import 'package:katrexapp/providers/auth_provider.dart';
import 'package:katrexapp/screens/login_screen.dart';
import 'package:katrexapp/screens/forgot_password_screen.dart';
import 'package:katrexapp/screens/reset_password_screen.dart';
import 'package:katrexapp/screens/otp_verification_screen.dart';

class _MockAuthProvider extends ChangeNotifier implements AuthProvider {
  @override
  AuthStatus get status => AuthStatus.unauthenticated;
  @override
  UserModel? get userModel => null;
  @override
  User? get firebaseUser => null;
  @override
  String? get errorMessage => null;
  @override
  bool get isAuthenticated => false;
  @override
  bool get isLoading => false;
  @override
  bool get needsRegistration => false;

  @override
  Future<bool> signIn({required String email, required String password}) async => true;

  @override
  Future<bool> register({
    required String fullName,
    required String username,
    required String email,
    required String password,
    String? phone,
    String? referralCode,
    String? referredBy,
  }) async => true;

  @override
  Future<bool> signInWithGoogle() async => true;

  @override
  Future<void> signOut() async {}

  @override
  Future<bool> sendPasswordReset(String email) async => true;

  @override
  Future<bool> sendEmailVerification() async => true;

  @override
  Future<bool> verifyEmailCode(String code) async => true;

  @override
  Future<void> reloadUserProfile() async {}

  Future<void> updateUserProfile(UserModel updated) async {}

  @override
  Future<void> updateUserProfileDirect(UserModel updated) async {}

  @override
  Future<void> changePassword({required String currentPassword, required String newPassword}) async {}

  @override
  void clearError() {}

  void setBiometricEnabled(bool enabled) {}

  void setPinEnabled(bool enabled) {}
}

Widget _createTestWidget(Widget child) {
  return ChangeNotifierProvider<AuthProvider>(
    create: (_) => _MockAuthProvider(),
    child: MaterialApp(
      home: child,
      routes: {
        '/login': (_) => const LoginScreen(),
        '/forgot-password': (_) => const ForgotPasswordScreen(),
        '/reset-password': (_) => const ResetPasswordScreen(),
      },
    ),
  );
}

Future<void> _pumpAuthScreen(WidgetTester tester, Widget widget) async {
  tester.view.physicalSize = const Size(1080, 2400);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  await tester.pumpWidget(_createTestWidget(widget));
  await tester.pump(const Duration(milliseconds: 150));
  await tester.pump(const Duration(milliseconds: 400));
  await tester.pump(const Duration(milliseconds: 450));
  await tester.pump(const Duration(milliseconds: 650));
}

void main() {
  group('Auth Screens Widget Tests', () {
    testWidgets('LoginScreen renders fields, labels, buttons and biometric icon', (tester) async {
      await _pumpAuthScreen(tester, const LoginScreen());

      expect(find.text('Welcome Back'), findsOneWidget);
      expect(find.text('Log In'), findsOneWidget);
      expect(find.text('Sign in with Google'), findsOneWidget);
      expect(find.byIcon(Icons.fingerprint_rounded), findsOneWidget);
    });

    testWidgets('ForgotPasswordScreen renders inputs and handles validation', (tester) async {
      await _pumpAuthScreen(tester, const ForgotPasswordScreen());

      expect(find.text('Forgot Password?'), findsOneWidget);
      expect(find.text('Send Reset Code'), findsOneWidget);

      final sendBtn = find.text('Send Reset Code');
      await tester.tap(sendBtn);
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Email is required'), findsOneWidget);
    });

    testWidgets('ResetPasswordScreen renders inputs and handles validation', (tester) async {
      await _pumpAuthScreen(tester, const ResetPasswordScreen());

      expect(find.text('Reset Password'), findsWidgets);
      expect(find.text('New Password'), findsOneWidget);
      expect(find.text('Confirm Password'), findsOneWidget);

      final resetBtn = find.text('Reset Password').last;
      await tester.tap(resetBtn);
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Password is required'), findsOneWidget);
    });

    testWidgets('OtpVerificationScreen renders 6 digits, resend timer, and verify button', (tester) async {
      await _pumpAuthScreen(tester, const OtpVerificationScreen(email: 'user@katrex.io'));

      expect(find.text('Verify Email'), findsOneWidget);
      expect(find.text('Enter the 6-digit code sent to user@katrex.io.'), findsOneWidget);
      expect(find.text('Verify'), findsOneWidget);
      expect(find.byType(TextField), findsNWidgets(6));

      final verifyBtn = find.text('Verify');
      await tester.tap(verifyBtn);
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('Please enter all 6 digits.'), findsOneWidget);
    });
  });
}

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/transaction_provider.dart';
import '../providers/wallet_provider.dart';
import '../screens/login_screen.dart';
import '../screens/main_shell.dart';
import '../screens/otp_verification_screen.dart';
import '../screens/splash_screen.dart';
import '../services/push_notification_service.dart';

/// Root widget that routes users based on authentication state.
/// Shows SplashScreen while auth status is being determined.
/// Initializes data providers when the user is authenticated.
/// Gates access behind email verification for unverified accounts.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    switch (auth.status) {
      case AuthStatus.uninitialized:
        return const SplashScreen();
      case AuthStatus.loading:
        return Scaffold(
          backgroundColor: Colors.black,
          body: Center(
            child: CircularProgressIndicator(
              color: Colors.white.withOpacity(0.3),
              strokeWidth: 2,
            ),
          ),
        );
      case AuthStatus.authenticated:
        final isEmailVerified = auth.userModel?.isEmailVerified ?? false;
        if (!isEmailVerified) {
          return OtpVerificationScreen(
            email: auth.firebaseUser?.email,
          );
        }
        _initDataProviders(context, auth);
        return const MainShell();
      case AuthStatus.unauthenticated:
        return const LoginScreen();
    }
  }

  void _initDataProviders(BuildContext context, AuthProvider auth) {
    if (auth.firebaseUser == null) return;
    final uid = auth.firebaseUser!.uid;

    // Initialize providers with the user's UID — they'll stream from Firestore.
    context.read<WalletProvider>().init(uid);
    context.read<TransactionProvider>().init(uid);
    context.read<NotificationProvider>().init(uid);

    // Register or update the FCM token to Firestore
    PushNotificationService.instance.registerToken();
  }
}

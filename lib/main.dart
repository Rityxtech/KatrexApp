import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'firebase_options.dart';
import 'providers/auth_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/transaction_provider.dart';
import 'providers/wallet_provider.dart';
import 'providers/p2p_provider.dart';
import 'providers/referral_provider.dart';
import 'screens/login_screen.dart';
import 'screens/reset_password_screen.dart';
import 'services/hd_wallet_service.dart';
import 'services/push_notification_service.dart';
import 'services/trade_fee_service.dart';
import 'utils/api_config.dart';
import 'widgets/auth_gate.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  TradeFeeService.init();
  HdWalletService.init(ApiConfig.hdWalletMnemonic);
  
  // Initialize push notification settings & channel configurations
  await PushNotificationService.instance.init();
  
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => WalletProvider()),
        ChangeNotifierProvider(create: (_) => TransactionProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => P2PProvider()),
        ChangeNotifierProvider(create: (_) => ReferralProvider()),
      ],
      child: MaterialApp(
        title: 'KatrexApp',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          textTheme: GoogleFonts.plusJakartaSansTextTheme(),
        ),
        home: Builder(
          builder: (context) {
            final status = context.watch<AuthProvider>().status;
            return AuthGate(key: ValueKey(status));
          },
        ),
        routes: {
          '/login': (_) => const LoginScreen(),
          '/reset-password': (_) => const ResetPasswordScreen(),
        },
      ),
    );
  }
}

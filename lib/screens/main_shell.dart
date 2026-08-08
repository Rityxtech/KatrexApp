import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../widgets/app_background.dart';
import '../widgets/shared_bottom_nav.dart';
import 'trade_screen.dart';
import 'dashboard_screen.dart';
import 'transaction_history_screen.dart';
import 'customer_support_screen.dart';
import 'wallet_screen.dart';

class MainShell extends StatefulWidget {
  const MainShell({super.key});

  @override
  State<MainShell> createState() => _MainShellState();
}

class _MainShellState extends State<MainShell> {
  int _selectedIndex = 0;

  void _onTabSwitch(int index) {
    if (index == _selectedIndex) return;
    setState(() => _selectedIndex = index);
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final maxWidth = min(430.0, size.width);
    final bottomPadding = MediaQuery.paddingOf(context).bottom;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
      ),
      child: PopScope(
        canPop: false,
        child: Scaffold(
        backgroundColor: const Color(0xFF000000),
        resizeToAvoidBottomInset: false,
        body: Stack(
          fit: StackFit.expand,
          children: [
            const AppBackground(child: SizedBox.expand()),
            Center(
              child: SizedBox(
                width: maxWidth,
                child: IndexedStack(
                  index: _selectedIndex,
                  children: [
                    DashboardScreen(onTabSwitch: _onTabSwitch),
                    WalletScreen(onTabSwitch: _onTabSwitch),
                    TradeScreen(onTabSwitch: _onTabSwitch),
                    TransactionHistoryScreen(onTabSwitch: _onTabSwitch),
                    CustomerSupportScreen(onTabSwitch: _onTabSwitch),
                  ],
                ),
              ),
            ),
            Positioned(
              left: 16,
              right: 16,
              bottom: 10 + bottomPadding,
              child: Center(
                child: SizedBox(
                  width: maxWidth,
                  child: SharedBottomNav(
                    selectedIndex: _selectedIndex,
                    onTap: _onTabSwitch,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}

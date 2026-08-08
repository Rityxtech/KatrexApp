import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import 'edit_profile_screen.dart';
import 'notifications_screen.dart';
import 'profile_modals.dart';

class ProfileScreen extends StatefulWidget {
  final ValueChanged<int>? onTabSwitch;
  const ProfileScreen({super.key, this.onTabSwitch});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _pushNotifications = true;
  bool _biometricLogin = false;

  String _currencySymbol(String code) {
    switch (code) {
      case 'USD': return '\$';
      case 'EUR': return '\u20AC';
      case 'GBP': return '\u00A3';
      case 'GHS': return '\u20B5';
      case 'KES': return 'KSh';
      default: return '\u20A6';
    }
  }

  Widget _headerBtn({required IconData icon, required VoidCallback onTap}) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Icon(icon, color: Colors.white, size: 18),
    ),
  );

  Widget _glassCard({required Widget child, double radius = 16}) => ClipRRect(
    borderRadius: BorderRadius.circular(radius),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: child,
      ),
    ),
  );

  Widget _sectionTitle(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(
      text,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 14,
        fontWeight: FontWeight.w800,
        color: Colors.white,
      ),
    ),
  );

  Widget _toggle({required bool value, required ValueChanged<bool> onChanged}) => GestureDetector(
    onTap: () => onChanged(!value),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 250),
      width: 36, height: 20,
      padding: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: value ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
      ),
      child: AnimatedAlign(
        duration: const Duration(milliseconds: 250),
        alignment: value ? Alignment.centerRight : Alignment.centerLeft,
        child: Container(width: 16, height: 16, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
      ),
    ),
  );

  Widget _menuItem({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required String title,
    String? subtitle,
    Widget? trailing,
    bool showDivider = true,
    VoidCallback? onTap,
  }) => Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: onTap,
      highlightColor: Colors.white.withOpacity(0.05),
      splashColor: Colors.white.withOpacity(0.08),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: showDivider ? BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05)))) : null,
        child: Row(
          children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color: bgColor.withOpacity(0.15),
                shape: BoxShape.circle,
                border: Border.all(color: bgColor.withOpacity(0.2)),
              ),
              child: Icon(icon, color: iconColor, size: 12),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ],
                ],
              ),
            ),
            trailing ?? const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 14),
          ],
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthProvider>().userModel;
    final currencySymbol = _currencySymbol(user?.defaultCurrency ?? 'NGN');
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _headerBtn(icon: Icons.chevron_left_rounded, onTap: () => widget.onTabSwitch?.call(0)),
                      Text('Profile', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                      const NotificationIcon(),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildProfileBanner(),
                  const SizedBox(height: 140),
                  _sectionTitle('Account & Security'),
                  _glassCard(
                    child: Column(
                      children: [
                        _menuItem(
                          icon: Icons.person_outline_rounded,
                          iconColor: const Color(0xFF3B82F6),
                          bgColor: const Color(0xFF3B82F6),
                          title: 'Personal Information',
                          subtitle: 'Edit name, email, phone',
                          onTap: () => showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => const EditProfileScreen(),
                          ),
                        ),
                        _menuItem(
                          icon: Icons.shield_outlined,
                          iconColor: const Color(0xFFA855F7),
                          bgColor: const Color(0xFFA855F7),
                          title: 'Security Settings',
                          subtitle: 'Password, 2FA, PIN',
                          onTap: () => showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => const SecuritySettingsModal(),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFFEF4444), shape: BoxShape.circle)),
                              const SizedBox(width: 8),
                              const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 14),
                            ],
                          ),
                        ),
                        _menuItem(
                          icon: Icons.badge_outlined,
                          iconColor: const Color(0xFF10B981),
                          bgColor: const Color(0xFF10B981),
                          title: 'KYC Verification',
                          subtitle: 'Increase transaction limits',
                          showDivider: false,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('Finance'),
                  _glassCard(
                    child: Column(
                      children: [
                        _menuItem(
                          icon: Icons.account_balance_outlined,
                          iconColor: const Color(0xFFF59E0B),
                          bgColor: const Color(0xFFF59E0B),
                          title: 'Payment Methods',
                          subtitle: 'Bank accounts & cards',
                          onTap: () => showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => const PaymentMethodsModal(),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('${user?.paymentMethods.length ?? 0} Added', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                              const SizedBox(width: 8),
                              const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 14),
                            ],
                          ),
                        ),
                        _menuItem(
                          icon: Icons.trending_up_rounded,
                          iconColor: const Color(0xFF3B82F6),
                          bgColor: const Color(0xFF3B82F6),
                          title: 'Default Currency',
                          subtitle: 'Primary display currency',
                          showDivider: false,
                          onTap: () => showModalBottomSheet(
                            context: context,
                            isScrollControlled: true,
                            backgroundColor: Colors.transparent,
                            builder: (_) => const DefaultCurrencyModal(),
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('${user?.defaultCurrency ?? 'NGN'} ($currencySymbol)', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                              const SizedBox(width: 4),
                              const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 14),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('Preferences'),
                  _glassCard(
                    child: Column(
                      children: [
                        _menuItem(
                          icon: Icons.notifications_none_rounded,
                          iconColor: const Color(0xFF9CA3AF),
                          bgColor: const Color(0xFFFFFFFF),
                          title: 'Push Notifications',
                          subtitle: 'Updates on trades & deposits',
                          trailing: _toggle(
                            value: _pushNotifications,
                            onChanged: (v) => setState(() => _pushNotifications = v),
                          ),
                        ),
                        _menuItem(
                          icon: Icons.fingerprint_rounded,
                          iconColor: const Color(0xFF9CA3AF),
                          bgColor: const Color(0xFFFFFFFF),
                          title: 'Biometric Login',
                          subtitle: 'Face ID / Touch ID',
                          showDivider: false,
                          trailing: _toggle(
                            value: _biometricLogin,
                            onChanged: (v) => setState(() => _biometricLogin = v),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  _sectionTitle('More'),
                  _glassCard(
                    child: Column(
                      children: [
                        _menuItem(
                          icon: Icons.help_outline_rounded,
                          iconColor: const Color(0xFF9CA3AF),
                          bgColor: const Color(0xFFFFFFFF),
                          title: 'Help Center',
                        ),
                        _menuItem(
                          icon: Icons.description_outlined,
                          iconColor: const Color(0xFF9CA3AF),
                          bgColor: const Color(0xFFFFFFFF),
                          title: 'Terms of Service',
                        ),
                        Material(
                          color: const Color(0xFFEF4444).withOpacity(0.05),
                          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                          child: InkWell(
                            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                            onTap: () async {
                              final navigator = Navigator.of(context);
                              final messenger = ScaffoldMessenger.of(context);
                              try {
                                await context.read<AuthProvider>().signOut();
                                navigator.pushNamedAndRemoveUntil(
                                  '/login',
                                  (route) => false,
                                );
                              } catch (e) {
                                messenger.showSnackBar(
                                  SnackBar(
                                    content: Text('Failed to log out: $e',
                                        style: GoogleFonts.plusJakartaSans()),
                                    backgroundColor: const Color(0xFFEF4444),
                                  ),
                                );
                              }
                            },
                            child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            decoration: BoxDecoration(
                              border: Border(top: BorderSide(color: const Color(0xFFEF4444).withOpacity(0.3))),
                              color: const Color(0xFFEF4444).withOpacity(0.05),
                              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 28, height: 28,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444).withOpacity(0.15),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                                  ),
                                  child: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444), size: 12),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text('Log Out', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFFEF4444))),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    ),
  ),
],
),
);
  }

  Widget _buildProfileBanner() {
    return Stack(
      clipBehavior: Clip.none,
      alignment: Alignment.topCenter,
      children: [
        _glassCard(
          radius: 20,
          child: Container(
            height: 80,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFF3B82F6).withOpacity(0.15),
                  const Color(0xFFA855F7).withOpacity(0.1),
                ],
              ),
            ),
            child: Stack(
              children: [
                Positioned(top: -20, right: -20, child: Container(width: 80, height: 80, decoration: BoxDecoration(color: const Color(0xFF3B82F6).withOpacity(0.3), shape: BoxShape.circle), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20), child: Container(color: Colors.transparent)))),
                Positioned(bottom: -20, left: -20, child: Container(width: 80, height: 80, decoration: BoxDecoration(color: const Color(0xFFA855F7).withOpacity(0.2), shape: BoxShape.circle), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20), child: Container(color: Colors.transparent)))),
              ],
            ),
          ),
        ),
        Positioned(
          top: 38,
          child: Column(
            children: [
              Stack(
                children: [
                  Container(
                    width: 84, height: 84,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF000000), width: 3),
                      color: const Color(0xFF0A0F1F),
                    ),
                    child: ClipOval(
                      child: (context.watch<AuthProvider>().userModel?.avatarUrl != null &&
                              context.watch<AuthProvider>().userModel!.avatarUrl!.isNotEmpty)
                          ? Image.network(
                              context.watch<AuthProvider>().userModel!.avatarUrl!,
                              width: 84, height: 84, fit: BoxFit.cover,
                              errorBuilder: (_, __, ___) => const Icon(Icons.person, color: Colors.white, size: 36),
                            )
                          : const Icon(Icons.person, color: Colors.white, size: 36),
                    ),
                  ),
                  Positioned(
                    bottom: 0, right: 0,
                    child: Container(
                      width: 28, height: 28,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        shape: BoxShape.circle,
                        border: Border.all(color: const Color(0xFF000000), width: 2.5),
                      ),
                      child: const Icon(Icons.camera_alt_rounded, color: Colors.white, size: 12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                context.watch<AuthProvider>().userModel?.fullName ?? 'User',
                style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
              ),
              const SizedBox(height: 2),
              Text(
                context.watch<AuthProvider>().userModel?.email ?? '',
                style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 11),
                        const SizedBox(width: 4),
                        Text(
                          context.watch<AuthProvider>().userModel?.kycTier == 2
                              ? 'Tier 2 Verified'
                              : context.watch<AuthProvider>().userModel?.kycTier == 1
                                  ? 'Tier 1 Verified'
                                  : 'Unverified',
                          style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF10B981)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          context.watch<AuthProvider>().userModel?.referralCode ?? 'KAT-XXX',
                          style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF)),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.copy_rounded, color: Color(0xFF6B7280), size: 11),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:local_auth/local_auth.dart';
import 'package:image_picker/image_picker.dart';

import '../providers/auth_provider.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../services/storage_service.dart';
import '../services/push_notification_service.dart';
import '../services/biometric_auth_service.dart';
import 'edit_profile_screen.dart';
import 'kyc_verification_screen.dart';
import 'notifications_screen.dart';
import 'profile_modals.dart';
import 'help_center_screen.dart';
import 'terms_screen.dart';
import '../widgets/profile_completion_modal.dart';
import '../widgets/right_slide_panel.dart';
import '../widgets/app_avatar.dart';

class ProfileScreen extends StatefulWidget {
  final ValueChanged<int>? onTabSwitch;
  const ProfileScreen({super.key, this.onTabSwitch});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  bool _pushNotifications = true;
  bool _biometricLogin = false;
  bool _isUploadingAvatar = false;
  final LocalAuthentication _localAuth = LocalAuthentication();

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().userModel;
    if (user != null) {
      _pushNotifications = user.pushNotificationsEnabled;
      _checkBiometricsSync(user);
    }
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ProfileCompletionModal.maybeShow(context);
      }
    });
  }

  Future<void> _checkBiometricsSync(UserModel user) async {
    final isActive = await BiometricAuthService.isBiometricActiveFor(user.email, auth: _localAuth);
    if (!mounted) return;
    if (isActive) {
      setState(() => _biometricLogin = true);
      if (!user.biometricEnabled) {
        final auth = context.read<AuthProvider>();
        await auth.updateUserProfileDirect(user.copyWith(biometricEnabled: true));
      }
    } else {
      setState(() => _biometricLogin = false);
      // Auto-detect when fingerprint credentials are not active on this device and auto-toggle off
      if (user.biometricEnabled) {
        final auth = context.read<AuthProvider>();
        await auth.updateUserProfileDirect(user.copyWith(biometricEnabled: false));
      }
    }
  }

  Future<void> _pickAndUploadAvatar() async {
    if (_isUploadingAvatar) return;
    final picker = ImagePicker();
    try {
      final pickedFile = await picker.pickImage(
        source: ImageSource.gallery,
        imageQuality: 70,
        maxWidth: 512,
        maxHeight: 512,
      );

      if (pickedFile == null) return;

      setState(() => _isUploadingAvatar = true);

      final auth = context.read<AuthProvider>();
      final uid = auth.firebaseUser!.uid;

      final downloadUrl = await StorageService().uploadAvatar(
        uid: uid,
        filePath: pickedFile.path,
      );

      final user = auth.userModel;
      if (user != null) {
        await auth.updateUserProfileDirect(
          user.copyWith(
            avatarUrl: downloadUrl,
            updatedAt: DateTime.now(),
          ),
        );
      }

      if (mounted) {
        _showSuccess('Avatar updated successfully');
      }
    } catch (e) {
      if (mounted) {
        _showError('Failed to upload avatar: $e');
      }
    } finally {
      if (mounted) setState(() => _isUploadingAvatar = false);
    }
  }

  Future<void> _toggleBiometrics(bool enable) async {
    if (enable) {
      try {
        final isSupported = await BiometricAuthService.isHardwareSupported(auth: _localAuth);
        if (!isSupported) {
          _showError('Biometric authentication is not supported on this device.');
          return;
        }

        final auth = context.read<AuthProvider>();
        final u = auth.userModel;
        if (u == null) return;

        final hasCreds = await BiometricAuthService.hasValidCredentialsFor(u.email);
        String? passToSave;
        if (!hasCreds) {
          passToSave = await _promptPasswordForBiometrics(context, u.email);
          if (passToSave == null || passToSave.isEmpty) {
            return; // Cancelled
          }
        }

        final authenticated = await _localAuth.authenticate(
          localizedReason: 'Enable biometric login for ${u.email}',
          biometricOnly: true,
        );

        if (authenticated) {
          if (passToSave != null) {
            await BiometricAuthService.saveCredentials(email: u.email, password: passToSave);
          }
          setState(() => _biometricLogin = true);
          await auth.updateUserProfileDirect(u.copyWith(biometricEnabled: true));
          _showSuccess('Biometric login enabled');
        } else {
          _showError('Biometric verification failed.');
        }
      } catch (e) {
        _showError('Failed to enable biometric login: $e');
      }
    } else {
      setState(() => _biometricLogin = false);
      await BiometricAuthService.clearCredentials();
      final auth = context.read<AuthProvider>();
      final u = auth.userModel;
      if (u != null) {
        await auth.updateUserProfileDirect(u.copyWith(biometricEnabled: false));
        _showSuccess('Biometric login disabled');
      }
    }
  }

  Future<String?> _promptPasswordForBiometrics(BuildContext context, String email) async {
    final passCtrl = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F1423),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: const BorderSide(color: Color(0x1AFFFFFF))),
        title: Text('Enable Biometric Login', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Enter your account password to enable quick 1-tap fingerprint login.', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF9CA3AF), fontSize: 13)),
            const SizedBox(height: 16),
            TextField(
              controller: passCtrl,
              obscureText: true,
              style: GoogleFonts.plusJakartaSans(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                hintText: 'Password',
                hintStyle: GoogleFonts.plusJakartaSans(color: Colors.white30),
                filled: true,
                fillColor: Colors.white.withOpacity(0.05),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: Text('Cancel', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF9CA3AF))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
            onPressed: () => Navigator.pop(ctx, passCtrl.text),
            child: Text('Save', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.plusJakartaSans()),
        backgroundColor: const Color(0xFFEF4444),
      ),
    );
  }

  void _showSuccess(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.plusJakartaSans()),
        backgroundColor: const Color(0xFF10B981),
      ),
    );
  }

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
    behavior: HitTestBehavior.opaque,
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
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
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
                      _headerBtn(
                        icon: Icons.chevron_left_rounded,
                        onTap: () {
                          if (Navigator.canPop(context)) {
                            Navigator.pop(context);
                          } else {
                            widget.onTabSwitch?.call(0);
                          }
                        },
                      ),
                      Text('Profile', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                      const NotificationIcon(),
                    ],
                  ),
                ),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildProfileBanner(),
                        const SizedBox(height: 16),
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
                        Builder(builder: (context) {
                          final isVerified = (user?.kycTier ?? 0) > 0;
                          final badgeColor = isVerified ? const Color(0xFF10B981) : const Color(0xFFEF4444);
                          return _menuItem(
                            icon: Icons.badge_outlined,
                            iconColor: badgeColor,
                            bgColor: badgeColor,
                            title: 'KYC Verification',
                            subtitle: isVerified ? 'Tier ${user?.kycTier} Verified' : 'Increase transaction limits',
                            showDivider: false,
                            onTap: () => RightSlidePanel.show(
                              context,
                              title: 'KYC Verification',
                              child: const KycVerificationScreen(),
                            ),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: badgeColor.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: badgeColor.withOpacity(0.25)),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(
                                        isVerified ? Icons.check_circle_rounded : Icons.cancel_rounded,
                                        color: badgeColor,
                                        size: 13,
                                      ),
                                      const SizedBox(width: 4),
                                      Text(
                                        isVerified ? 'Tier ${user?.kycTier}' : 'Unverified',
                                        style: GoogleFonts.plusJakartaSans(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w800,
                                          color: badgeColor,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.chevron_right_rounded, color: Colors.white24, size: 14),
                              ],
                            ),
                          );
                        }),
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
                            onChanged: (v) async {
                              setState(() => _pushNotifications = v);
                              final auth = context.read<AuthProvider>();
                              final u = auth.userModel;
                              if (u != null) {
                                await auth.updateUserProfileDirect(u.copyWith(pushNotificationsEnabled: v));
                                await PushNotificationService.instance.setPushEnabled(v);
                              }
                            },
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
                            onChanged: _toggleBiometrics,
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
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const HelpCenterScreen())),
                        ),
                        _menuItem(
                          icon: Icons.description_outlined,
                          iconColor: const Color(0xFF9CA3AF),
                          bgColor: const Color(0xFFFFFFFF),
                          title: 'Terms of Service',
                          showDivider: false,
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TermsScreen())),
                        ),
                        Material(
                          color: const Color(0xFFEF4444).withOpacity(0.05),
                          borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                          child: InkWell(
                            borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                            onTap: () async {
                              final messenger = ScaffoldMessenger.of(context);
                              try {
                                Navigator.of(context).popUntil((route) => route.isFirst);
                                await context.read<AuthProvider>().signOut();
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
    return Column(
      children: [
        SizedBox(
          height: 122,
          child: Stack(
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
                      Positioned(
                        top: -20,
                        right: -20,
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: const Color(0xFF3B82F6).withOpacity(0.3),
                            shape: BoxShape.circle,
                          ),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                            child: Container(color: Colors.transparent),
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: -20,
                        left: -20,
                        child: Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: const Color(0xFFA855F7).withOpacity(0.2),
                            shape: BoxShape.circle,
                          ),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
                            child: Container(color: Colors.transparent),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Positioned(
                top: 38,
                child: GestureDetector(
                  onTap: _isUploadingAvatar ? null : _pickAndUploadAvatar,
                  child: Stack(
                    children: [
                      Container(
                        width: 84,
                        height: 84,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFF000000), width: 3),
                          color: const Color(0xFF0A0F1F),
                        ),
                        child: ClipOval(
                          child: _isUploadingAvatar
                              ? const Center(
                                  child: SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                  ),
                                )
                              : AppAvatar(
                                  avatarUrl: context.watch<AuthProvider>().userModel?.avatarUrl,
                                  size: 84,
                                  fallback: const Icon(Icons.person, color: Colors.white, size: 36),
                                ),
                        ),
                      ),
                      if (!_isUploadingAvatar)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            width: 28,
                            height: 28,
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
                ),
              ),
            ],
          ),
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
        Builder(builder: (context) {
          final kycTier = context.watch<AuthProvider>().userModel?.kycTier ?? 0;
          final isVerified = kycTier > 0;
          final statusColor = isVerified ? const Color(0xFF10B981) : const Color(0xFFEF4444);
          final statusText = kycTier == 2
              ? 'Tier 2 Verified'
              : kycTier == 1
                  ? 'Tier 1 Verified'
                  : 'Unverified';
          final statusIcon = isVerified ? Icons.check_circle_rounded : Icons.cancel_rounded;

          return Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: statusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: statusColor.withOpacity(0.25)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(statusIcon, color: statusColor, size: 12),
                    const SizedBox(width: 4),
                    Text(
                      statusText,
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: statusColor),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {
                  final code = context.read<AuthProvider>().userModel?.referralCode ?? '';
                  if (code.isNotEmpty) {
                    Clipboard.setData(ClipboardData(text: code));
                    _showSuccess('Referral code copied!');
                  }
                },
                child: Container(
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
              ),
            ],
          );
        }),
      ],
    );
  }
}

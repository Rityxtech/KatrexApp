import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart' as app_auth;
import '../services/cloud_functions_service.dart';
import '../services/firestore_service.dart';
import '../widgets/pin_input_sheet.dart';

class _ModalShell extends StatelessWidget {
  final String title;
  final Widget child;
  const _ModalShell({required this.title, required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0A0F1F),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 8),
            Container(
              width: 40, height: 4,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: const Center(child: Icon(Icons.close_rounded, color: Colors.white, size: 16)),
                    ),
                  ),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                child: child,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Widget _label(String text) => Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
    );

Widget _textField(TextEditingController controller, String hint, {TextInputType? keyboardType, bool obscure = false}) {
  return Container(
    decoration: BoxDecoration(
      color: Colors.white.withOpacity(0.05),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: Colors.white.withOpacity(0.1)),
    ),
    child: TextField(
      controller: controller,
      keyboardType: keyboardType,
      obscureText: obscure,
      style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w500, color: Colors.white38),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: InputBorder.none,
      ),
    ),
  );
}

Widget _sectionLabel(String text) => Padding(
      padding: const EdgeInsets.only(top: 8, bottom: 8),
      child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
    );

Widget _saveButton(String label, bool isSaving, VoidCallback? onTap) {
  return GestureDetector(
    onTap: isSaving ? null : onTap,
    child: Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF2563EB),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 25, offset: const Offset(0, 4))],
      ),
      child: Center(
        child: isSaving
            ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
      ),
    ),
  );
}

Widget _toggleRow({
  required IconData icon,
  required Color iconColor,
  required Color bgColor,
  required String title,
  required String subtitle,
  required bool value,
  required ValueChanged<bool> onChanged,
  bool showDivider = true,
}) {
  return Container(
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
              const SizedBox(height: 2),
              Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ],
          ),
        ),
        GestureDetector(
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
        ),
      ],
    ),
  );
}

// ─── Security Settings Modal ──────────────────────────────────────

class SecuritySettingsModal extends StatefulWidget {
  const SecuritySettingsModal({super.key});
  @override
  State<SecuritySettingsModal> createState() => _SecuritySettingsModalState();
}

class _SecuritySettingsModalState extends State<SecuritySettingsModal> {
  late bool _twoFactorEnabled;
  late bool _pinEnabled;
  final _currentPassController = TextEditingController();
  final _newPassController = TextEditingController();
  final _confirmPassController = TextEditingController();
  bool _isSaving = false;
  bool _isToggling = false;

  @override
  void initState() {
    super.initState();
    final user = context.read<app_auth.AuthProvider>().userModel;
    _twoFactorEnabled = user?.twoFactorEnabled ?? false;
    _pinEnabled = user?.pinEnabled ?? false;
  }

  @override
  void dispose() {
    _currentPassController.dispose();
    _newPassController.dispose();
    _confirmPassController.dispose();
    super.dispose();
  }

  Future<void> _saveToggles() async {
    if (_isToggling) return;
    setState(() => _isToggling = true);
    try {
      final auth = context.read<app_auth.AuthProvider>();
      final user = auth.userModel;
      if (user == null) return;
      await auth.updateUserProfileDirect(
        user.copyWith(
          twoFactorEnabled: _twoFactorEnabled,
          pinEnabled: _pinEnabled,
          updatedAt: DateTime.now(),
        ),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update settings: $e', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isToggling = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Security Settings',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Change Password'),
          _label('Current Password'),
          _textField(_currentPassController, 'Enter current password', obscure: true),
          const SizedBox(height: 16),
          _label('New Password'),
          _textField(_newPassController, 'Enter new password', obscure: true),
          const SizedBox(height: 16),
          _label('Confirm New Password'),
          _textField(_confirmPassController, 'Confirm new password', obscure: true),
          const SizedBox(height: 16),
          _saveButton('Update Password', _isSaving, () async {
            final current = _currentPassController.text.trim();
            final newPass = _newPassController.text.trim();
            final confirm = _confirmPassController.text.trim();

            if (current.isEmpty || newPass.isEmpty || confirm.isEmpty) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Please fill in all password fields', style: GoogleFonts.plusJakartaSans()),
                  backgroundColor: const Color(0xFFEF4444),
                ),
              );
              return;
            }
            if (newPass != confirm) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('New passwords do not match', style: GoogleFonts.plusJakartaSans()),
                  backgroundColor: const Color(0xFFEF4444),
                ),
              );
              return;
            }

            setState(() => _isSaving = true);
            final messenger = ScaffoldMessenger.of(context);
            try {
              await context.read<app_auth.AuthProvider>().changePassword(
                currentPassword: current,
                newPassword: newPass,
              );
              if (mounted) {
                _currentPassController.clear();
                _newPassController.clear();
                _confirmPassController.clear();
                messenger.showSnackBar(
                  SnackBar(
                    content: Text('Password updated successfully', style: GoogleFonts.plusJakartaSans()),
                    backgroundColor: const Color(0xFF10B981),
                  ),
                );
              }
            } on FirebaseAuthException catch (e) {
              if (mounted) {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text(e.message ?? 'Authentication error', style: GoogleFonts.plusJakartaSans()),
                    backgroundColor: const Color(0xFFEF4444),
                  ),
                );
              }
            } catch (e) {
              if (mounted) {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text('Failed to update password: $e', style: GoogleFonts.plusJakartaSans()),
                    backgroundColor: const Color(0xFFEF4444),
                  ),
                );
              }
            } finally {
              if (mounted) setState(() => _isSaving = false);
            }
          }),
          const SizedBox(height: 24),
          _sectionLabel('Two-Factor Authentication'),
          _toggleRow(
            icon: Icons.security_rounded,
            iconColor: const Color(0xFFA855F7),
            bgColor: const Color(0xFFA855F7),
            title: '2FA via Authenticator App',
            subtitle: 'Add an extra layer of security',
            value: _twoFactorEnabled,
            onChanged: (v) {
              setState(() => _twoFactorEnabled = v);
              _saveToggles();
            },
          ),
          const SizedBox(height: 16),
          _sectionLabel('Transaction PIN'),
          _toggleRow(
            icon: Icons.lock_outline_rounded,
            iconColor: const Color(0xFFF59E0B),
            bgColor: const Color(0xFFF59E0B),
            title: 'PIN for Transactions',
            subtitle: 'Require PIN for transfers & trades',
            value: _pinEnabled,
            onChanged: (v) async {
              if (v) {
                final passed = await PinInputSheet.ensurePinRequired(context);
                if (passed) {
                  setState(() => _pinEnabled = true);
                  await _saveToggles();
                } else {
                  setState(() => _pinEnabled = false);
                }
              } else {
                final passed = await PinInputSheet.verify(context);
                if (passed) {
                  setState(() => _pinEnabled = false);
                  await _saveToggles();
                } else {
                  setState(() => _pinEnabled = true);
                }
              }
            },
            showDivider: false,
          ),
        ],
      ),
    );
  }
}

// ─── Add Bank Account Modal (Direct Bottom Sheet) ────────────────────────────

class AddBankAccountModal extends StatefulWidget {
  const AddBankAccountModal({super.key});

  @override
  State<AddBankAccountModal> createState() => _AddBankAccountModalState();
}

class _AddBankAccountModalState extends State<AddBankAccountModal> {
  final _bankNameController = TextEditingController();
  final _accountNumberController = TextEditingController();
  final _accountNameController = TextEditingController();
  bool _isSaving = false;
  String? _errorMessage;

  @override
  void dispose() {
    _bankNameController.dispose();
    _accountNumberController.dispose();
    _accountNameController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    final bankName = _bankNameController.text.trim();
    final accountNumber = _accountNumberController.text.trim();
    final accountName = _accountNameController.text.trim();

    if (bankName.isEmpty) {
      setState(() => _errorMessage = 'Please enter your bank name');
      return;
    }
    if (accountNumber.length != 10 || int.tryParse(accountNumber) == null) {
      setState(() => _errorMessage = 'Account number must be 10 digits');
      return;
    }
    if (accountName.isEmpty) {
      setState(() => _errorMessage = 'Please enter the account name');
      return;
    }

    final user = context.read<app_auth.AuthProvider>().userModel;
    final uid = context.read<app_auth.AuthProvider>().firebaseUser?.uid;
    if (user == null || uid == null) return;

    if (user.paymentMethods.length >= 3) {
      setState(() => _errorMessage = 'Maximum of 3 accounts reached. Delete one first.');
      return;
    }

    setState(() {
      _isSaving = true;
      _errorMessage = null;
    });

    try {
      await FirestoreService().addBankAccount(
        uid: uid,
        bankName: bankName,
        accountNumber: accountNumber,
        accountName: accountName,
      );

      try {
        await CloudFunctionsService.saveBankAccount(
          bankName: bankName,
          accountNumber: accountNumber,
          accountName: accountName,
        );
      } catch (_) {}

      if (mounted) {
        Navigator.pop(context, true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Bank account linked successfully',
              style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSaving = false;
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<app_auth.AuthProvider>().userModel;
    final count = user?.paymentMethods.length ?? 0;
    final isLimitReached = count >= 3;

    return _ModalShell(
      title: 'Add Bank Account',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Personal Account Details',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isLimitReached
                      ? const Color(0xFFEF4444).withOpacity(0.12)
                      : const Color(0xFF2563EB).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '$count/3 Accounts',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isLimitReached ? const Color(0xFFEF4444) : const Color(0xFF60A5FA),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          if (isLimitReached)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 16, color: Color(0xFFEF4444)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'You have reached the maximum limit of 3 bank accounts. Please remove an existing account to add a new one.',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFFEF4444),
                      ),
                    ),
                  ),
                ],
              ),
            ),

          _buildField(
            controller: _bankNameController,
            label: 'Bank Name',
            hint: 'e.g. GTBank, Kuda, Access Bank, Zenith',
            icon: Icons.account_balance_rounded,
            enabled: !isLimitReached && !_isSaving,
          ),
          const SizedBox(height: 14),

          _buildField(
            controller: _accountNumberController,
            label: '10-Digit Account Number',
            hint: '0123456789',
            icon: Icons.tag_rounded,
            keyboardType: TextInputType.number,
            maxLength: 10,
            enabled: !isLimitReached && !_isSaving,
          ),
          const SizedBox(height: 14),

          _buildField(
            controller: _accountNameController,
            label: 'Account Name',
            hint: 'e.g. John Doe (must match your KYC name)',
            icon: Icons.person_outline_rounded,
            enabled: !isLimitReached && !_isSaving,
          ),

          if (_errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              _errorMessage!,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: const Color(0xFFEF4444),
              ),
            ),
          ],

          const SizedBox(height: 20),

          GestureDetector(
            onTap: (isLimitReached || _isSaving) ? null : _handleSave,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: isLimitReached ? const Color(0xFF1E293B) : const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(14),
                boxShadow: !isLimitReached
                    ? [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : [],
              ),
              child: Center(
                child: _isSaving
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : Text(
                        isLimitReached ? 'Account Limit Reached (3/3)' : 'Save & Link Account',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w900,
                          color: isLimitReached ? const Color(0xFF6B7280) : Colors.white,
                        ),
                      ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  Widget _buildField({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    int? maxLength,
    bool enabled = true,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 12,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF9CA3AF),
          ),
        ),
        const SizedBox(height: 6),
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: TextField(
            controller: controller,
            keyboardType: keyboardType,
            maxLength: maxLength,
            enabled: enabled,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Colors.white,
            ),
            decoration: InputDecoration(
              counterText: '',
              hintText: hint,
              hintStyle: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: Colors.white24,
              ),
              prefixIcon: Icon(icon, color: const Color(0xFF60A5FA), size: 18),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Payment Methods Modal (List & Manage) ────────────────────────────

class PaymentMethodsModal extends StatefulWidget {
  const PaymentMethodsModal({super.key});

  @override
  State<PaymentMethodsModal> createState() => _PaymentMethodsModalState();
}

class _PaymentMethodsModalState extends State<PaymentMethodsModal> {
  bool _isLoading = false;

  Future<void> _confirmRemove(Map<String, dynamic> method) async {
    final bankName = method['bankName'] as String? ?? 'Bank Account';
    final accountNumber = method['accountNumber'] as String? ?? '';

    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0F1423),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
        ),
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.white24,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 18),
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFFEF4444).withOpacity(0.12),
                ),
                child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 24),
              ),
              const SizedBox(height: 12),
              Text(
                'Remove Bank Account?',
                style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
              ),
              const SizedBox(height: 6),
              Text(
                'Are you sure you want to remove $bankName ($accountNumber)?',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(fontSize: 12.5, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(ctx, false),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Cancel',
                            style: GoogleFonts.plusJakartaSans(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white70),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(ctx, true),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Remove',
                            style: GoogleFonts.plusJakartaSans(fontSize: 13.5, fontWeight: FontWeight.w900, color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );

    if (confirmed == true) {
      await _executeRemove(accountNumber);
    }
  }

  Future<void> _executeRemove(String accountNumber) async {
    final auth = context.read<app_auth.AuthProvider>();
    final uid = auth.firebaseUser?.uid;
    if (uid == null) return;

    setState(() => _isLoading = true);
    try {
      await FirestoreService().removeBankAccount(uid: uid, accountNumber: accountNumber);
      try {
        await CloudFunctionsService.removeBankAccount(accountNumber: accountNumber);
      } catch (_) {}
      await auth.reloadUserProfile();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Bank account removed', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to remove: $e', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openDirectAddModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddBankAccountModal(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<app_auth.AuthProvider>().userModel;
    final methods = List<Map<String, dynamic>>.from(user?.paymentMethods ?? []);
    final count = methods.length;
    final isLimitReached = count >= 3;

    return _ModalShell(
      title: 'Payment Methods',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Linked Bank Accounts',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isLimitReached
                      ? const Color(0xFFEF4444).withOpacity(0.12)
                      : const Color(0xFF2563EB).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '$count/3 Linked',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: isLimitReached ? const Color(0xFFEF4444) : const Color(0xFF60A5FA),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          if (methods.isEmpty && !_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Column(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF2563EB).withOpacity(0.1),
                      ),
                      child: const Icon(Icons.account_balance_rounded, color: Color(0xFF60A5FA), size: 22),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'No bank accounts linked yet',
                      style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Link up to 3 accounts for quick withdrawals',
                      style: GoogleFonts.plusJakartaSans(fontSize: 11.5, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)),
                    ),
                  ],
                ),
              ),
            )
          else
            ...methods.map((m) {
              final bankName = m['bankName'] as String? ?? 'Bank Account';
              final accountNumber = m['accountNumber'] as String? ?? '';
              final accountName = m['accountName'] as String? ?? '';
              final initial = bankName.isNotEmpty ? bankName[0].toUpperCase() : 'B';

              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF1E3A8A).withOpacity(0.3),
                        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                      ),
                      child: Center(
                        child: Text(
                          initial,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF60A5FA),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            bankName,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '$accountNumber • $accountName',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: _isLoading ? null : () => _confirmRemove(m),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEF4444).withOpacity(0.12),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 19),
                      ),
                    ),
                  ],
                ),
              );
            }),

          const SizedBox(height: 12),

          if (isLimitReached)
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withOpacity(0.06),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.info_outline_rounded, size: 14, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Account limit reached (3/3). Delete an account to add another.',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFFF59E0B),
                      ),
                    ),
                  ),
                ],
              ),
            )
          else
            GestureDetector(
              onTap: _isLoading ? null : _openDirectAddModal,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.add_rounded, color: Color(0xFF60A5FA), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      '+ Add Bank Account ($count/3)',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF60A5FA),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          const SizedBox(height: 6),
        ],
      ),
    );
  }
}

// ─── Default Currency Modal ───────────────────────────────────────

class DefaultCurrencyModal extends StatefulWidget {
  const DefaultCurrencyModal({super.key});
  @override
  State<DefaultCurrencyModal> createState() => _DefaultCurrencyModalState();
}

class _DefaultCurrencyModalState extends State<DefaultCurrencyModal> {
  late String _selected;
  bool _isSaving = false;

  static const _currencies = [
    ('NGN', 'Nigerian Naira', '\u20A6'),
    ('USD', 'US Dollar', '\$'),
    ('EUR', 'Euro', '\u20AC'),
    ('GBP', 'British Pound', '\u00A3'),
    ('GHS', 'Ghanaian Cedi', '\u20B5'),
    ('KES', 'Kenyan Shilling', 'KSh'),
  ];

  @override
  void initState() {
    super.initState();
    final user = context.read<app_auth.AuthProvider>().userModel;
    _selected = user?.defaultCurrency ?? 'NGN';
  }

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Default Currency',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Select Primary Display Currency'),
          const SizedBox(height: 4),
          ..._currencies.map((c) => _currencyItem(c.$1, c.$2, c.$3)),
          const SizedBox(height: 24),
          _saveButton('Save Preference', _isSaving, () async {
            setState(() => _isSaving = true);
            final messenger = ScaffoldMessenger.of(context);
            final navigator = Navigator.of(context);
            try {
              final auth = context.read<app_auth.AuthProvider>();
              final user = auth.userModel;
              if (user == null) return;
              await auth.updateUserProfileDirect(
                user.copyWith(
                  defaultCurrency: _selected,
                  updatedAt: DateTime.now(),
                ),
              );
              if (mounted) {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text('Currency updated to $_selected', style: GoogleFonts.plusJakartaSans()),
                    backgroundColor: const Color(0xFF10B981),
                  ),
                );
                navigator.pop();
              }
            } catch (e) {
              if (mounted) {
                messenger.showSnackBar(
                  SnackBar(
                    content: Text('Failed to update currency: $e', style: GoogleFonts.plusJakartaSans()),
                    backgroundColor: const Color(0xFFEF4444),
                  ),
                );
              }
            } finally {
              if (mounted) setState(() => _isSaving = false);
            }
          }),
        ],
      ),
    );
  }

  Widget _currencyItem(String code, String name, String symbol) {
    final isSelected = _selected == code;
    return GestureDetector(
      onTap: () => setState(() => _selected = code),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05)))),
        child: Row(
          children: [
            Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: (isSelected ? const Color(0xFF2563EB) : Colors.white).withOpacity(isSelected ? 0.15 : 0.03),
                shape: BoxShape.circle,
                border: Border.all(color: isSelected ? const Color(0xFF2563EB).withOpacity(0.3) : Colors.white.withOpacity(0.08)),
              ),
              child: Center(
                child: Text(symbol, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: isSelected ? const Color(0xFF2563EB) : Colors.white54)),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                  const SizedBox(height: 2),
                  Text(code, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                ],
              ),
            ),
            Container(
              width: 20, height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.15), width: 2),
              ),
              child: isSelected
                  ? const Center(child: Icon(Icons.check_rounded, color: Color(0xFF2563EB), size: 12))
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

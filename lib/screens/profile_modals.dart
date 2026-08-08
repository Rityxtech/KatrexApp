import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart' as app_auth;

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
            onChanged: (v) {
              setState(() => _pinEnabled = v);
              _saveToggles();
            },
            showDivider: false,
          ),
        ],
      ),
    );
  }
}

// ─── Payment Methods Modal ────────────────────────────────────────

class PaymentMethodsModal extends StatefulWidget {
  const PaymentMethodsModal({super.key});

  @override
  State<PaymentMethodsModal> createState() => _PaymentMethodsModalState();
}

class _PaymentMethodsModalState extends State<PaymentMethodsModal> {
  List<Map<String, dynamic>> _methods = [];
  bool _isLoading = true;

  static const _iconMap = {
    'bank': Icons.account_balance_outlined,
    'card': Icons.credit_card_outlined,
  };

  static const _colorMap = {
    'bank': Color(0xFF3B82F6),
    'card': Color(0xFFF59E0B),
  };

  @override
  void initState() {
    super.initState();
    final user = context.read<app_auth.AuthProvider>().userModel;
    _methods = List<Map<String, dynamic>>.from(user?.paymentMethods ?? []);
    _isLoading = false;
  }

  Future<void> _removeMethod(int index) async {
    final removed = _methods[index];
    setState(() {
      _methods.removeAt(index);
      _isLoading = true;
    });
    try {
      final auth = context.read<app_auth.AuthProvider>();
      final user = auth.userModel;
      if (user == null) return;
      await auth.updateUserProfileDirect(
        user.copyWith(
          paymentMethods: List<Map<String, dynamic>>.from(_methods),
          updatedAt: DateTime.now(),
        ),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment method removed', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      setState(() => _methods.insert(index, removed));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to remove: $e', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return _ModalShell(
      title: 'Payment Methods',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionLabel('Linked Accounts & Cards'),
          if (_methods.isEmpty && !_isLoading)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'No payment methods linked yet',
                  style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
                ),
              ),
            )
          else
            ..._methods.asMap().entries.map((entry) {
              final m = entry.value;
              final type = m['type'] as String? ?? 'bank';
              final icon = _iconMap[type] ?? Icons.account_balance_outlined;
              final color = _colorMap[type] ?? const Color(0xFF3B82F6);
              return _paymentItem(
                icon,
                color,
                m['label'] as String? ?? 'Payment Method',
                m['detail'] as String? ?? '',
                () => _removeMethod(entry.key),
              );
            }),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: _isLoading ? null : () => _showAddDialog(context),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.add_rounded, color: Color(0xFF2563EB), size: 18),
                  const SizedBox(width: 8),
                  Text('Add Payment Method', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF2563EB))),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showAddDialog(BuildContext context) {
    final labelController = TextEditingController();
    final detailController = TextEditingController();
    String selectedType = 'bank';

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: const Color(0xFF0A0F1F),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text('Add Payment Method', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                children: [
                  _typeChip('Bank', 'bank', selectedType, (v) => setDialogState(() => selectedType = v)),
                  const SizedBox(width: 8),
                  _typeChip('Card', 'card', selectedType, (v) => setDialogState(() => selectedType = v)),
                ],
              ),
              const SizedBox(height: 16),
              TextField(
                controller: labelController,
                style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'e.g. GTBank Savings',
                  hintStyle: GoogleFonts.plusJakartaSans(fontSize: 15, color: Colors.white38),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF2563EB))),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: detailController,
                style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'e.g. ****4521',
                  hintStyle: GoogleFonts.plusJakartaSans(fontSize: 15, color: Colors.white38),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF2563EB))),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text('Cancel', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ),
            TextButton(
              onPressed: () async {
                final label = labelController.text.trim();
                final detail = detailController.text.trim();
                if (label.isEmpty) return;

                Navigator.pop(dialogContext);
                setState(() => _isLoading = true);

                _methods.add({
                  'type': selectedType,
                  'label': label,
                  'detail': detail,
                });

                final messenger = ScaffoldMessenger.of(context);
                try {
                  final auth = context.read<app_auth.AuthProvider>();
                  final user = auth.userModel;
                  if (user == null) return;
                  await auth.updateUserProfileDirect(
                    user.copyWith(
                      paymentMethods: List<Map<String, dynamic>>.from(_methods),
                      updatedAt: DateTime.now(),
                    ),
                  );
                  if (mounted) {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text('Payment method added', style: GoogleFonts.plusJakartaSans()),
                        backgroundColor: const Color(0xFF10B981),
                      ),
                    );
                  }
                } catch (e) {
                  if (mounted) {
                    messenger.showSnackBar(
                      SnackBar(
                        content: Text('Failed to add: $e', style: GoogleFonts.plusJakartaSans()),
                        backgroundColor: const Color(0xFFEF4444),
                      ),
                    );
                  }
                } finally {
                  if (mounted) setState(() => _isLoading = false);
                }
              },
              child: Text('Add', style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w800, color: const Color(0xFF2563EB))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _typeChip(String label, String value, String selected, ValueChanged<String> onSelect) {
    final isSelected = selected == value;
    return GestureDetector(
      onTap: () => onSelect(value),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB).withOpacity(0.15) : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.08)),
        ),
        child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF9CA3AF))),
      ),
    );
  }

  Widget _paymentItem(IconData icon, Color color, String label, String detail, VoidCallback onRemove) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05)))),
      child: Row(
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withOpacity(0.2)),
            ),
            child: Icon(icon, color: color, size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                if (detail.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(detail, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                ],
              ],
            ),
          ),
          GestureDetector(
            onTap: onRemove,
            child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 18),
          ),
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

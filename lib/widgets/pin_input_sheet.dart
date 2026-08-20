import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:local_auth/local_auth.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../utils/pin_utils.dart';

/// A reusable bottom sheet for transaction PIN flows with optional
/// biometric (fingerprint/face) authentication.
///
/// Modes:
/// - **setup**: First-time PIN creation (enter + confirm), then optional
///   fingerprint enrollment.
/// - **verify**: Verify PIN or biometric before a transaction.
/// - **change**: Change existing PIN (old PIN + new + confirm).
///
/// The [ensurePinRequired] static method is the main entry point for
/// transaction flows — it checks whether the user has a PIN set and
/// either shows the setup sheet (if not) or the verify sheet (if yes).
class PinInputSheet extends StatefulWidget {
  final PinMode mode;

  const PinInputSheet({super.key, required this.mode});

  /// Ensure the user has a transaction PIN set and verify it.
  ///
  /// Call this before ANY transaction (airtime, data, P2P buy, P2P release).
  /// Returns `true` if the user is authorized to proceed, `false` otherwise.
  static Future<bool> ensurePinRequired(BuildContext context) async {
    final user = context.read<AuthProvider>().userModel;
    if (user == null) return false;

    // No PIN set yet — force setup
    if (user.transactionPin == null || user.transactionPin!.isEmpty) {
      final success = await PinInputSheet.show(context, mode: PinMode.setup);
      return success;
    }

    // PIN is set — verify
    final verified = await PinInputSheet.show(context, mode: PinMode.verify);
    return verified;
  }

  /// Shows the PIN verification sheet and returns true if the user
  /// successfully verified their PIN, false if they cancelled.
  static Future<bool> verify(BuildContext context) async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const PinInputSheet(mode: PinMode.verify),
    );
    return result == true;
  }

  /// Show the PIN sheet and return `true` if the action succeeded.
  static Future<bool> show(BuildContext context, {required PinMode mode}) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      isDismissible: true,
      enableDrag: true,
      backgroundColor: Colors.transparent,
      builder: (_) => PinInputSheet(mode: mode),
    ).then((v) => v ?? false);
  }

  @override
  State<PinInputSheet> createState() => _PinInputSheetState();
}

enum PinMode { setup, verify, change }

class _PinInputSheetState extends State<PinInputSheet> {
  final _controller = TextEditingController();
  final _confirmController = TextEditingController();
  final _oldPinController = TextEditingController();
  final LocalAuthentication _localAuth = LocalAuthentication();
  bool _isSubmitting = false;
  String? _error;

  /// After PIN setup succeeds, we show a fingerprint enrollment step.
  bool _showBiometricEnrollment = false;

  /// Success state — shows a checkmark animation before closing.
  bool _showSuccess = false;
  String _successMessage = '';

  @override
  void initState() {
    super.initState();
    _checkBiometrics();
    // Auto-prompt biometric on verify mode (only if user has it enabled)
    if (widget.mode == PinMode.verify) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final user = context.read<AuthProvider>().userModel;
        if (user?.biometricEnabled == true) {
          _authenticateWithBiometrics();
        }
      });
    }
  }

  /// Show the success UI with a checkmark, then close the sheet after 1.5s.
  void _showSuccessAndClose(String message) {
    if (!mounted) return;
    setState(() {
      _showSuccess = true;
      _successMessage = message;
      _isSubmitting = false;
    });
    Future.delayed(const Duration(milliseconds: 1500), () {
      if (mounted) Navigator.pop(context, true);
    });
  }

  Future<void> _checkBiometrics() async {
    // No-op: we no longer pre-check. Just attempt authentication directly
    // when needed, as canCheckBiometrics/isDeviceSupported can return false
    // on some Android devices even when biometrics are enrolled and working.
  }

  Future<void> _authenticateWithBiometrics() async {
    try {
      final authenticated = await _localAuth.authenticate(
        localizedReason: 'Authenticate to authorize this transaction',
        biometricOnly: true,
      );
      if (authenticated && mounted) {
        Navigator.pop(context, true);
      }
    } catch (_) {
      // Biometric failed — user can fall back to PIN entry
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _confirmController.dispose();
    _oldPinController.dispose();
    super.dispose();
  }

  String get _title {
    switch (widget.mode) {
      case PinMode.setup: return 'Set Transaction PIN';
      case PinMode.verify: return 'Authorize Transaction';
      case PinMode.change: return 'Change Transaction PIN';
    }
  }

  String get _subtitle {
    switch (widget.mode) {
      case PinMode.setup: return 'Create a 6-digit PIN to secure your transactions. This PIN will be required for all purchases and transfers.';
      case PinMode.verify: return 'Enter your PIN or use biometrics to authorize this transaction.';
      case PinMode.change: return 'Enter your current PIN, then choose a new one.';
    }
  }

  Future<void> _submit() async {
    final pin = _controller.text.trim();
    final confirm = _confirmController.text.trim();
    final oldPin = _oldPinController.text.trim();

    if (widget.mode == PinMode.change) {
      if (!PinUtils.isValidPin(oldPin)) {
        setState(() => _error = 'Current PIN must be 6 digits.');
        return;
      }
    }
    if (!PinUtils.isValidPin(pin)) {
      setState(() => _error = 'PIN must be exactly 6 digits.');
      return;
    }
    if (widget.mode == PinMode.setup || widget.mode == PinMode.change) {
      if (!PinUtils.isValidPin(confirm)) {
        setState(() => _error = 'Please confirm your new PIN.');
        return;
      }
      if (pin != confirm) {
        setState(() => _error = 'PINs do not match.');
        return;
      }
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    final auth = context.read<AuthProvider>();
    final user = auth.userModel;

    try {
      switch (widget.mode) {
        case PinMode.setup:
          // Save the PIN first
          await auth.updateUserProfileDirect(
            user!.copyWith(
              transactionPin: PinUtils.hashPin(pin),
              pinEnabled: true,
              updatedAt: DateTime.now(),
            ),
          );
          // Now show the biometric enrollment step.
          // Always show it — the user can choose to skip if they don't want it.
          if (mounted) {
            setState(() {
              _isSubmitting = false;
              _showBiometricEnrollment = true;
            });
          }
          break;

        case PinMode.verify:
          if (PinUtils.verifyPin(pin, user?.transactionPin)) {
            if (mounted) Navigator.pop(context, true);
          } else {
            setState(() {
              _isSubmitting = false;
              _error = 'Incorrect PIN.';
            });
          }
          break;

        case PinMode.change:
          if (!PinUtils.verifyPin(oldPin, user?.transactionPin)) {
            setState(() {
              _isSubmitting = false;
              _error = 'Current PIN is incorrect.';
            });
            return;
          }
          await auth.updateUserProfileDirect(
            user!.copyWith(
              transactionPin: PinUtils.hashPin(pin),
              updatedAt: DateTime.now(),
            ),
          );
          _showSuccessAndClose('Transaction PIN changed successfully!');
          break;
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _error = 'Failed: $e';
        });
      }
    }
  }

  /// Save the biometric preference and close the sheet.
  Future<void> _saveBiometricPreference(bool enabled) async {
    final auth = context.read<AuthProvider>();
    final user = auth.userModel;
    if (user != null) {
      await auth.updateUserProfileDirect(
        user.copyWith(
          biometricEnabled: enabled,
          updatedAt: DateTime.now(),
        ),
      );
    }
    _showSuccessAndClose(enabled ? 'Fingerprint enabled!' : 'Transaction PIN set successfully!');
  }

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    return PopScope(
      canPop: widget.mode != PinMode.setup,
      child: AnimatedPadding(
        duration: const Duration(milliseconds: 200),
        padding: EdgeInsets.only(bottom: keyboardInset),
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(context).height * 0.75,
          ),
          decoration: const BoxDecoration(
            color: Color(0xFF0F1423),
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
            border: Border(top: BorderSide(color: Color(0x14FFFFFF))),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            child: _showSuccess
              ? _buildSuccessView()
              : _showBiometricEnrollment
                ? _buildBiometricEnrollment()
                : _buildPinForm(),
          ),
        ),
      ),
    );
  }

  /// Success view — animated checkmark with message, shown before closing.
  Widget _buildSuccessView() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(height: 24),
        // Animated checkmark circle
        TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.0, end: 1.0),
          duration: const Duration(milliseconds: 600),
          curve: Curves.elasticOut,
          builder: (context, value, child) {
            return Transform.scale(
              scale: value,
              child: child,
            );
          },
          child: Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF10B981).withOpacity(0.15),
              border: Border.all(color: const Color(0xFF10B981), width: 2),
            ),
            child: const Icon(Icons.check_rounded, size: 44, color: Color(0xFF34D399)),
          ),
        ),
        const SizedBox(height: 24),
        Text('Success!', style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
        const SizedBox(height: 8),
        Text(_successMessage, textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
        const SizedBox(height: 24),
        // Loading indicator while waiting to close
        const SizedBox(
          width: 24, height: 24,
          child: CircularProgressIndicator(color: Color(0xFF34D399), strokeWidth: 2),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  /// Biometric enrollment step shown after PIN setup succeeds.
  Widget _buildBiometricEnrollment() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Center(child: Container(width: 48, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(2)))),
        const SizedBox(height: 16),
        Text('Enable Fingerprint?', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
        const SizedBox(height: 8),
        Text('Your PIN is set. Would you like to also use fingerprint to authorize transactions faster?', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
        const SizedBox(height: 24),
        // Fingerprint icon
        Center(
          child: Container(
            width: 80, height: 80,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFF2563EB).withOpacity(0.1),
              border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3), width: 1.5),
            ),
            child: const Icon(Icons.fingerprint_rounded, size: 40, color: Color(0xFF60A5FA)),
          ),
        ),
        const SizedBox(height: 24),
        // Enable button
        GestureDetector(
          onTap: () => _saveBiometricPreference(true),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 15)],
            ),
            child: Center(child: Text('Enable Fingerprint', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white))),
          ),
        ),
        const SizedBox(height: 12),
        // Skip button
        GestureDetector(
          onTap: () => _saveBiometricPreference(false),
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Center(child: Text('Skip, use PIN only', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF)))),
          ),
        ),
      ],
    );
  }

  /// The main PIN entry form.
  Widget _buildPinForm() {
    final user = context.read<AuthProvider>().userModel;
    final biometricIsEnabled = user?.biometricEnabled == true;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Drag handle
        Center(child: Container(width: 48, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(2)))),
        const SizedBox(height: 16),
        // Title row
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(_title, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
            GestureDetector(
              onTap: () => Navigator.pop(context, false),
              child: Container(width: 32, height: 32, decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle), child: const Icon(Icons.close_rounded, color: Color(0xFF9CA3AF), size: 18)),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(_subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
        const SizedBox(height: 24),

        // Biometric button — only in verify mode, only if user enabled it.
        // Don't pre-check device support; just attempt auth and handle errors.
        if (widget.mode == PinMode.verify && biometricIsEnabled) ...[
          GestureDetector(
            onTap: _authenticateWithBiometrics,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
              ),
              child: Column(
                children: [
                  const Icon(Icons.fingerprint_rounded, size: 48, color: Color(0xFF60A5FA)),
                  const SizedBox(height: 8),
                  Text('Use Fingerprint', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA))),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          // Divider with "or"
          Row(
            children: [
              const Expanded(child: Divider(color: Color(0x14FFFFFF), height: 1)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('or enter PIN', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
              ),
              const Expanded(child: Divider(color: Color(0x14FFFFFF), height: 1)),
            ],
          ),
          const SizedBox(height: 16),
        ],

        // Current PIN field (only for change mode)
        if (widget.mode == PinMode.change) ...[
          _label('Current PIN'),
          _pinField(_oldPinController, 'Enter current PIN'),
          const SizedBox(height: 16),
        ],

        // Main PIN field
        _label(widget.mode == PinMode.change ? 'New PIN' : 'PIN'),
        _pinField(_controller, 'Enter 6-digit PIN'),
        const SizedBox(height: 16),

        // Confirm PIN field (only for setup and change)
        if (widget.mode == PinMode.setup || widget.mode == PinMode.change) ...[
          _label('Confirm PIN'),
          _pinField(_confirmController, 'Re-enter PIN'),
          const SizedBox(height: 16),
        ],

        // Error
        if (_error != null) ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(color: const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3))),
            child: Row(children: [
              const Icon(Icons.error_outline_rounded, size: 16, color: Color(0xFFF87171)),
              const SizedBox(width: 8),
              Expanded(child: Text(_error!, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFFF87171)))),
            ]),
          ),
          const SizedBox(height: 16),
        ],

        // Submit button
        GestureDetector(
          onTap: _isSubmitting ? null : _submit,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(
              color: _isSubmitting ? const Color(0xFF2563EB).withOpacity(0.5) : const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 15)],
            ),
            child: Center(
              child: _isSubmitting
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text(
                    widget.mode == PinMode.verify ? 'Verify PIN' : widget.mode == PinMode.change ? 'Update PIN' : 'Save PIN',
                    style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
  );

  Widget _pinField(TextEditingController controller, String hint) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
      child: TextField(
        controller: controller,
        keyboardType: TextInputType.number,
        obscureText: true,
        inputFormatters: [
          FilteringTextInputFormatter.digitsOnly,
          LengthLimitingTextInputFormatter(6),
        ],
        style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 8),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280)),
          border: InputBorder.none,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
        ),
        textAlign: TextAlign.center,
      ),
    );
  }
}

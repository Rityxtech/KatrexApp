import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/cloud_functions_service.dart';
import '../widgets/right_slide_panel.dart';

/// KYC Verification screen — shown as a right-side slide panel from the
/// profile page.
///
/// Standard manual-review flow:
///   1. User fills the form (BVN, phone, DOB, gender, address).
///   2. submitKyc Cloud Function saves it with kycStatus = 'pending'.
///   3. An admin approves/rejects from the admin dashboard (reviewKyc).
///   4. This screen reflects the state: unverified → form, pending →
///      under-review summary, verified → badge, rejected → reason + retry.
///
/// Nothing is auto-approved and no virtual account is created here.
class KycVerificationScreen extends StatefulWidget {
  const KycVerificationScreen({super.key});

  @override
  State<KycVerificationScreen> createState() => _KycVerificationScreenState();
}

enum _KycView { loading, unverified, pending, verified, rejected }

class _KycVerificationScreenState extends State<KycVerificationScreen> {
  final _bvnController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();
  String? _selectedGender;
  bool _isSubmitting = false;
  _KycView _view = _KycView.loading;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _resolveView());
  }

  void _resolveView() {
    final user = context.read<AuthProvider>().userModel;
    if (user == null) {
      setState(() => _view = _KycView.unverified);
      return;
    }
    // Pre-fill the form with anything already on the profile.
    _phoneController.text = user.phone ?? '';
    _dobController.text = user.dateOfBirth ?? '';
    _addressController.text = user.address ?? '';
    _bvnController.text = user.bvn ?? '';
    _selectedGender = user.gender;

    final status = user.kycStatus;
    if (user.kycTier >= 1 || status == 'verified') {
      _view = _KycView.verified;
    } else if (status == 'pending') {
      _view = _KycView.pending;
    } else if (status == 'rejected') {
      _view = _KycView.rejected;
    } else {
      _view = _KycView.unverified;
    }
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _bvnController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _pickDob() async {
    FocusManager.instance.primaryFocus?.unfocus();
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(now.year - 25, 1, 1),
      firstDate: DateTime(1940),
      lastDate: DateTime(now.year - 16, 12, 31),
      builder: (context, child) => Theme(
        data: ThemeData.dark().copyWith(
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF10B981),
            onPrimary: Colors.white,
            surface: Color(0xFF0F1423),
          ),
          dialogBackgroundColor: const Color(0xFF0F1423),
        ),
        child: child!,
      ),
    );
    if (picked != null) {
      setState(() => _dobController.text = DateFormat('MM/dd/yyyy').format(picked));
    }
  }

  Future<void> _submitKyc() async {
    final bvn = _bvnController.text.trim();
    // Strip non-digits from the phone: the input formatter only filters
    // typed input, not values pre-filled from the user profile (which can
    // contain '+' or spaces). The server regex requires pure digits.
    final phone = _phoneController.text.trim().replaceAll(RegExp(r'\D'), '');
    final dob = _dobController.text.trim();
    final address = _addressController.text.trim();

    if (bvn.length != 11) return _showError('Enter a valid 11-digit BVN');
    if (phone.length < 11 || phone.length > 14) {
      return _showError('Enter a valid phone number');
    }
    if (dob.isEmpty) return _showError('Select your date of birth');
    if (_selectedGender == null) return _showError('Select your gender');
    if (address.length < 5) return _showError('Enter your full address');

    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _isSubmitting = true);
    try {
      await CloudFunctionsService.submitKyc(
        bvn: bvn,
        phone: phone,
        dob: dob,
        gender: _selectedGender!,
        address: address,
      );
      if (mounted) {
        setState(() => _view = _KycView.pending);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Submission received — your KYC is under review.',
                style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_view == _KycView.loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF10B981)));
    }
    switch (_view) {
      case _KycView.verified:
        return _buildVerifiedState();
      case _KycView.pending:
        return _buildPendingState();
      case _KycView.rejected:
        return _buildRejectedState();
      case _KycView.unverified:
      case _KycView.loading:
        return _buildForm();
    }
  }

  // ── Status hero (shared by all states) ─────────────────────────────────

  Widget _buildHero({
    required IconData icon,
    required Color color,
    required String title,
    required String subtitle,
  }) {
    return Column(
      children: [
        const SizedBox(height: 16),
        Container(
          width: 84,
          height: 84,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [color, color.withOpacity(0.7)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [BoxShadow(color: color.withOpacity(0.35), blurRadius: 28, spreadRadius: 2)],
          ),
          child: Icon(icon, color: Colors.white, size: 40),
        ),
        const SizedBox(height: 18),
        Text(title,
            style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
        const SizedBox(height: 6),
        Text(subtitle,
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF), height: 1.5)),
      ],
    );
  }

  // ── VERIFIED ────────────────────────────────────────────────────────────

  Widget _buildVerifiedState() {
    return ListView(
      shrinkWrap: true,
      children: [
        _buildHero(
          icon: Icons.verified_rounded,
          color: const Color(0xFF10B981),
          title: 'Identity Verified',
          subtitle: 'Your identity has been confirmed by our review team.',
        ),
        const SizedBox(height: 24),
        _statusBadge('VERIFIED', const Color(0xFF10B981)),
        const SizedBox(height: 20),
        _infoCard('What you unlocked', [
          _infoRow(Icons.trending_up_rounded, 'Higher transaction limits'),
          _infoRow(Icons.account_balance_rounded, 'Full account functionality'),
          _infoRow(Icons.bolt_rounded, 'Faster withdrawal processing'),
          _infoRow(Icons.verified_user_rounded, 'Priority customer support'),
        ]),
        const SizedBox(height: 24),
      ],
    );
  }

  // ── PENDING ─────────────────────────────────────────────────────────────

  Widget _buildPendingState() {
    final user = context.read<AuthProvider>().userModel;
    final bvn = user?.bvn ?? _bvnController.text;
    final submitted = user?.kycSubmittedAt;
    return ListView(
      shrinkWrap: true,
      children: [
        _buildHero(
          icon: Icons.hourglass_top_rounded,
          color: const Color(0xFFF59E0B),
          title: 'Under Review',
          subtitle: 'Our team is reviewing your submission.\nThis usually takes 24–48 hours.',
        ),
        const SizedBox(height: 24),
        _statusBadge('PENDING REVIEW', const Color(0xFFF59E0B)),
        const SizedBox(height: 20),
        _infoCard('Submitted details', [
          _infoRow(Icons.badge_rounded, 'BVN', trailing: bvn.length == 11 ? '•••• ${bvn.substring(7)}' : '—'),
          _infoRow(Icons.phone_rounded, 'Phone', trailing: user?.phone ?? _phoneController.text),
          _infoRow(Icons.cake_rounded, 'Date of Birth', trailing: user?.dateOfBirth ?? _dobController.text),
          _infoRow(Icons.wc_rounded, 'Gender', trailing: (user?.gender ?? '').isNotEmpty ? (user!.gender!) : '—'),
          _infoRow(Icons.home_rounded, 'Address', trailing: 'On file'),
        ]),
        if (submitted != null) ...[
          const SizedBox(height: 10),
          Center(
            child: Text('Submitted ${DateFormat('MMM d, yyyy • h:mm a').format(submitted)}',
                style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF6B7280))),
          ),
        ],
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB).withOpacity(0.06),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.15)),
          ),
          child: Row(
            children: [
              const Icon(Icons.notifications_active_rounded, size: 16, color: Color(0xFF60A5FA)),
              const SizedBox(width: 10),
              Expanded(
                child: Text('You\'ll receive a notification as soon as the review is complete.',
                    style: GoogleFonts.plusJakartaSans(fontSize: 11.5, fontWeight: FontWeight.w600, color: const Color(0xFF93C5FD), height: 1.4)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  // ── REJECTED ────────────────────────────────────────────────────────────

  Widget _buildRejectedState() {
    final user = context.read<AuthProvider>().userModel;
    final reason = user?.kycRejectionReason ?? 'Your submission could not be verified.';
    return ListView(
      shrinkWrap: true,
      children: [
        _buildHero(
          icon: Icons.cancel_rounded,
          color: const Color(0xFFEF4444),
          title: 'Verification Rejected',
          subtitle: 'You can review the reason below and submit again.',
        ),
        const SizedBox(height: 20),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFFEF4444).withOpacity(0.06),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.error_outline_rounded, size: 14, color: Color(0xFFEF4444)),
                  const SizedBox(width: 6),
                  Text('REASON',
                      style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFEF4444), letterSpacing: 1.2)),
                ],
              ),
              const SizedBox(height: 8),
              Text(reason,
                  style: GoogleFonts.plusJakartaSans(fontSize: 12.5, fontWeight: FontWeight.w600, color: const Color(0xFFD1D5DB), height: 1.5)),
            ],
          ),
        ),
        const SizedBox(height: 20),
        _submitButton('Submit Again', () => setState(() => _view = _KycView.unverified)),
        const SizedBox(height: 24),
      ],
    );
  }

  // ── FORM (same questions as before) ─────────────────────────────────────

  Widget _buildForm() {
    return ListView(
      shrinkWrap: true,
      children: [
        _buildHero(
          icon: Icons.security_rounded,
          color: const Color(0xFF2563EB),
          title: 'Identity Verification',
          subtitle: 'Verify your identity to unlock higher limits\nand full account features.',
        ),
        const SizedBox(height: 24),
        _numberedField(
          number: '1',
          label: 'BVN',
          child: _buildTextField(
            controller: _bvnController,
            hint: '12345678901',
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)],
          ),
        ),
        _numberedField(
          number: '2',
          label: 'Phone Number',
          child: _buildTextField(
            controller: _phoneController,
            hint: '08012345678',
            keyboardType: TextInputType.phone,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(11)],
          ),
        ),
        _numberedField(
          number: '3',
          label: 'Date of Birth',
          child: GestureDetector(
            onTap: _pickDob,
            child: AbsorbPointer(
              child: _buildTextField(
                controller: _dobController,
                hint: 'MM/DD/YYYY',
                suffixIcon: const Icon(Icons.calendar_month_rounded, size: 18, color: Color(0xFF6B7280)),
              ),
            ),
          ),
        ),
        _numberedField(
          number: '4',
          label: 'Gender',
          child: Row(
            children: [
              _genderChip('Male'),
              const SizedBox(width: 8),
              _genderChip('Female'),
            ],
          ),
        ),
        _numberedField(
          number: '5',
          label: 'Address',
          child: _buildTextField(
            controller: _addressController,
            hint: 'Enter your home address',
            keyboardType: TextInputType.streetAddress,
          ),
        ),
        const SizedBox(height: 24),
        _submitButton('Submit for Review', _isSubmitting ? () {} : _submitKyc),
        const SizedBox(height: 14),
        Text(
          'Your details are encrypted in transit and reviewed manually by our compliance team. This is a one-time verification.',
          textAlign: TextAlign.center,
          style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF6B7280), height: 1.5),
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  // ── Shared widgets ──────────────────────────────────────────────────────

  Widget _statusBadge(String label, Color color) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withOpacity(0.35)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 7,
              height: 7,
              decoration: BoxDecoration(shape: BoxShape.circle, color: color),
            ),
            const SizedBox(width: 8),
            Text(label,
                style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: color, letterSpacing: 1)),
          ],
        ),
      ),
    );
  }

  Widget _infoCard(String title, List<Widget> children) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title,
              style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 12),
          ...children,
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, {String? trailing}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Icon(icon, size: 15, color: const Color(0xFF10B981)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(label,
                style: GoogleFonts.plusJakartaSans(fontSize: 12.5, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
          ),
          if (trailing != null)
            Text(trailing,
                style: GoogleFonts.plusJakartaSans(fontSize: 12.5, fontWeight: FontWeight.w800, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _numberedField({required String number, required String label, required Widget child}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 22,
                height: 22,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF2563EB).withOpacity(0.15),
                  border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.4)),
                ),
                child: Center(
                  child: Text(number,
                      style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA))),
                ),
              ),
              const SizedBox(width: 10),
              Text(label,
                  style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 0.5)),
            ],
          ),
          const SizedBox(height: 8),
          child,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    Widget? suffixIcon,
  }) {
    return TextField(
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white24),
        suffixIcon: suffixIcon,
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        counterText: '',
      ),
    );
  }

  Widget _genderChip(String label) {
    final isSelected = _selectedGender?.toLowerCase() == label.toLowerCase();
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedGender = label),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF10B981) : Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isSelected ? const Color(0xFF10B981) : Colors.white.withOpacity(0.1)),
          ),
          child: Center(
            child: Text(label,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 13, fontWeight: FontWeight.w800, color: isSelected ? Colors.white : const Color(0xFF9CA3AF))),
          ),
        ),
      ),
    );
  }

  Widget _submitButton(String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: _isSubmitting ? null : onTap,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF059669)]),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [BoxShadow(color: const Color(0xFF10B981).withOpacity(0.35), blurRadius: 18)],
        ),
        child: Center(
          child: _isSubmitting
              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
              : Text(label,
                  style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
        ),
      ),
    );
  }
}

/// Convenience function to open the KYC screen as a right-side slide panel.
void showKycVerification(BuildContext context) {
  RightSlidePanel.show(
    context,
    title: 'KYC Verification',
    child: const KycVerificationScreen(),
  );
}

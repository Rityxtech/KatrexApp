import 'dart:math';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../utils/validators.dart';
import '../widgets/app_background.dart';
import 'login_screen.dart';
import 'otp_verification_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen>
    with TickerProviderStateMixin {
  int _currentStep = 1;
  bool _pass1Visible = false;
  bool _pass2Visible = false;
  bool _termsAccepted = false;
  bool _isLoading = false;

  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _pass1Controller = TextEditingController();
  final _pass2Controller = TextEditingController();

  bool get _isStep2Valid =>
      _phoneController.text.trim().isNotEmpty &&
      _pass1Controller.text.isNotEmpty &&
      _pass2Controller.text.isNotEmpty &&
      _termsAccepted;

  late final AnimationController _floatA;
  late final AnimationController _floatB;
  late final AnimationController _revealCtrl;
  late final Animation<double> _reveal;
  late final AnimationController _sheetCtrl;
  late final Animation<double> _sheetSlide;

  @override
  void initState() {
    super.initState();
    _floatA = AnimationController(vsync: this, duration: const Duration(seconds: 6));
    _floatA.repeat(reverse: true);
    _floatB = AnimationController(vsync: this, duration: const Duration(seconds: 8));
    _floatB.repeat(reverse: true);

    _revealCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _reveal = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.34, 1.56, 0.64, 1));

    _sheetCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _sheetSlide = CurvedAnimation(parent: _sheetCtrl, curve: const Cubic(0.16, 1, 0.3, 1));

    _nameController.addListener(_onFieldChanged);
    _usernameController.addListener(_onFieldChanged);
    _emailController.addListener(_onFieldChanged);
    _phoneController.addListener(_onFieldChanged);
    _pass1Controller.addListener(_onFieldChanged);
    _pass2Controller.addListener(_onFieldChanged);

    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) _revealCtrl.forward();
    });
    Future.delayed(const Duration(milliseconds: 400), () {
      if (mounted) _sheetCtrl.forward();
    });
  }

  void _onFieldChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _nameController.removeListener(_onFieldChanged);
    _usernameController.removeListener(_onFieldChanged);
    _emailController.removeListener(_onFieldChanged);
    _phoneController.removeListener(_onFieldChanged);
    _pass1Controller.removeListener(_onFieldChanged);
    _pass2Controller.removeListener(_onFieldChanged);
    _floatA.dispose();
    _floatB.dispose();
    _revealCtrl.dispose();
    _sheetCtrl.dispose();
    _nameController.dispose();
    _usernameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _pass1Controller.dispose();
    _pass2Controller.dispose();
    super.dispose();
  }

  void _nextStep() {
    final nameErr = Validators.name(_nameController.text);
    if (nameErr != null) {
      _showError(nameErr);
      return;
    }
    final usernameErr = Validators.username(_usernameController.text);
    if (usernameErr != null) {
      _showError(usernameErr);
      return;
    }
    final emailErr = Validators.email(_emailController.text);
    if (emailErr != null) {
      _showError(emailErr);
      return;
    }
    setState(() => _currentStep = 2);
  }
  void _prevStep() => setState(() => _currentStep = 1);

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  void _createAccount() async {
    if (_isLoading) return;

    final phoneErr = Validators.phone(_phoneController.text);
    if (phoneErr != null) {
      _showError(phoneErr);
      return;
    }
    final passErr = Validators.password(_pass1Controller.text);
    if (passErr != null) {
      _showError(passErr);
      return;
    }
    final confirmErr = Validators.confirmPassword(_pass2Controller.text, _pass1Controller.text);
    if (confirmErr != null) {
      _showError(confirmErr);
      return;
    }
    if (!_termsAccepted) {
      _showError('Please accept the Terms and Conditions to continue.');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final auth = context.read<AuthProvider>();
      final success = await auth.register(
        fullName: _nameController.text.trim(),
        username: _usernameController.text.trim(),
        email: _emailController.text.trim(),
        password: _pass1Controller.text,
        phone: _phoneController.text.trim(),
      );

      if (!mounted) return;

      if (success) {
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(
            builder: (_) => OtpVerificationScreen(
              email: auth.firebaseUser?.email ?? _emailController.text.trim(),
            ),
          ),
          (route) => route.isFirst,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Registration failed. Please try again.'),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Registration error: $e'),
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    const Color(0xFF050505).withOpacity(0.9),
                    const Color(0xFF0A0F1F).withOpacity(0.9),
                    const Color(0xFF1A2242).withOpacity(0.9),
                    const Color(0xFF000000).withOpacity(0.9),
                  ],
                  stops: const [0.0, 0.3, 0.6, 1.0],
                ),
              ),
            ),
          ),
          _buildBgGrid(),
          _buildGlow(),
          _buildFloatingBtc(),
          _buildFloatingGiftcard(),
          _buildTopNav(),
          _buildBottomCard(),
        ],
      ),
    );
  }

  // ── Background grid ─────────────────────────────────────────
  Widget _buildBgGrid() {
    return CustomPaint(
      painter: _GridPainter(),
      size: Size.infinite,
    );
  }

  // ── Glow ────────────────────────────────────────────────────
  Widget _buildGlow() {
    return Positioned(
      top: -100,
      left: -150,
      child: Container(
        width: 300,
        height: 300,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              const Color(0xFF2563EB).withOpacity(0.4),
              Colors.transparent,
            ],
          ),
        ),
      ),
    );
  }

  // ── Floating BTC coin ───────────────────────────────────────
  Widget _buildFloatingBtc() {
    return Positioned(
      top: 50,
      right: 20,
      child: ScaleTransition(
        scale: _reveal,
        child: AnimatedBuilder(
          animation: _floatA,
          builder: (context, child) {
            final t = _floatA.value * 2 * pi;
            return Transform.translate(
              offset: Offset(sin(t) * 10, cos(t) * -18),
              child: Transform.rotate(
                angle: -0.26 + sin(t) * 0.14,
                child: child,
              ),
            );
          },
          child: Container(
            width: 70,
            height: 70,
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  const Color(0xFFF59E0B).withOpacity(0.15),
                  Colors.white.withOpacity(0.02),
                ],
              ),
              border: Border.all(color: Colors.white.withOpacity(0.8), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 35,
                  offset: const Offset(0, 15),
                ),
              ],
            ),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: const Center(
                child: Icon(Icons.currency_bitcoin_rounded, color: Color(0xFFF59E0B), size: 32),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Floating giftcard ───────────────────────────────────────
  Widget _buildFloatingGiftcard() {
    return Positioned(
      top: 130,
      left: 20,
      child: ScaleTransition(
        scale: _reveal,
        child: AnimatedBuilder(
          animation: _floatB,
          builder: (context, child) {
            final t = _floatB.value * 2 * pi;
            return Transform.translate(
              offset: Offset(sin(t + 1) * 12, cos(t + 1) * 20),
              child: Transform.rotate(
                angle: 0.21 + sin(t + 1) * 0.1,
                child: child,
              ),
            );
          },
          child: Container(
            width: 130,
            height: 80,
            padding: const EdgeInsets.all(10),
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              color: Colors.white.withOpacity(0.04),
              border: Border.all(color: Colors.white.withOpacity(0.8), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 35,
                  offset: const Offset(0, 15),
                ),
              ],
            ),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Icon(Icons.apple, color: Colors.white70, size: 16),
                      Icon(Icons.card_giftcard_rounded, color: Colors.white30, size: 10),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(width: 64, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(4))),
                          Text('\$50', style: GoogleFonts.robotoMono(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.9))),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Top navigation ──────────────────────────────────────────
  Widget _buildTopNav() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              GestureDetector(
                onTap: () {
                  if (_currentStep == 2) {
                    _prevStep();
                  } else if (Navigator.of(context).canPop()) {
                    Navigator.of(context).pop();
                  }
                },
                child: Container(
                  width: 40,
                  height: 40,
                  clipBehavior: Clip.antiAlias,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.1),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                    child: const Center(
                      child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 14),
                    ),
                  ),
                ),
              ),
              Text(
                'REGISTER',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                  letterSpacing: 3,
                ),
              ),
              const SizedBox(width: 40),
            ],
          ),
        ),
      ),
    );
  }

  // ── Bottom card ─────────────────────────────────────────────
  Widget _buildBottomCard() {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: AnimatedBuilder(
        animation: _sheetSlide,
        builder: (context, child) {
          return Transform.translate(
            offset: Offset(0, MediaQuery.of(context).size.height * (1 - _sheetSlide.value)),
            child: child,
          );
        },
        child: Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.85,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(36),
              topRight: Radius.circular(36),
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0x66000000),
                blurRadius: 50,
                offset: Offset(0, -20),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildHeader(),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
                  child: _currentStep == 1 ? _buildStep1() : _buildStep2(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Card header (progress + title) ──────────────────────────
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 50,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E3A8A),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  const SizedBox(width: 8),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    width: 50,
                    height: 4,
                    decoration: BoxDecoration(
                      color: _currentStep == 2
                          ? const Color(0xFF1E3A8A)
                          : const Color(0xFFE5E7EB),
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                ],
              ),
              Text(
                _currentStep == 1 ? 'STEP 1/2' : 'STEP 2/2',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1E3A8A),
                  letterSpacing: 2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Create Account',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 22,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF1E3A8A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Join Katrex to start trading instantly.',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF6B7280),
            ),
          ),
        ],
      ),
    );
  }

  // ── Step 1: Personal info ───────────────────────────────────
  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('Full Name'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _nameController,
          hint: 'Alex Carter',
          icon: Icons.person_outline_rounded,
          validator: Validators.name,
        ),
        const SizedBox(height: 14),
        _buildLabel('Username'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _usernameController,
          hint: 'alex_carter',
          icon: Icons.alternate_email_rounded,
          validator: Validators.username,
        ),
        const SizedBox(height: 14),
        _buildLabel('Email Address'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _emailController,
          hint: 'your@email.com',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
          validator: Validators.email,
        ),
        const SizedBox(height: 20),
        _buildPrimaryButton(
          label: 'Continue',
          icon: Icons.arrow_forward_rounded,
          onTap: _nextStep,
        ),
        const SizedBox(height: 12),
        Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'Already have an account? ',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF6B7280),
                ),
              ),
              GestureDetector(
                onTap: () {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                  );
                },
                child: Text(
                  'Log in',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF1E3A8A),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Step 2: Security ────────────────────────────────────────
  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('Phone Number'),
        const SizedBox(height: 6),
        _buildPhoneInput(),
        const SizedBox(height: 14),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildLabel('Create Password'),
            Text(
              'Min. 8 chars',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 9,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF9CA3AF),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        _buildPasswordInput(
          controller: _pass1Controller,
          visible: _pass1Visible,
          onToggle: () => setState(() => _pass1Visible = !_pass1Visible),
          validator: Validators.password,
        ),
        const SizedBox(height: 14),
        _buildLabel('Confirm Password'),
        const SizedBox(height: 6),
        _buildPasswordInput(
          controller: _pass2Controller,
          visible: _pass2Visible,
          onToggle: () => setState(() => _pass2Visible = !_pass2Visible),
          validator: (v) => Validators.confirmPassword(v, _pass1Controller.text),
        ),
        const SizedBox(height: 14),
        _buildTermsCheckbox(),
        const SizedBox(height: 16),
        Row(
          children: [
            GestureDetector(
              onTap: _prevStep,
              child: Container(
                width: 48,
                height: 52,
                decoration: BoxDecoration(
                  color: const Color(0xFFF3F4F6),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Center(
                  child: Icon(Icons.arrow_back_rounded, color: Color(0xFF6B7280), size: 14),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildPrimaryButton(
                label: 'Create Account',
                icon: Icons.check_rounded,
                onTap: _createAccount,
                isLoading: _isLoading,
                isEnabled: _isStep2Valid,
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ── Form widgets ────────────────────────────────────────────
  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        text,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 11,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF6B7280),
        ),
      ),
    );
  }

  Widget _buildInput({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    TextInputType keyboardType = TextInputType.text,
    String? Function(String?)? validator,
  }) {
    final isValid = validator?.call(controller.text) == null;
    final borderColor = isValid
        ? const Color(0xFF10B981).withOpacity(0.25)
        : const Color(0xFFEF4444).withOpacity(0.25);
    final glowColor = isValid
        ? const Color(0xFF10B981).withOpacity(0.08)
        : const Color(0xFFEF4444).withOpacity(0.08);
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: [
          BoxShadow(
            color: glowColor,
            blurRadius: 12,
            spreadRadius: 0,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 16,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF0A1128),
        ),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.plusJakartaSans(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF9CA3AF),
          ),
          prefixIcon: Padding(
            padding: const EdgeInsets.only(left: 16, right: 12),
            child: Icon(icon, size: 18, color: const Color(0xFF9CA3AF)),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 11),
        ),
      ),
    );
  }

  Widget _buildPhoneInput() {
    final isValid = Validators.phone(_phoneController.text) == null;
    final borderColor = isValid
        ? const Color(0xFF10B981).withOpacity(0.25)
        : const Color(0xFFEF4444).withOpacity(0.25);
    final glowColor = isValid
        ? const Color(0xFF10B981).withOpacity(0.08)
        : const Color(0xFFEF4444).withOpacity(0.08);
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: [
          BoxShadow(
            color: glowColor,
            blurRadius: 12,
            spreadRadius: 0,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 16, right: 12),
            child: Row(
              children: [
                const Icon(Icons.phone, size: 12, color: Color(0xFF9CA3AF)),
                const SizedBox(width: 6),
                Text(
                  '+1',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF1E3A8A),
                  ),
                ),
                const SizedBox(width: 12),
                Container(width: 1, height: 24, color: const Color(0xFFD1D5DB)),
                const SizedBox(width: 12),
              ],
            ),
          ),
          Expanded(
            child: TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 16,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0A1128),
              ),
              decoration: InputDecoration(
                hintText: '000 000 0000',
                hintStyle: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF9CA3AF),
                ),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 11),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPasswordInput({
    required TextEditingController controller,
    required bool visible,
    required VoidCallback onToggle,
    String? Function(String?)? validator,
  }) {
    final isValid = validator?.call(controller.text) == null;
    final borderColor = isValid
        ? const Color(0xFF10B981).withOpacity(0.25)
        : const Color(0xFFEF4444).withOpacity(0.25);
    final glowColor = isValid
        ? const Color(0xFF10B981).withOpacity(0.08)
        : const Color(0xFFEF4444).withOpacity(0.08);
    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: borderColor, width: 1),
        boxShadow: [
          BoxShadow(
            color: glowColor,
            blurRadius: 12,
            spreadRadius: 0,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: TextField(
        controller: controller,
        obscureText: !visible,
        style: GoogleFonts.robotoMono(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF0A1128),
          letterSpacing: visible ? 0 : 4,
        ),
        decoration: InputDecoration(
          hintText: '••••••••',
          hintStyle: GoogleFonts.robotoMono(
            fontSize: 17,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF9CA3AF),
            letterSpacing: 4,
          ),
          prefixIcon: const Padding(
            padding: EdgeInsets.only(left: 16, right: 12),
            child: Icon(Icons.lock_outline, size: 18, color: Color(0xFF9CA3AF)),
          ),
          suffixIcon: GestureDetector(
            onTap: onToggle,
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Icon(
                visible ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                size: 14,
                color: visible ? const Color(0xFF1E3A8A) : const Color(0xFF9CA3AF),
              ),
            ),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 11),
        ),
      ),
    );
  }

  Widget _buildTermsCheckbox() {
    return GestureDetector(
      onTap: () => setState(() => _termsAccepted = !_termsAccepted),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: _termsAccepted ? const Color(0xFF1E3A8A).withOpacity(0.08) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: _termsAccepted ? const Color(0xFF1E3A8A) : const Color(0xFFE2E8F0),
            width: _termsAccepted ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _termsAccepted ? const Color(0xFF1E3A8A) : Colors.transparent,
                border: Border.all(
                  color: _termsAccepted ? const Color(0xFF1E3A8A) : const Color(0xFFCBD5E1),
                  width: 1.5,
                ),
              ),
              child: _termsAccepted
                  ? const Center(
                      child: Icon(Icons.check_rounded, color: Colors.white, size: 13),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text.rich(
                TextSpan(
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: _termsAccepted ? const Color(0xFF1E3A8A) : const Color(0xFF6B7280),
                    height: 1.4,
                  ),
                  children: [
                    const TextSpan(text: 'I agree to the '),
                    TextSpan(
                      text: 'Terms of Service',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF1E3A8A),
                      ),
                    ),
                    const TextSpan(text: ' and '),
                    TextSpan(
                      text: 'Privacy Policy',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF1E3A8A),
                      ),
                    ),
                    const TextSpan(text: '.'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPrimaryButton({
    required String label,
    required IconData icon,
    required VoidCallback onTap,
    bool isLoading = false,
    bool isEnabled = true,
  }) {
    final disabled = isLoading || !isEnabled;
    return GestureDetector(
      onTap: disabled ? null : onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: double.infinity,
        height: 52,
        decoration: BoxDecoration(
          color: disabled ? const Color(0xFFCBD5E1) : const Color(0xFF1E3A8A),
          borderRadius: BorderRadius.circular(14),
          boxShadow: disabled
              ? []
              : [
                  BoxShadow(
                    color: const Color(0xFF1E3A8A).withOpacity(0.25),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: isLoading
              ? [
                  const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2.5,
                    ),
                  ),
                ]
              : [
                  Text(
                    label,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: disabled ? const Color(0xFF94A3B8) : Colors.white,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Icon(icon,
                      color: disabled ? const Color(0xFF94A3B8) : Colors.white,
                      size: 14),
                ],
        ),
      ),
    );
  }
}

// ── Grid painter ──────────────────────────────────────────────
class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withOpacity(0.03)
      ..strokeWidth = 1;

    const step = 32.0;
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

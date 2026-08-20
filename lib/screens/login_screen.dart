import 'dart:math';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:local_auth/local_auth.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/biometric_auth_service.dart';
import '../utils/validators.dart';
import '../widgets/app_background.dart';
import 'forgot_password_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with TickerProviderStateMixin {
  bool _passwordVisible = false;
  bool _isLoading = false;

  final _emailController = TextEditingController();
  final _passController = TextEditingController();

  late final AnimationController _floatA;
  late final AnimationController _floatB;
  late final AnimationController _revealCtrl;
  late final Animation<double> _reveal;
  late final AnimationController _sheetCtrl;
  late final Animation<double> _sheetSlide;

  @override
  void initState() {
    super.initState();
    _checkSavedBiometrics();
    _emailController.addListener(_onFieldChanged);
    _passController.addListener(_onFieldChanged);
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

    Future.delayed(const Duration(milliseconds: 100), () {
      if (mounted) _revealCtrl.forward();
    });
    Future.delayed(const Duration(milliseconds: 400), () {
      if (mounted) _sheetCtrl.forward();
    });
  }

  void _checkSavedBiometrics() async {
    final savedEmail = await BiometricAuthService.getSavedEmail();
    if (savedEmail != null && mounted && _emailController.text.isEmpty) {
      _emailController.text = savedEmail;
    }
  }

  void _handleBiometricLogin() async {
    if (_isLoading) return;

    final localAuth = LocalAuthentication();
    final canCheck = await localAuth.canCheckBiometrics;
    final isSupported = await localAuth.isDeviceSupported();
    if (!canCheck && !isSupported) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Biometric authentication is not supported on this device.'),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final hasCreds = await BiometricAuthService.hasSavedCredentials();
    if (!hasCreds) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('No biometric credentials saved. Log in with your password first to enable fingerprint login.'),
          backgroundColor: const Color(0xFF3B82F6),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    final savedEmail = await BiometricAuthService.getSavedEmail();
    final savedPassword = await BiometricAuthService.getSavedPassword();
    if (savedEmail == null || savedPassword == null) return;

    try {
      final authenticated = await localAuth.authenticate(
        localizedReason: 'Scan fingerprint to log into Katrex',
        biometricOnly: true,
      );
      if (!authenticated) return;

      setState(() => _isLoading = true);
      final auth = context.read<AuthProvider>();
      final success = await auth.signIn(email: savedEmail, password: savedPassword);

      if (!mounted) return;
      if (!success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Biometric login failed. Please enter your password.'),
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
            content: Text('Biometric error: $e'),
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

  void _onFieldChanged() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _emailController.removeListener(_onFieldChanged);
    _passController.removeListener(_onFieldChanged);
    _floatA.dispose();
    _floatB.dispose();
    _revealCtrl.dispose();
    _sheetCtrl.dispose();
    _emailController.dispose();
    _passController.dispose();
    super.dispose();
  }

  void _login() async {
    if (_isLoading) return;

    final emailErr = Validators.email(_emailController.text);
    if (emailErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(emailErr),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }
    final passErr = Validators.required(_passController.text, fieldName: 'Password');
    if (passErr != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(passErr),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final auth = context.read<AuthProvider>();
      final success = await auth.signIn(
        email: _emailController.text.trim(),
        password: _passController.text,
      );

      if (success) {
        await BiometricAuthService.saveCredentials(
          email: _emailController.text.trim(),
          password: _passController.text,
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(auth.errorMessage ?? 'Login failed. Please try again.'),
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
            content: Text('Login error: $e'),
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
              Navigator.of(context).canPop()
                  ? GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 40,
                        height: 40,
                        clipBehavior: Clip.antiAlias,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white.withOpacity(0.1),
                          border: Border.all(
                              color: Colors.white.withOpacity(0.1)),
                        ),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                          child: const Center(
                            child: Icon(Icons.chevron_left_rounded,
                                color: Colors.white, size: 14),
                          ),
                        ),
                      ),
                    )
                  : const SizedBox(width: 40),
              Text(
                'LOGIN',
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
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
                  child: _buildForm(),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Card header ─────────────────────────────────────────────
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Welcome Back',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 24,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF1E3A8A),
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Sign in to continue accessing your wallet.',
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

  // ── Form ────────────────────────────────────────────────────
  Widget _buildForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildLabel('Email Address'),
        const SizedBox(height: 6),
        _buildInput(
          controller: _emailController,
          hint: 'your@email.com',
          icon: Icons.email_outlined,
          keyboardType: TextInputType.emailAddress,
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildLabel('Password'),
            GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                );
              },
              child: Text(
                'Forgot?',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF1E3A8A),
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        _buildPasswordInput(),
        const SizedBox(height: 12),
        _buildLoginActions(),
        const SizedBox(height: 12),
        _buildDivider(),
        const SizedBox(height: 12),
        _buildGoogleButton(),
        const SizedBox(height: 12),
        Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                "Don't have an account? ",
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF6B7280),
                ),
              ),
              GestureDetector(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const RegisterScreen()),
                  );
                },
                child: Text(
                  'Register',
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
  }) {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
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
          prefixIcon: const Padding(
            padding: EdgeInsets.only(left: 16, right: 12),
            child: Icon(Icons.email_outlined, size: 18, color: Color(0xFF9CA3AF)),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }

  Widget _buildPasswordInput() {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: TextField(
        controller: _passController,
        obscureText: !_passwordVisible,
        style: GoogleFonts.robotoMono(
          fontSize: 17,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF0A1128),
          letterSpacing: _passwordVisible ? 0 : 4,
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
            onTap: () => setState(() => _passwordVisible = !_passwordVisible),
            child: Padding(
              padding: const EdgeInsets.only(right: 16),
              child: Icon(
                _passwordVisible ? Icons.visibility_rounded : Icons.visibility_off_rounded,
                size: 14,
                color: _passwordVisible ? const Color(0xFF1E3A8A) : const Color(0xFF9CA3AF),
              ),
            ),
          ),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 10),
        ),
      ),
    );
  }

  Widget _buildLoginActions() {
    final isFormValid = _emailController.text.trim().isNotEmpty &&
        _passController.text.isNotEmpty;
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: (isFormValid && !_isLoading) ? _login : null,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              height: 50,
              decoration: BoxDecoration(
                color: isFormValid ? const Color(0xFF1E3A8A) : const Color(0xFFCBD5E1),
                borderRadius: BorderRadius.circular(14),
                boxShadow: isFormValid
                    ? [
                        BoxShadow(
                          color: const Color(0xFF1E3A8A).withOpacity(0.25),
                          blurRadius: 20,
                          offset: const Offset(0, 6),
                        ),
                      ]
                    : [],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (_isLoading) ...[
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2,
                      ),
                    ),
                  ] else ...[
                    Text(
                      'Log In',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: isFormValid ? Colors.white : const Color(0xFF94A3B8),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Icon(Icons.arrow_forward_rounded,
                        color: isFormValid ? Colors.white : const Color(0xFF94A3B8),
                        size: 13),
                  ],
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: _handleBiometricLogin,
          child: Container(
            width: 52,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Center(
              child: Icon(Icons.fingerprint_rounded, color: Color(0xFF1E3A8A), size: 20),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Row(
      children: [
        const Expanded(child: Divider(color: Color(0xFFE5E7EB), height: 1)),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Text(
            'OR',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF9CA3AF),
              letterSpacing: 2,
            ),
          ),
        ),
        const Expanded(child: Divider(color: Color(0xFFE5E7EB), height: 1)),
      ],
    );
  }

  Widget _buildGoogleButton() {
    final auth = context.watch<AuthProvider>();
    final isGoogleLoading = auth.status == AuthStatus.loading;

    return GestureDetector(
      onTap: isGoogleLoading || _isLoading
          ? null
          : () async {
              setState(() => _isLoading = true);
              try {
                final success = await context.read<AuthProvider>().signInWithGoogle();
                if (!mounted) return;
                if (!success && auth.errorMessage != null) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(auth.errorMessage!),
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
                      content: Text('Google sign-in error: $e'),
                      backgroundColor: const Color(0xFFEF4444),
                      behavior: SnackBarBehavior.floating,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  );
                }
              } finally {
                if (mounted) setState(() => _isLoading = false);
              }
            },
      child: Container(
        width: double.infinity,
        height: 50,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Center(
          child: isGoogleLoading || _isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    color: Color(0xFF0A1128),
                    strokeWidth: 2,
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _googleIcon(),
                    const SizedBox(width: 12),
                    Text(
                      'Sign in with Google',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0A1128),
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }

  Widget _googleIcon() {
    return const FaIcon(
      FontAwesomeIcons.google,
      size: 16,
      color: Color(0xFFEA4335),
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


import 'dart:math';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/app_background.dart';
import 'login_screen.dart';
import 'register_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late final AnimationController _splashOut;
  late final Animation<double> _splashFade;
  late final Animation<double> _splashScale;

  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulse;

  late final AnimationController _revealCtrl;
  late final Animation<double> _revealLogo;
  late final Animation<double> _revealLine1;
  late final Animation<double> _revealLine2;
  late final Animation<double> _revealDesc;
  late final Animation<double> _revealFloatA;
  late final Animation<double> _revealFloatB;
  late final Animation<double> _revealFloatC;

  late final AnimationController _sheetCtrl;
  late final Animation<double> _sheetSlide;

  late final AnimationController _btnCtrl;
  late final Animation<double> _btnFade;

  late final AnimationController _floatA;
  late final AnimationController _floatB;
  late final AnimationController _floatC;

  bool _splashGone = false;

  @override
  void initState() {
    super.initState();

    _splashOut = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _splashFade = Tween(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _splashOut, curve: Curves.easeInOut),
    );
    _splashScale = Tween(begin: 1.0, end: 1.1).animate(
      CurvedAnimation(parent: _splashOut, curve: Curves.easeInOut),
    );

    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _pulseCtrl.repeat(reverse: true);
    _pulse = Tween(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );

    _revealCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _revealLogo = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.16, 1, 0.3, 1));
    _revealLine1 = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.16, 1, 0.3, 1));
    _revealLine2 = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.16, 1, 0.3, 1));
    _revealDesc = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.16, 1, 0.3, 1));
    _revealFloatA = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.34, 1.56, 0.64, 1));
    _revealFloatB = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.34, 1.56, 0.64, 1));
    _revealFloatC = CurvedAnimation(parent: _revealCtrl, curve: const Cubic(0.34, 1.56, 0.64, 1));

    _sheetCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _sheetSlide = CurvedAnimation(parent: _sheetCtrl, curve: const Cubic(0.16, 1, 0.3, 1));

    _btnCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _btnFade = CurvedAnimation(parent: _btnCtrl, curve: Curves.easeOut);

    _floatA = AnimationController(vsync: this, duration: const Duration(seconds: 6));
    _floatA.repeat(reverse: true);
    _floatB = AnimationController(vsync: this, duration: const Duration(seconds: 8));
    _floatB.repeat(reverse: true);
    _floatC = AnimationController(vsync: this, duration: const Duration(seconds: 7));
    _floatC.repeat(reverse: true);

    Future.delayed(const Duration(seconds: 4), () {
      if (!mounted) return;
      _splashOut.forward().then((_) {
        if (mounted) setState(() => _splashGone = true);
      });
      _revealCtrl.forward();
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _sheetCtrl.forward();
      });
      Future.delayed(const Duration(milliseconds: 1000), () {
        if (mounted) _btnCtrl.forward();
      });
    });
  }

  @override
  void dispose() {
    _splashOut.dispose();
    _pulseCtrl.dispose();
    _revealCtrl.dispose();
    _sheetCtrl.dispose();
    _btnCtrl.dispose();
    _floatA.dispose();
    _floatB.dispose();
    _floatC.dispose();
    super.dispose();
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
          if (!_splashGone) _buildSplashOverlay(),
          _buildBgGrid(),
          _buildGlow(),
          _buildFloatingBtc(),
          _buildFloatingGiftcard(),
          _buildFloatingChart(),
          _buildTopContent(),
          _buildBottomCard(),
        ],
      ),
    );
  }

  // ── Splash overlay ──────────────────────────────────────────
  Widget _buildSplashOverlay() {
    return AnimatedBuilder(
      animation: Listenable.merge([_splashFade, _splashScale, _pulse]),
      builder: (context, _) {
        return Opacity(
          opacity: _splashFade.value,
          child: Transform.scale(
            scale: _splashScale.value,
            child: BackdropFilter(
              filter: ImageFilter.blur(
                sigmaX: 10 * _splashOut.value,
                sigmaY: 10 * _splashOut.value,
              ),
              child: Container(
                color: const Color(0xFF0A1128),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Transform.scale(
                      scale: 1.0 + _pulse.value * 0.05,
                      child: Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF3B82F6), width: 1),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2563EB).withOpacity(0.4 * _pulse.value),
                              blurRadius: 40,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(Icons.layers_rounded, color: Colors.white, size: 32),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ClipRect(
                      child: SizedBox(
                        height: 30,
                        child: OverflowBox(
                          minHeight: 0,
                          maxHeight: double.infinity,
                          alignment: Alignment.topCenter,
                          child: TweenAnimationBuilder<double>(
                            tween: Tween(begin: 1.0, end: 0.0),
                            duration: const Duration(milliseconds: 600),
                            curve: Curves.easeOut,
                            builder: (context, val, child) {
                              return Transform.translate(
                                offset: Offset(0, 30 * val),
                                child: Opacity(opacity: 1 - val, child: child),
                              );
                            },
                            child: Text(
                              'KATREX',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 24,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: 6,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  // ── Background grid ─────────────────────────────────────────
  Widget _buildBgGrid() {
    return FadeTransition(
      opacity: _revealLogo,
      child: CustomPaint(
        painter: _GridPainter(),
        size: Size.infinite,
      ),
    );
  }

  // ── Glow ────────────────────────────────────────────────────
  Widget _buildGlow() {
    return FadeTransition(
      opacity: _revealLogo,
      child: Positioned(
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
      ),
    );
  }

  // ── Floating BTC coin ───────────────────────────────────────
  Widget _buildFloatingBtc() {
    return Positioned(
      top: 70,
      right: 20,
      child: ScaleTransition(
        scale: _revealFloatA,
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
            width: 80,
            height: 80,
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
                child: Icon(Icons.currency_bitcoin_rounded, color: Color(0xFFF59E0B), size: 40),
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
      bottom: 260,
      left: 20,
      child: ScaleTransition(
        scale: _revealFloatB,
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
            width: 150,
            height: 90,
            padding: const EdgeInsets.all(12),
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
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
                      Icon(Icons.shopping_bag_rounded, color: Colors.white70, size: 18),
                      Icon(Icons.card_giftcard_rounded, color: Colors.white30, size: 12),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(width: 48, height: 6, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(4))),
                      const SizedBox(height: 6),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(width: 80, height: 6, decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(4))),
                          Text('\$100', style: GoogleFonts.robotoMono(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.9))),
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

  // ── Floating chart ──────────────────────────────────────────
  Widget _buildFloatingChart() {
    return Positioned(
      bottom: 360,
      right: 40,
      child: ScaleTransition(
        scale: _revealFloatC,
        child: AnimatedBuilder(
          animation: _floatC,
          builder: (context, child) {
            final t = _floatC.value * 2 * pi;
            return Transform.translate(
              offset: Offset(sin(t + 2) * 10, cos(t + 2) * 18),
              child: Transform.rotate(
                angle: -0.09 + sin(t + 2) * 0.08,
                child: child,
              ),
            );
          },
          child: Container(
            width: 120,
            height: 110,
            padding: const EdgeInsets.all(12),
            clipBehavior: Clip.antiAlias,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('ETH/USD', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white60)),
                      const Icon(Icons.show_chart_rounded, color: Color(0xFF818CF8), size: 14),
                    ],
                  ),
                  SizedBox(
                    height: 40,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        _bar(const Color(0xFF6366F1).withOpacity(0.4), 0.4),
                        const SizedBox(width: 4),
                        _bar(const Color(0xFF6366F1).withOpacity(0.6), 0.6),
                        const SizedBox(width: 4),
                        _bar(const Color(0xFF34D399).withOpacity(0.8), 0.8),
                        const SizedBox(width: 4),
                        _bar(const Color(0xFF34D399).withOpacity(0.9), 1.0),
                      ],
                    ),
                  ),
                  Text('+2.4%', style: GoogleFonts.robotoMono(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF34D399))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _bar(Color color, double h) {
    return Container(
      width: 8,
      height: 40 * h,
      decoration: BoxDecoration(
        color: color,
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(2), topRight: Radius.circular(2)),
        boxShadow: color.opacity > 0.7
            ? [BoxShadow(color: color.withOpacity(0.5), blurRadius: 10)]
            : null,
      ),
    );
  }

  // ── Top content (logo + hero text) ──────────────────────────
  Widget _buildTopContent() {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(32, 60, 32, 0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.start,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _maskReveal(_revealLogo, _buildBrandRow()),
              const SizedBox(height: 32),
              _maskReveal(_revealLine1, _buildHeroLine('Trade Crypto', Colors.white)),
              _maskReveal(_revealLine2, _buildHeroLine('& Giftcards.', const Color(0xFF3B82F6))),
              const SizedBox(height: 20),
              _maskReveal(_revealDesc, SizedBox(
                width: 260,
                child: Text(
                  'Instantly buy, sell, and swap digital assets and premium giftcards at the best rates.',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF93C5FD).withOpacity(0.7),
                    height: 1.5,
                  ),
                ),
              )),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBrandRow() {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF3B82F6), width: 1),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF2563EB).withOpacity(0.4),
                blurRadius: 20,
                spreadRadius: 1,
              ),
            ],
          ),
          child: const Icon(Icons.layers_rounded, color: Colors.white, size: 16),
        ),
        const SizedBox(width: 12),
        Text(
          'KATREX',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 18,
            fontWeight: FontWeight.w900,
            color: Colors.white,
            letterSpacing: 4,
          ),
        ),
      ],
    );
  }

  Widget _buildHeroLine(String text, Color color) {
    return Text(
      text,
      style: GoogleFonts.plusJakartaSans(
        fontSize: 40,
        fontWeight: FontWeight.w900,
        color: color,
        letterSpacing: -1,
        height: 1.05,
      ),
    );
  }

  Widget _maskReveal(Animation<double> anim, Widget child) {
    return ClipRect(
      child: AnimatedBuilder(
        animation: anim,
        builder: (context, _) {
          return Align(
            alignment: Alignment.topLeft,
            heightFactor: anim.value.clamp(0.0, 1.0),
            child: Padding(
              padding: EdgeInsets.only(bottom: 8 * (1 - anim.value)),
              child: Opacity(opacity: anim.value, child: child),
            ),
          );
        },
      ),
    );
  }

  // ── Bottom action card ──────────────────────────────────────
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
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(40),
              topRight: Radius.circular(40),
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0x66000000),
                blurRadius: 50,
                offset: Offset(0, -20),
              ),
            ],
          ),
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 48,
                height: 6,
                decoration: BoxDecoration(
                  color: const Color(0xFFE5E7EB),
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Get Started',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF1E3A8A),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Join thousands of users trading on Katrex today.',
                textAlign: TextAlign.center,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 24),
              FadeTransition(
                opacity: _btnFade,
                child: Column(
                  children: [
                    _primaryButton(),
                    const SizedBox(height: 12),
                    _secondaryButton(),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _primaryButton() {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const RegisterScreen()),
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF1E3A8A),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E3A8A).withOpacity(0.3),
              blurRadius: 24,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Create an account',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 14),
          ],
        ),
      ),
    );
  }

  Widget _secondaryButton() {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const LoginScreen()),
        );
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFF3F4F6),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Center(
          child: Text(
            'Sign In',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF1E3A8A),
            ),
          ),
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

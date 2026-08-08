import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SharedBottomNav extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onTap;

  const SharedBottomNav({
    super.key,
    required this.selectedIndex,
    required this.onTap,
  });

  static const _navHeight = 64.0;
  static const _indicatorSize = 64.0;
  static const _animDuration = Duration(milliseconds: 500);
  static const _animCurve = Cubic(0.68, -0.55, 0.265, 1.55);

  final List<_NavItemData> _items = const [
    _NavItemData(icon: Icons.home_rounded, label: 'Home'),
    _NavItemData(icon: Icons.account_balance_wallet_rounded, label: 'Wallet'),
    _NavItemData(icon: Icons.swap_horiz_rounded, label: 'Trade'),
    _NavItemData(icon: Icons.receipt_long_rounded, label: 'History'),
    _NavItemData(icon: Icons.headset_mic_rounded, label: 'Support'),
  ];

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final slotWidth = width / _items.length;

        return SizedBox(
          height: _navHeight + 10,
          child: TweenAnimationBuilder<double>(
            tween: Tween(end: selectedIndex.toDouble()),
            duration: _animDuration,
            curve: _animCurve,
            builder: (context, value, child) {
              final double loc = slotWidth * value + slotWidth / 2;

              return Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.bottomCenter,
                children: [
                  Positioned(
                    bottom: 22,
                    left: loc - _indicatorSize / 2,
                    child: _buildIndicator(),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: CustomPaint(
                      painter: _CutoutPainter(loc: loc),
                      child: child,
                    ),
                  ),
                ],
              );
            },
            child: SizedBox(
              height: _navHeight,
              child: Row(
                children: List.generate(_items.length, (i) {
                  return Expanded(child: _buildItem(i));
                }),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildIndicator() {
    return SizedBox(
      width: _indicatorSize,
      height: _indicatorSize,
      child: Center(
        child: Container(
          width: 52,
          height: 52,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFF2563EB),
            boxShadow: [
              BoxShadow(
                color: Color(0x402563EB),
                blurRadius: 12,
                spreadRadius: 2,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildItem(int index) {
    final item = _items[index];
    final isActive = selectedIndex == index;

    return GestureDetector(
      onTap: () => onTap(index),
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        height: _navHeight,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.center,
          children: [
            if (isActive) ...[
              AnimatedPositioned(
                duration: _animDuration,
                curve: _animCurve,
                bottom: 40,
                child: Icon(
                  item.icon,
                  size: index == 2 ? 32 : 28,
                  color: Colors.white,
                ),
              ),
              AnimatedPositioned(
                duration: _animDuration,
                curve: _animCurve,
                bottom: 4,
                child: Text(
                  item.label,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF2563EB),
                  ),
                ),
              ),
            ]
            else
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      item.icon,
                      size: index == 2 ? 28 : 24,
                      color: const Color(0xFF71717A),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.label,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF71717A),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _NavItemData {
  final IconData icon;
  final String label;

  const _NavItemData({required this.icon, required this.label});
}

class _CutoutPainter extends CustomPainter {
  final double loc;

  _CutoutPainter({required this.loc});

  @override
  void paint(Canvas canvas, Size size) {
    const double holeRadius = 34.0;
    const double dip = 36.0;
    final double start = loc - holeRadius;
    final double end = loc + holeRadius;

    final rectPath = Path()
      ..addRRect(RRect.fromRectAndRadius(
        Rect.fromLTWH(0, 0, size.width, size.height),
        const Radius.circular(24.0),
      ));

    final cutoutPath = Path();
    cutoutPath.moveTo(start - 18, -10);
    cutoutPath.lineTo(start - 18, 0);
    cutoutPath.cubicTo(start, 0, start, dip, loc, dip);
    cutoutPath.cubicTo(end, dip, end, 0, end + 18, 0);
    cutoutPath.lineTo(end + 18, -10);
    cutoutPath.close();

    final path = Path.combine(PathOperation.difference, rectPath, cutoutPath);

    // Shadow
    final shadowPaint = Paint()
      ..color = Colors.black.withOpacity(0.3)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 12);
    canvas.save();
    canvas.translate(0, 10);
    canvas.drawPath(path, shadowPaint);
    canvas.restore();

    // Fill
    final fillPaint = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.fill;
    canvas.drawPath(path, fillPaint);
  }

  @override
  bool shouldRepaint(covariant _CutoutPainter oldDelegate) {
    return oldDelegate.loc != loc;
  }
}

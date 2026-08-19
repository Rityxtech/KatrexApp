import 'package:flutter/material.dart';

/// A reusable full-screen panel that slides in from the right side.
///
/// Usage:
/// ```dart
/// RightSlidePanel.show(
///   context,
///   title: 'KYC Verification',
///   builder: (context) => MyContent(),
/// );
/// ```
///
/// The panel covers the full screen with a slide animation from right to left.
/// Tapping the backdrop or the back button dismisses it with a reverse animation.
class RightSlidePanel extends StatefulWidget {
  final String title;
  final Widget child;

  const RightSlidePanel({
    super.key,
    required this.title,
    required this.child,
  });

  /// Shows the panel as a route with a right-to-left slide transition.
  static Future<T?> show<T>(
    BuildContext context, {
    required String title,
    required Widget child,
  }) {
    return Navigator.of(context).push<T>(
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) =>
            RightSlidePanel(title: title, child: child),
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          final offset = Tween<Offset>(
            begin: const Offset(1.0, 0.0),
            end: Offset.zero,
          ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic));
          return SlideTransition(position: offset, child: child);
        },
        reverseTransitionDuration: const Duration(milliseconds: 250),
        transitionDuration: const Duration(milliseconds: 300),
        opaque: false,
      ),
    );
  }

  @override
  State<RightSlidePanel> createState() => _RightSlidePanelState();
}

class _RightSlidePanelState extends State<RightSlidePanel> {
  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Container(
        width: size.width,
        height: size.height,
        decoration: const BoxDecoration(
          color: Color(0xFF0A0F1F),
        ),
        child: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: const Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18),
                      ),
                    ),
                    Text(
                      widget.title,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -0.5,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: Container(
                        width: 36,
                        height: 36,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.06),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: const Icon(Icons.close_rounded, color: Colors.white, size: 18),
                      ),
                    ),
                  ],
                ),
              ),
              // Content
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 20),
                  child: widget.child,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:google_fonts/google_fonts.dart';

const _ki = Color(0xFF6366F1);
const _kid = Color(0xFF4F46E5);

/// A reusable glass-style modal bottom sheet with dark blurred background.
///
/// Usage:
/// ```dart
/// showModalBottomSheet(
///   context: context,
///   backgroundColor: Colors.transparent,
///   isScrollControlled: true,
///   builder: (_) => GlassModalSheet(
///     title: 'Filters',
///     child: Column(children: [ ... ]),
///   ),
/// );
/// ```
class GlassModalSheet extends StatelessWidget {
  final String title;
  final Widget child;
  final bool showCloseButton;
  final VoidCallback? onClose;
  final double? height;

  const GlassModalSheet({
    super.key,
    required this.title,
    required this.child,
    this.showCloseButton = true,
    this.onClose,
    this.height,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: height,
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A).withOpacity(0.60),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            // Header: drag handle + close button
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const SizedBox(width: 32),
                Container(width: 48, height: 6, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(3))),
                if (showCloseButton)
                  GestureDetector(
                    onTap: onClose ?? () => Navigator.pop(context),
                    child: Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(color: Colors.transparent, shape: BoxShape.circle, border: Border.all(color: Colors.white24)),
                      child: const Icon(Icons.close_rounded, size: 12, color: Colors.white70),
                    ),
                  )
                else
                  const SizedBox(width: 32),
              ]),
            ),
            // Title
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
              child: Align(alignment: Alignment.centerLeft, child: Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5))),
            ),
            const SizedBox(height: 12),
            // Content
            Expanded(child: Padding(padding: const EdgeInsets.fromLTRB(24, 0, 24, 16), child: child)),
          ]),
        ),
      ),
    );
  }
}

/// A standard section label inside a [GlassModalSheet].
class GlassModalLabel extends StatelessWidget {
  final String text;
  const GlassModalLabel(this.text, {super.key});
  @override
  Widget build(BuildContext context) {
    return Text(text.toUpperCase(), style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white60, letterSpacing: 1.5));
  }
}

/// A standard selectable option chip inside a [GlassModalSheet].
class GlassModalOption extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const GlassModalOption({super.key, required this.label, required this.active, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: active ? _ki.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: active ? _ki : Colors.white24),
        ),
        child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: active ? FontWeight.w800 : FontWeight.w600, color: active ? Colors.white : Colors.white70)),
      ),
    );
  }
}

/// A standard action button row for the bottom of a [GlassModalSheet].
class GlassModalActions extends StatelessWidget {
  final VoidCallback? onReset;
  final VoidCallback onApply;
  final String resetLabel;
  final String applyLabel;
  const GlassModalActions({super.key, this.onReset, required this.onApply, this.resetLabel = 'Reset', this.applyLabel = 'Apply'});
  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Expanded(child: GestureDetector(
        onTap: onReset,
        child: Container(
          height: 40,
          decoration: BoxDecoration(color: Colors.transparent, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white24)),
          child: Center(child: Text(resetLabel, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white70))),
        ),
      )),
      const SizedBox(width: 12),
      Expanded(flex: 2, child: GestureDetector(
        onTap: onApply,
        child: Container(
          height: 40,
          decoration: BoxDecoration(gradient: const LinearGradient(colors: [_ki, _kid]), borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: _ki.withOpacity(0.3), blurRadius: 8)]),
          child: Center(child: Text(applyLabel, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white))),
        ),
      )),
    ]);
  }
}

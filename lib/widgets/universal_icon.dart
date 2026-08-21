import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';

/// A widget that renders either a Material [IconData] or a Font Awesome [FaIconData].
///
/// Needed because font_awesome_flutter 11.0.0 made [FaIconData] no longer
/// extend [IconData], so maps/fields that hold both types must use [Object]
/// and dispatch at render time.
class UniversalIcon extends StatelessWidget {
  final Object? icon;
  final double? size;
  final Color? color;
  final Key? iconKey;

  const UniversalIcon(this.icon, {super.key, this.size, this.color, this.iconKey});

  @override
  Widget build(BuildContext context) {
    if (icon == null) return const SizedBox.shrink();
    if (icon is IconData) {
      return Icon(icon as IconData, key: iconKey, size: size, color: color);
    }
    try {
      if (icon is FaIconData) {
        return FaIcon(icon as FaIconData, key: iconKey, size: size, color: color);
      }
    } catch (_) {}
    return const SizedBox.shrink();
  }
}

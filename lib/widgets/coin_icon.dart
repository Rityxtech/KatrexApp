import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '../utils/coin_meta.dart';

/// Renders official crypto coin logos consistently across screens.
/// Matches the CoinGecko assets used on the homepage.
class CoinIcon extends StatelessWidget {
  final String symbol;
  final double size;
  final bool showBackground;
  final Color? backgroundColor;

  const CoinIcon({
    super.key,
    required this.symbol,
    this.size = 24,
    this.showBackground = false,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    final meta = CoinMeta.forTicker(symbol);
    final iconUrl = meta['iconUrl'] as String? ?? '';
    final color = (meta['color'] as Color?) ?? const Color(0xFF9CA3AF);

    Widget imageWidget;
    if (iconUrl.isNotEmpty) {
      imageWidget = CachedNetworkImage(
        imageUrl: iconUrl,
        width: size,
        height: size,
        fit: BoxFit.contain,
        placeholder: (context, url) => SizedBox(
          width: size,
          height: size,
          child: Center(
            child: SizedBox(
              width: size * 0.6,
              height: size * 0.6,
              child: CircularProgressIndicator(
                strokeWidth: 1.5,
                color: color.withOpacity(0.5),
              ),
            ),
          ),
        ),
        errorWidget: (context, url, error) => _fallbackIcon(color),
      );
    } else {
      imageWidget = _fallbackIcon(color);
    }

    if (showBackground) {
      final bg = backgroundColor ?? color.withOpacity(0.15);
      return Container(
        width: size + 14,
        height: size + 14,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: bg,
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Center(child: imageWidget),
      );
    }

    return imageWidget;
  }

  Widget _fallbackIcon(Color color) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: color.withOpacity(0.2),
      ),
      child: Center(
        child: Text(
          symbol.isNotEmpty ? symbol[0].toUpperCase() : '?',
          style: TextStyle(
            color: color,
            fontWeight: FontWeight.w900,
            fontSize: size * 0.55,
          ),
        ),
      ),
    );
  }
}

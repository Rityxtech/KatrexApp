import 'dart:convert';
import 'package:flutter/material.dart';

/// Reusable avatar image renderer that transparently handles:
/// 1. Remote HTTP/HTTPS image URLs (Firebase Storage)
/// 2. Embedded Base64 Data URIs (`data:image/...`)
/// 3. Fallback placeholder widgets or person icons
class AppAvatar extends StatelessWidget {
  final String? avatarUrl;
  final double size;
  final Widget? fallback;

  const AppAvatar({
    super.key,
    required this.avatarUrl,
    required this.size,
    this.fallback,
  });

  @override
  Widget build(BuildContext context) {
    if (avatarUrl == null || avatarUrl!.isEmpty) {
      return fallback ?? Icon(Icons.person, color: Colors.white, size: size * 0.5);
    }

    final url = avatarUrl!;
    if (url.startsWith('data:image')) {
      try {
        final commaIndex = url.indexOf(',');
        final base64Data = commaIndex != -1 ? url.substring(commaIndex + 1) : url;
        final bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) =>
              fallback ?? Icon(Icons.person, color: Colors.white, size: size * 0.5),
        );
      } catch (_) {
        return fallback ?? Icon(Icons.person, color: Colors.white, size: size * 0.5);
      }
    }

    return Image.network(
      url,
      width: size,
      height: size,
      fit: BoxFit.cover,
      errorBuilder: (_, __, ___) =>
          fallback ?? Icon(Icons.person, color: Colors.white, size: size * 0.5),
    );
  }
}

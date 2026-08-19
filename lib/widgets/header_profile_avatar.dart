import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../screens/profile_screen.dart';

/// A compact profile avatar button for screen headers.
///
/// Shows the user's avatar (or a fallback person icon) in a 36x36 circle.
/// Tapping navigates to the ProfileScreen.
class HeaderProfileAvatar extends StatelessWidget {
  const HeaderProfileAvatar({super.key, this.size = 36});

  final double size;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const ProfileScreen()),
        );
      },
      child: Builder(builder: (context) {
        final avatarUrl = context.select<AuthProvider, String?>((auth) => auth.userModel?.avatarUrl);
        final hasAvatar = avatarUrl != null && avatarUrl.isNotEmpty;
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withOpacity(0.06),
            border: Border.all(color: Colors.white.withOpacity(0.12)),
          ),
          child: ClipOval(
            child: hasAvatar
                ? Image.network(
                    avatarUrl,
                    width: size,
                    height: size,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Icon(Icons.person, size: size * 0.5, color: Colors.white70),
                  )
                : Icon(Icons.person, size: size * 0.5, color: Colors.white70),
          ),
        );
      }),
    );
  }
}

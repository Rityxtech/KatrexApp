import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/notification_model.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../widgets/app_background.dart';
import 'withdraw_screen.dart';
import 'trade_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {

  Color _iconColorForType(NotificationType type) {
    switch (type) {
      case NotificationType.deposit: return const Color(0xFF34D399);
      case NotificationType.withdrawal: return const Color(0xFFEF4444);
      case NotificationType.login: return const Color(0xFFF59E0B);
      case NotificationType.bonus: return const Color(0xFF8B5CF6);
      case NotificationType.trade: return const Color(0xFF3B82F6);
      case NotificationType.security: return const Color(0xFFEF4444);
      case NotificationType.general: return const Color(0xFF9CA3AF);
    }
  }

  IconData _iconForType(NotificationType type) {
    switch (type) {
      case NotificationType.deposit: return Icons.arrow_downward_rounded;
      case NotificationType.withdrawal: return Icons.arrow_upward_rounded;
      case NotificationType.login: return Icons.shield_rounded;
      case NotificationType.bonus: return Icons.card_giftcard_rounded;
      case NotificationType.trade: return Icons.swap_horiz_rounded;
      case NotificationType.security: return Icons.lock_rounded;
      case NotificationType.general: return Icons.notifications_rounded;
    }
  }

  void _openNotification(NotificationModel n, Color iconColor) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _buildDetailSheet(n, iconColor),
    );
  }

  @override
  Widget build(BuildContext context) {
    final notifProvider = context.watch<NotificationProvider>();
    final notifications = notifProvider.notifications;

    return Scaffold(
      body: AppBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(notifications.isEmpty, notifProvider),
              Expanded(
                child: notifications.isEmpty
                    ? _buildEmptyState()
                    : _buildList(notifications, notifProvider),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(bool isEmpty, NotificationProvider provider) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          _headerBtn(Icons.chevron_left_rounded, () => Navigator.pop(context)),
          Text('Notifications', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
          _headerBtn(FontAwesomeIcons.broom, isEmpty ? null : () async {
            final uid = context.read<AuthProvider>().firebaseUser?.uid;
            if (uid != null) await provider.clearAll(uid);
          }),
        ],
      ),
    );
  }

  Widget _headerBtn(dynamic icon, VoidCallback? onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Center(
          child: icon is FaIconData
              ? FaIcon(icon, size: 12, color: onTap == null ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF))
              : Icon(icon as IconData, size: 12, color: onTap == null ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF)),
        ),
      ),
    );
  }

  Widget _buildList(List<NotificationModel> notifications, NotificationProvider provider) {
    final now = DateTime.now();
    final today = <NotificationModel>[];
    final yesterday = <NotificationModel>[];
    final older = <NotificationModel>[];

    for (final n in notifications) {
      final diff = now.difference(n.createdAt);
      if (diff.inDays == 0) {
        today.add(n);
      } else if (diff.inDays == 1) {
        yesterday.add(n);
      } else {
        older.add(n);
      }
    }

    return ListView(
      padding: const EdgeInsets.only(top: 16, bottom: 24),
      children: [
        if (today.isNotEmpty) ...[
          _buildDateGroup('Today', today, provider),
          const SizedBox(height: 20),
        ],
        if (yesterday.isNotEmpty) ...[
          _buildDateGroup('Yesterday', yesterday, provider),
          const SizedBox(height: 20),
        ],
        if (older.isNotEmpty) _buildDateGroup('Earlier', older, provider),
      ],
    );
  }

  Widget _buildDateGroup(String label, List<NotificationModel> items, NotificationProvider provider) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 8),
            child: Text(label.toUpperCase(), style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
          ),
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              children: List.generate(items.length, (i) {
                final n = items[i];
                final isLast = i == items.length - 1;
                return _buildNotifItem(n, isLast, provider);
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotifItem(NotificationModel n, bool isLast, NotificationProvider provider) {
    final iconColor = _iconColorForType(n.type);
    final iconData = _iconForType(n.type);
    final isRead = n.isRead;

    return GestureDetector(
      onTap: () {
        if (!isRead) provider.markAsRead(n.id);
        _openNotification(n, iconColor);
      },
      child: Stack(
        children: [
          if (!isRead)
            Positioned(
              left: 0, top: 12, bottom: 12,
              child: Center(
                child: Container(
                  width: 3, height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFF3B82F6),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          Container(
            color: !isRead ? const Color(0xFF3B82F6).withOpacity(0.05) : Colors.transparent,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: iconColor.withOpacity(isRead ? 0.1 : 0.2),
                      border: Border.all(color: iconColor.withOpacity(isRead ? 0.1 : 0.3)),
                    ),
                    child: Center(child: Icon(iconData, size: 14, color: iconColor)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              child: Text(n.title, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: isRead ? const Color(0xFFD1D5DB) : Colors.white)),
                            ),
                            const SizedBox(width: 8),
                            Text(DateFormat('h:mm a').format(n.createdAt), style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: isRead ? const Color(0xFF6B7280) : const Color(0xFF60A5FA))),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(n.preview ?? n.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: isRead ? const Color(0xFF6B7280) : const Color(0xFF9CA3AF), height: 1.4)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (!isLast)
            Padding(padding: const EdgeInsets.only(left: 68), child: Divider(height: 1, color: Colors.white.withOpacity(0.05))),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withOpacity(0.05),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: const Center(child: FaIcon(FontAwesomeIcons.bellSlash, size: 32, color: Color(0xFF6B7280))),
            ),
            const SizedBox(height: 24),
            Text("You're all caught up!", style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
            const SizedBox(height: 8),
            Text('There are no new notifications right now. Check back later for updates on your trades and account.', textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w500, color: const Color(0xFF9CA3AF), height: 1.5)),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailSheet(NotificationModel n, Color iconColor) {
    const ctaColor = Color(0xFF2563EB);
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xF20F1423),
        borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
        border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
        boxShadow: [BoxShadow(color: Color(0x80000000), blurRadius: 40, offset: Offset(0, -10))],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
            const SizedBox(height: 24),
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(shape: BoxShape.circle, color: iconColor.withOpacity(0.2), border: Border.all(color: iconColor.withOpacity(0.3))),
              child: Center(child: Icon(_iconForType(n.type), size: 20, color: iconColor)),
            ),
            const SizedBox(height: 16),
            Text(n.title, textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
            const SizedBox(height: 8),
            Text(DateFormat('MMM d, h:mm a').format(n.createdAt), style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.1))),
              child: Text(n.body, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w500, color: const Color(0xFFD1D5DB), height: 1.6)),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                      child: Center(child: Text('Close', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white))),
                    ),
                  ),
                ),
                if (n.ctaLabel != null) ...[
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                        final route = n.ctaRoute;
                        if (route == null || route.isEmpty) return;
                        switch (route) {
                          case 'deposit':
                            // Let the user tap from Dashboard
                            break;
                          case 'withdraw':
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const WithdrawScreen()));
                            break;
                          case 'trade':
                            Navigator.push(context, MaterialPageRoute(builder: (_) => const TradeScreen()));
                            break;
                          default:
                            break;
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(color: ctaColor, borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: ctaColor.withOpacity(0.4), blurRadius: 15)]),
                        child: Center(child: Text(n.ctaLabel!, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white))),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

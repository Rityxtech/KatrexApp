
import 'dart:ui';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/support_service.dart';
import '../widgets/app_background.dart';
import '../widgets/header_profile_avatar.dart';
import '../widgets/notification_icon.dart';

Widget _btn({required IconData i, required VoidCallback t, double s = 36}) => GestureDetector(
  onTap: t,
  child: Container(
    width: s, height: s,
    decoration: BoxDecoration(
      color: Colors.white.withOpacity(0.06),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: Colors.white.withOpacity(0.1)),
    ),
    child: Icon(i, color: Colors.white, size: 18),
  ),
);

Widget _avatar(String url, [double size = 40]) => Container(
  width: size, height: size,
  decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: const Color(0xFF0A0F1F), width: 2)),
  child: ClipOval(
    child: Image.network(url, width: size, height: size, fit: BoxFit.cover,
      errorBuilder: (_, __, ___) => Container(color: const Color(0xFF2563EB), child: Icon(Icons.person, color: Colors.white, size: size * 0.5)),
    ),
  ),
);

/// Bot avatar for the AI assistant — gradient circle with a smart-toy icon.
/// Used in place of the fake human avatar now that live chat is Gemini-backed.
Widget _botAvatar(double size) => Container(
  width: size, height: size,
  decoration: BoxDecoration(
    shape: BoxShape.circle,
    gradient: const LinearGradient(
      begin: Alignment.topLeft, end: Alignment.bottomRight,
      colors: [Color(0xFF8B5CF6), Color(0xFF3B82F6)],
    ),
    border: Border.all(color: const Color(0xFF0A0F1F), width: 2),
    boxShadow: [BoxShadow(color: const Color(0xFF3B82F6).withOpacity(0.35), blurRadius: 10)],
  ),
  child: Icon(Icons.smart_toy_rounded, color: Colors.white, size: size * 0.55),
);

class CustomerSupportScreen extends StatefulWidget {
  final ValueChanged<int>? onTabSwitch;
  const CustomerSupportScreen({super.key, this.onTabSwitch});
  @override State<CustomerSupportScreen> createState() => _CustomerSupportScreenState();
}

class _CustomerSupportScreenState extends State<CustomerSupportScreen> {
  final ScrollController _scrollController = ScrollController();
  final int _pageSize = 10;
  int _currentPage = 1;
  bool _isLoadingMore = false;
  bool _hasMore = true;
  List<QueryDocumentSnapshot> _allTickets = [];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMore) {
      _loadMore();
    }
  }

  void _loadMore() {
    if (_allTickets.length <= _currentPage * _pageSize) {
      _hasMore = false;
      if (mounted) setState(() {});
      return;
    }
    setState(() => _isLoadingMore = true);
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      _currentPage++;
      _isLoadingMore = false;
      setState(() {});
    });
  }

  List<QueryDocumentSnapshot> _getPaginatedTickets() {
    final count = _currentPage * _pageSize;
    return _allTickets.take(count).toList();
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, result) {
      if (!didPop) {
        widget.onTabSwitch?.call(0);
      }
    },
    child: Scaffold(
    backgroundColor: const Color(0xFF000000),
    body: Stack(
      fit: StackFit.expand,
      children: [
        const AppBackground(child: SizedBox.expand()),
        SafeArea(child: _main()),
      ],
    ),
    ),
  );

  Widget _main() => Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            GestureDetector(
              onTap: () => widget.onTabSwitch?.call(0),
              child: const HeaderProfileAvatar(),
            ),
            Text('Help Center', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
            const NotificationIcon(),
          ],
        ),
        const SizedBox(height: 16),
        Expanded(
          child: ListView(
            controller: _scrollController,
            padding: const EdgeInsets.only(bottom: 40),
            children: [
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('How can we help\nyou today?', style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white, height: 1.2)),
                    const SizedBox(height: 4),
                    Text('Our support team is available 24/7 to assist you.', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              _actionCard(
                title: 'Live Chat',
                subtitle: 'AI assistant • Instant replies',
                icon: Icons.chat_bubble_rounded,
                color: const Color(0xFF3B82F6),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportChatScreen())),
                trailing: _liveChatTrailing(),
                glow: true,
              ),
              _actionCard(
                title: 'Submit Ticket',
                subtitle: 'For complex issues & appeals',
                icon: Icons.receipt_long_rounded,
                color: const Color(0xFFA855F7),
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SupportTicketScreen())),
              ),
              _actionCard(
                title: 'Email Us',
                subtitle: 'support@katrex.com',
                icon: Icons.mail_rounded,
                color: const Color(0xFF10B981),
                onTap: () {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Email copied to clipboard!', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)), backgroundColor: const Color(0xFF10B981), behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))));
                },
              ),
              const SizedBox(height: 16),
              _ticketsSection(),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _liveChatTrailing() => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 56, height: 28,
        decoration: BoxDecoration(
          color: const Color(0xFF3B82F6).withOpacity(0.15),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.4)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.bolt_rounded, color: Color(0xFF60A5FA), size: 14),
            const SizedBox(width: 4),
            Text('AI', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA), letterSpacing: 0.5)),
          ],
        ),
      )
    ]
  );

  Widget _actionCard({required String title, required String subtitle, required IconData icon, required Color color, required VoidCallback onTap, Widget? trailing, bool glow = false}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          color: Colors.white.withOpacity(0.02),
          border: Border.all(color: Colors.white.withOpacity(0.05), width: 1),
          boxShadow: glow ? [BoxShadow(color: color.withOpacity(0.15), blurRadius: 18, offset: const Offset(0, 6))] : [],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  Container(
                    width: 44, height: 44,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: color.withOpacity(0.15),
                      border: Border.all(color: color.withOpacity(0.3), width: 1),
                      boxShadow: [BoxShadow(color: color.withOpacity(0.3), blurRadius: 12)],
                    ),
                    child: Icon(icon, color: color, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                        const SizedBox(height: 2),
                        Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: Colors.white60, fontWeight: FontWeight.w500)),
                      ],
                    ),
                  ),
                  trailing ?? const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white24, size: 16),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _ticketsSection() {
    final uid = context.read<AuthProvider>().firebaseUser!.uid;
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('support_tickets')
          .where('uid', isEqualTo: uid)
          .orderBy('createdAt', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.hasData) {
          _allTickets = snapshot.data!.docs;
          if (_allTickets.length > _currentPage * _pageSize) {
            _hasMore = true;
          }
        }
        final paginated = _getPaginatedTickets();
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text('Recent Tickets', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
              ],
            ),
            const SizedBox(height: 6),
            if (snapshot.connectionState == ConnectionState.waiting && _allTickets.isEmpty)
              _glassCard(child: const Padding(padding: EdgeInsets.all(20), child: Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Color(0xFF6B7280), strokeWidth: 1.5)))))
            else if (paginated.isEmpty)
              _glassCard(child: Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Center(child: Text('No tickets yet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))))))
            else
              _glassCard(
                child: Column(
                  children: [
                    ...paginated.asMap().entries.map((e) {
                      final doc = e.value;
                      final data = doc.data() as Map<String, dynamic>;
                      final isLast = e.key == paginated.length - 1 && !_hasMore;
                      return _ticketItemFromData(data, showDivider: e.key != paginated.length - 1, onTap: () => _showTicketDetail(data));
                    }),
                    if (_isLoadingMore)
                      const Padding(padding: EdgeInsets.all(12), child: Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Color(0xFF6B7280), strokeWidth: 1.5)))),
                    if (!_hasMore && paginated.isNotEmpty)
                      Padding(padding: const EdgeInsets.all(12), child: Center(child: Text('No more tickets', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))))),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _glassCard({required Widget child, double radius = 16}) => ClipRRect(
    borderRadius: BorderRadius.circular(radius),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(radius),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 32, offset: const Offset(0, 8))],
        ),
        child: Padding(padding: const EdgeInsets.all(8), child: child),
      ),
    ),
  );

  Widget _ticketItem(Map t, {bool showDivider = true}) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: (t['color'] as Color).withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                  child: Text(t['status'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: t['color'], letterSpacing: 0.5)),
                ),
                Text(t['date'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ],
            ),
            const SizedBox(height: 6),
            Text(t['title'], style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(t['id'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                Row(
                  children: [
                    const Icon(Icons.chat_bubble_rounded, size: 11, color: Color(0xFF9CA3AF)),
                    const SizedBox(width: 4),
                    Text('${t['msgs']} msgs', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
      if (showDivider) const Divider(color: Color(0x0DFFFFFF), height: 16),
    ],
  );

  Widget _ticketItemFromData(Map<String, dynamic> data, {bool showDivider = true, VoidCallback? onTap}) {
    final status = (data['status'] as String?) ?? 'open';
    final statusUpper = status.toUpperCase();
    final statusColor = status == 'open'
        ? const Color(0xFF10B981)
        : status == 'resolved'
            ? const Color(0xFF3B82F6)
            : const Color(0xFFF59E0B);
    final title = (data['subject'] as String?) ?? (data['title'] as String?) ?? 'Support Ticket';
    final ticketId = (data['ticketId'] as String?) ?? '#${data['id'] ?? ''}';
    final createdAt = data['createdAt'] is Timestamp
        ? (data['createdAt'] as Timestamp).toDate()
        : DateTime.now();
    final dateStr = DateFormat('MMM d, y').format(createdAt);
    final msgs = (data['messageCount'] as int?) ?? 0;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: statusColor.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                      child: Text(statusUpper, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: statusColor, letterSpacing: 0.5)),
                    ),
                    Text(dateStr, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ],
                ),
                const SizedBox(height: 6),
                Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                const SizedBox(height: 6),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Text(ticketId, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                        const SizedBox(width: 8),
                        Icon(Icons.chevron_right_rounded, size: 14, color: const Color(0xFF9CA3AF)),
                      ],
                    ),
                    Row(
                      children: [
                        const Icon(Icons.chat_bubble_rounded, size: 11, color: Color(0xFF9CA3AF)),
                        const SizedBox(width: 4),
                        Text('$msgs msgs', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                      ],
                    ),
                  ],
                ),
              ],
            ),
          ),
          if (showDivider) const Divider(color: Color(0x0DFFFFFF), height: 16),
        ],
      ),
    );
  }

  void _showTicketDetail(Map<String, dynamic> data) {
    final status = (data['status'] as String?) ?? 'open';
    final statusColor = status == 'open'
        ? const Color(0xFF10B981)
        : status == 'resolved'
            ? const Color(0xFF3B82F6)
            : const Color(0xFFF59E0B);
    final title = (data['subject'] as String?) ?? (data['title'] as String?) ?? 'Support Ticket';
    final ticketId = (data['ticketId'] as String?) ?? '#${data['id'] ?? ''}';
    final createdAt = data['createdAt'] is Timestamp
        ? (data['createdAt'] as Timestamp).toDate()
        : DateTime.now();
    final dateStr = DateFormat('MMM d, y, h:mm a').format(createdAt);
    final description = (data['description'] as String?) ?? 'No description provided.';
    final category = (data['category'] as String?) ?? 'General';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            decoration: BoxDecoration(
              color: const Color(0xFF0A0F1F).withOpacity(0.95),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Ticket Details', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle),
                            child: const Icon(Icons.close_rounded, color: Colors.grey, size: 16),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _detailRow('Ticket ID', ticketId),
                    const SizedBox(height: 12),
                    _detailRow('Category', category),
                    const SizedBox(height: 12),
                    _detailRow('Status', status.toUpperCase(), valueColor: statusColor),
                    const SizedBox(height: 12),
                    _detailRow('Date', dateStr),
                    const SizedBox(height: 12),
                    _detailRow('Subject', title),
                    const SizedBox(height: 12),
                    Text('Description', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white54, letterSpacing: 1)),
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.08)),
                      ),
                      child: Text(description, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white70, height: 1.4)),
                    ),
                    const SizedBox(height: 20),
                    GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                      },
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)]),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text('Close', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, {Color? valueColor}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 80,
          child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white54)),
        ),
        Expanded(
          child: Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: valueColor ?? Colors.white)),
        ),
      ],
    );
  }
}

class SupportTicketScreen extends StatefulWidget {
  const SupportTicketScreen({super.key});
  @override State<SupportTicketScreen> createState() => _SupportTicketScreenState();
}

class _SupportTicketScreenState extends State<SupportTicketScreen> {
  String _selectedCategory = 'Deposit / Withdrawal Issue';
  final _subjectController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _submitTicket() async {
    if (_isSubmitting) return;

    final subject = _subjectController.text.trim();
    final description = _descriptionController.text.trim();

    if (subject.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please enter a subject', style: GoogleFonts.plusJakartaSans()),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (description.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Please enter a description', style: GoogleFonts.plusJakartaSans()),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final res = await SupportService.createTicket(
        category: _selectedCategory,
        subject: subject,
        description: description,
      );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      if (res['success'] == true || res['ticketId'] != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ticket created successfully!', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(res['error'] ?? 'Failed to create ticket', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error submitting ticket: $e', style: GoogleFonts.plusJakartaSans()),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  final List<String> _categories = [
    'Deposit / Withdrawal Issue',
    'Account Verification (KYC)',
    'Trade / Swap Issue',
    'Security & Authentication',
    'Other',
  ];

  void _showCategoryModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: const Color(0xFF0A0F1F),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 8),
              Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
              const SizedBox(height: 16),
              Text('Select Category', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
              const SizedBox(height: 16),
              ..._categories.map((c) => ListTile(
                onTap: () {
                  setState(() => _selectedCategory = c);
                  Navigator.pop(context);
                },
                contentPadding: const EdgeInsets.symmetric(horizontal: 24),
                title: Text(c, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600, color: _selectedCategory == c ? const Color(0xFF3B82F6) : Colors.white)),
                trailing: _selectedCategory == c ? const Icon(Icons.check_circle_rounded, color: Color(0xFF3B82F6), size: 20) : null,
              )),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    resizeToAvoidBottomInset: true,
    backgroundColor: const Color(0xFF000000),
    body: Stack(
      fit: StackFit.expand,
      children: [
        const AppBackground(child: SizedBox.expand()),
        SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _btn(i: Icons.arrow_back_rounded, t: () => Navigator.pop(context)),
                    Text('Create Ticket', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
                    const SizedBox(width: 36),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  children: [
                    Text('Tell us how we can help', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, height: 1.2)),
                    const SizedBox(height: 4),
                    Text('Our technical team will investigate and get back to you via email.', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white54)),
                    const SizedBox(height: 16),
                    _field('CATEGORY', _select(_selectedCategory, _showCategoryModal)),
                    const SizedBox(height: 12),
                    _field('SUBJECT', _input('E.g. Bank transfer not reflecting', _subjectController)),
                    const SizedBox(height: 12),
                    _field(
                      'DESCRIPTION',
                      Container(
                        height: 90,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: Colors.white.withOpacity(0.08)),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: BackdropFilter(
                            filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                            child: Padding(
                              padding: const EdgeInsets.all(10),
                              child: TextField(
                                controller: _descriptionController,
                                maxLines: null, expands: true,
                                style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white),
                                decoration: InputDecoration(
                                  hintText: 'Please describe your issue in detail...',
                                  hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white30),
                                  border: InputBorder.none, contentPadding: EdgeInsets.zero,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _field(
                      'ATTACHMENTS (OPTIONAL)',
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB).withOpacity(0.04),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3), width: 1.0, style: BorderStyle.solid),
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [const Color(0xFF3B82F6).withOpacity(0.2), const Color(0xFF2563EB).withOpacity(0.1)],
                                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                                ),
                                shape: BoxShape.circle,
                                border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.2)),
                                boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.1), blurRadius: 10, spreadRadius: 2)],
                              ),
                              child: const Icon(Icons.cloud_upload_rounded, size: 18, color: Color(0xFF60A5FA)),
                            ),
                            const SizedBox(height: 8),
                            Text('Tap to upload images', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA))),
                            const SizedBox(height: 2),
                            Text('JPG, PNG, PDF up to 5MB', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w500, color: Colors.white54)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: _submitTicket,
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)]),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 15, offset: const Offset(0, 4))],
                        ),
                        child: Center(
                          child: _isSubmitting
                              ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text('Submit Ticket', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.send_rounded, color: Colors.white, size: 16),
                                  ],
                                ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _field(String l, Widget c) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(l, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white70, letterSpacing: 1.0)),
      const SizedBox(height: 6),
      c,
    ],
  );

  Widget _select(String v, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(10),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              children: [
                Expanded(child: Text(v, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white))),
                const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white70, size: 16),
              ],
            ),
          ),
        ),
      ),
    ),
  );

  Widget _input(String h, [TextEditingController? c]) => Container(
    decoration: BoxDecoration(
      color: Colors.white.withOpacity(0.03),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: Colors.white.withOpacity(0.08)),
    ),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
          child: TextField(
            controller: c,
            style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white),
            decoration: InputDecoration(
              hintText: h, hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white30),
              border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(vertical: 8),
            ),
          ),
        ),
      ),
    ),
  );
}

class SupportChatScreen extends StatefulWidget {
  const SupportChatScreen({super.key});
  @override State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  String? _chatId;
  bool _isInitializing = true;
  bool _isSending = false;
  final _msgController = TextEditingController();
  final _scrollController = ScrollController();
  final List<Map<String, dynamic>> _messages = [];

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _initChat();
  }

  void _onScroll() {
    // reserved for future pagination
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _initChat() async {
    try {
      final result = await SupportService.startAiChat();
      final chatId = result['chatId'] as String?;
      if (!mounted) return;
      setState(() {
        _chatId = chatId;
        _isInitializing = false;
      });
      // Mark as read on open
      if (chatId != null) {
        SupportService.markAiChatRead(chatId);
        // Load initial messages (one-time read, no live listener)
        final msgs = await SupportService.loadAiChatMessages(chatId);
        if (!mounted) return;
        setState(() {
          _messages.addAll(msgs);
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isInitializing = false);
      final msg = e.toString().contains('NOT_FOUND')
          ? 'AI chat is not available right now. Please check back later or submit a ticket.'
          : e.toString().contains('resource-exhausted')
              ? 'Chat service is temporarily busy. Please try again in a moment.'
              : 'Could not start chat. Would you like to submit a ticket instead?';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 5),
        action: SnackBarAction(
          label: 'Retry',
          textColor: Colors.white,
          onPressed: () {
            setState(() => _isInitializing = true);
            _initChat();
          },
        ),
      ));
    }
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty || _chatId == null || _isSending) return;
    _msgController.clear();
    setState(() => _isSending = true);

    // Optimistically add the user message to the local list
    final userMsg = <String, dynamic>{
      'senderRole': 'user',
      'senderUid': context.read<AuthProvider>().firebaseUser!.uid,
      'text': text,
      'createdAt': DateTime.now(),
    };
    setState(() => _messages.add(userMsg));
    _scrollToBottom();

    try {
      // The reply comes back directly from the server — no Firestore
      // listener needed. Both messages are persisted server-side for
      // the admin audit trail.
      final result = await SupportService.sendAiChatMessage(chatId: _chatId!, text: text);
      final reply = result['reply'] as String? ?? '';
      if (!mounted) return;

      // Add the AI reply to the local list
      final aiMsg = <String, dynamic>{
        'senderRole': 'ai',
        'text': reply,
        'createdAt': DateTime.now(),
      };
      setState(() => _messages.add(aiMsg));
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      final msg = e.toString().contains('resource-exhausted')
        ? 'You are sending messages too quickly. Please wait a few minutes.'
        : 'Failed to send message.';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(msg, style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w600)),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ));
      // Remove the optimistic user message on failure
      setState(() => _messages.remove(userMsg));
      // Restore the text so the user does not lose their input.
      _msgController.text = text;
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  /// Ends the AI chat session: triggers Gemini summary + admin notification.
  /// Called from the more-menu and from the back button (after confirm).
  Future<void> _closeChat({bool fromBackButton = false}) async {
    if (_chatId == null) {
      if (mounted) Navigator.of(context).pop();
      return;
    }
    if (fromBackButton) {
      final confirmed = await _confirmClose();
      if (confirmed != true) return;
    }
    final chatId = _chatId!;
    // Optimistically pop, then close server-side (fire-and-forget).
    if (mounted) Navigator.of(context).pop();
    try {
      await SupportService.closeAiChat(chatId);
    } catch (_) {
      // Closing is best-effort — server-side dedup keeps it idempotent.
    }
  }

  Future<bool> _confirmClose() async {
    final result = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F1423),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text('End chat?', style: GoogleFonts.plusJakartaSans(color: Colors.white, fontWeight: FontWeight.w800)),
        content: Text(
          'A short summary will be sent to our support team for review.',
          style: GoogleFonts.plusJakartaSans(color: Colors.white70, fontSize: 13, fontWeight: FontWeight.w600),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: Text('Stay', style: GoogleFonts.plusJakartaSans(color: const Color(0xFF9CA3AF), fontWeight: FontWeight.w700)),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text('End chat', style: GoogleFonts.plusJakartaSans(color: const Color(0xFFEF4444), fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showChatOptions() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F1423),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(width: 40, height: 4, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2))),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.delete_sweep_rounded, color: Color(0xFFEF4444)),
              title: Text('End chat session', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
              subtitle: Text('Send a summary to the support team.', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: const Color(0xFF9CA3AF))),
              onTap: () {
                Navigator.of(ctx).pop();
                _closeChat();
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    resizeToAvoidBottomInset: true,
    backgroundColor: const Color(0xFF000000),
    body: Stack(
      fit: StackFit.expand,
      children: [
        const AppBackground(child: SizedBox.expand()),
        SafeArea(
          child: Column(
            children: [
              _chatHeader(),
              Expanded(
                child: _isInitializing
                  ? const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Color(0xFF6B7280), strokeWidth: 1.5)))
                  : ListView(
                      controller: _scrollController,
                      padding: const EdgeInsets.all(20),
                      children: [
                        Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20)),
                            child: Text('Chat with Katrex Assistant', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white54, letterSpacing: 1)),
                          ),
                        ),
                        const SizedBox(height: 24),
                        ..._messages.map((data) {
                          final uid = context.read<AuthProvider>().firebaseUser!.uid;
                          final isMe = data['senderRole'] == 'user' && data['senderUid'] == uid;
                          return _bubble(data, isMe);
                        }),
                        if (_messages.isEmpty)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.only(top: 40),
                              child: Text(
                                'Ask Katrex Assistant anything about the app — funding your wallet, KYC, bills, gift cards, crypto, P2P and more.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF9CA3AF),
                                ),
                              ),
                            ),
                          ),
                      ],
                    ),
              ),
              _chatInput(),
            ],
          ),
        ),
      ],
    ),
  );

  Widget _chatHeader() => Container(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
    decoration: BoxDecoration(border: Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05)))),
    child: Row(
      children: [
        _btn(i: Icons.arrow_back_rounded, t: () => _closeChat(fromBackButton: true)),
        const SizedBox(width: 12),
        _botAvatar(36),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Katrex Assistant', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
              const SizedBox(height: 4),
              Row(
                children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(color: Color(0xFF34D399), shape: BoxShape.circle)),
                  const SizedBox(width: 6),
                  Text('Online', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF34D399))),
                ],
              ),
            ],
          ),
        ),
        _btn(i: Icons.more_vert_rounded, t: () => _showChatOptions()),
      ],
    ),
  );

  Widget _bubble(Map<String, dynamic> data, bool isMe) {
    final text = (data['text'] as String?) ?? '';
    final senderRole = (data['senderRole'] as String?) ?? 'user';
    final isSystem = senderRole == 'system';
    if (isSystem) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 16),
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20)),
            child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white54, letterSpacing: 0.5), textAlign: TextAlign.center),
          ),
        ),
      );
    }
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!isMe) ...[
                _botAvatar(28),
                const SizedBox(width: 10),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: isMe ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(20), topRight: const Radius.circular(20),
                      bottomLeft: Radius.circular(isMe ? 20 : 6), bottomRight: Radius.circular(isMe ? 6 : 20),
                    ),
                    border: isMe ? null : Border.all(color: Colors.white.withOpacity(0.05)),
                    boxShadow: isMe ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 4))] : null,
                  ),
                  child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white, height: 1.5)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _chatInput() => Container(
    padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
    decoration: BoxDecoration(
      color: const Color(0xFF000000).withOpacity(0.5),
      border: Border(top: BorderSide(color: Colors.white.withOpacity(0.05))),
    ),
    child: Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.1))),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _msgController,
                    style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Ask Katrex Assistant…',
                      hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white30),
                      border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const Icon(Icons.attach_file_rounded, color: Colors.white54, size: 20),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        GestureDetector(
          onTap: _isSending ? null : _sendMessage,
          child: Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB), shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 4))],
            ),
            child: _isSending
              ? const Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)))
              : const Icon(Icons.send_rounded, color: Colors.white, size: 20),
          ),
        ),
      ],
    ),
  );
}

class _PulseDot extends StatefulWidget {
  const _PulseDot();
  @override State<_PulseDot> createState() => _PulseDotState();
}

class _PulseDotState extends State<_PulseDot> with SingleTickerProviderStateMixin {
  late AnimationController _c;
  @override void initState() {
    super.initState();
    _c = AnimationController(duration: const Duration(seconds: 2), vsync: this)..repeat(reverse: true);
  }
  @override void dispose() { _c.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (_, __) => Container(
      width: 10, height: 10,
      decoration: BoxDecoration(
        color: const Color(0xFF34D399).withOpacity(0.8 + _c.value * 0.2),
        shape: BoxShape.circle,
        boxShadow: [BoxShadow(color: const Color(0xFF34D399).withOpacity(_c.value * 0.5), blurRadius: 4 + _c.value * 4)],
      ),
    ),
  );
}

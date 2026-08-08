
import 'dart:ui';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../widgets/app_background.dart';
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
  Widget build(BuildContext context) => Scaffold(
    backgroundColor: const Color(0xFF000000),
    body: Stack(
      fit: StackFit.expand,
      children: [
        const AppBackground(child: SizedBox.expand()),
        SafeArea(child: _main()),
      ],
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
            _btn(i: Icons.chevron_left_rounded, t: () => widget.onTabSwitch?.call(0)),
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
                subtitle: 'Typically replies in under 2 mins',
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
      SizedBox(
        width: 54, height: 28,
        child: Stack(
          children: [
            Positioned(right: 24, child: _avatar('https://i.pravatar.cc/100?img=47', 28)),
            Positioned(right: 12, child: _avatar('https://i.pravatar.cc/100?img=44', 28)),
            Positioned(right: 0, child: Container(width: 28, height: 28, decoration: BoxDecoration(color: const Color(0xFF3B82F6), shape: BoxShape.circle, border: Border.all(color: const Color(0xFF0A0F1F), width: 2)), child: Center(child: Text('+3', style: GoogleFonts.plusJakartaSans(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold))))),
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
                      return _ticketItemFromData(data, showDivider: e.key != paginated.length - 1);
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

  Widget _ticketItemFromData(Map<String, dynamic> data, {bool showDivider = true}) {
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

    return Column(
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
                  Text(ticketId, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
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
    );
  }
}

class SupportTicketScreen extends StatefulWidget {
  const SupportTicketScreen({super.key});
  @override State<SupportTicketScreen> createState() => _SupportTicketScreenState();
}

class _SupportTicketScreenState extends State<SupportTicketScreen> {
  String _selectedCategory = 'Deposit / Withdrawal Issue';

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
                    _field('SUBJECT', _input('E.g. Bank transfer not reflecting')),
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
                      onTap: () {},
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF2563EB)]),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 15, offset: const Offset(0, 4))],
                        ),
                        child: Center(
                          child: Row(
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

  Widget _input(String h) => Container(
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
  final _msgs = [
    {'me':false,'text':'Hello John! Welcome to Katrex Support. How can I assist you today?','time':'10:45 AM'},
    {'me':true,'text':'Hi Sarah, I tried withdrawing my BTC about an hour ago but it\'s still pending.','time':'10:46 AM'},
    {'me':false,'text':'I can check the status on the blockchain for you. Could you please provide the withdrawal reference ID?','time':'10:48 AM','read':true},
  ];

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
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20)),
                        child: Text('Today, 10:45 AM', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white54, letterSpacing: 1)),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ..._msgs.map((m) => _bubble(m)),
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
        _btn(i: Icons.arrow_back_rounded, t: () => Navigator.pop(context)),
        const SizedBox(width: 12),
        _avatar('https://i.pravatar.cc/100?img=47', 36),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Sarah (Agent)', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
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
        _btn(i: Icons.more_vert_rounded, t: () {}),
      ],
    ),
  );

  Widget _bubble(Map m) {
    final me = m['me'] as bool;
    return Align(
      alignment: me ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 16),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              if (!me) ...[
                _avatar('https://i.pravatar.cc/100?img=47', 28),
                const SizedBox(width: 10),
              ],
              Flexible(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: me ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(20), topRight: const Radius.circular(20),
                      bottomLeft: Radius.circular(me ? 20 : 6), bottomRight: Radius.circular(me ? 6 : 20),
                    ),
                    border: me ? null : Border.all(color: Colors.white.withOpacity(0.05)),
                    boxShadow: me ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 4))] : null,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m['text'], style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white, height: 1.5)),
                      if (m['read'] == true) ...[
                        const SizedBox(height: 6),
                        Text('Read ${m['time']}', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w600, color: Colors.white54)),
                      ],
                    ],
                  ),
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
                    style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w500, color: Colors.white30),
                      border: InputBorder.none, contentPadding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const Icon(Icons.attach_file_rounded, color: Colors.white54, size: 20),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB), shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 16, offset: const Offset(0, 4))],
          ),
          child: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
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

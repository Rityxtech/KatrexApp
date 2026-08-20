import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/p2p_service.dart';
import '../widgets/app_background.dart';
import 'dispute_screen.dart';

class OrderScreen extends StatefulWidget {
  final Map<String, dynamic> item;

  const OrderScreen({super.key, required this.item});

  @override
  State<OrderScreen> createState() => _OrderScreenState();
}

class _OrderScreenState extends State<OrderScreen> {
  final TextEditingController _chatController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _confirmedSecured = false;

  final List<Map<String, dynamic>> _messages = [
    {
      'type': 'system',
      'subtype': 'escrow',
      'title': 'Funds Secured in Escrow',
      'body': '\u20A6350,000 has been deducted from your wallet and locked. The seller has been notified to send the account credentials.',
      'time': '10:45 AM',
    },
    {
      'type': 'seller',
      'name': 'David_K (Seller)',
      'text': 'Hi there! Thanks for the purchase. I am preparing the login details and the original email for you right now.',
      'time': '10:48 AM',
    },
    {
      'type': 'buyer',
      'text': 'Awesome, waiting for it. Please make sure 2FA is turned off so I can log in.',
      'time': '10:50 AM',
      'read': true,
    },
    {
      'type': 'seller',
      'name': 'David_K (Seller)',
      'text': 'Done! I just sent the username, password, and original email access to the chat. I have also turned off 2FA.',
      'time': '10:55 AM',
    },
    {
      'type': 'system',
      'subtype': 'action',
      'title': 'Action Required',
      'body': 'The seller has provided the credentials. Please log in to the account, secure it by changing the password and recovery email.',
      'body2': 'Once secured, click "Release Funds" below. DO NOT release funds before securing the account.',
    },
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      }
    });
  }

  @override
  void dispose() {
    _chatController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(context),
                _buildOrderBanner(),
                Expanded(child: _buildChatArea()),
                _buildBottomBar(context),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: const Center(child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18)),
                ),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Order #8841', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                  Row(
                    children: [
                      const Icon(Icons.lock_rounded, size: 8, color: Color(0xFF34D399)),
                      const SizedBox(width: 4),
                      Text('ESCROW ACTIVE', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF34D399), letterSpacing: 1.5)),
                    ],
                  ),
                ],
              ),
            ],
          ),
          GestureDetector(
            onTap: () => _showDisputeSheet(),
            child: Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: const Center(child: Icon(Icons.warning_rounded, size: 14, color: Color(0xFFF87171))),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderBanner() {
    final item = widget.item;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: GestureDetector(
        onTap: () => _showDetailsSheet(),
        child: Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(
                  color: (item['bgColor'] as Color?) ?? const Color(0xFF2563EB),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF25F4EE)),
                  boxShadow: const [BoxShadow(color: Color(0xFFFE2C55), blurRadius: 0, offset: Offset(-1, 1))],
                ),
                child: Center(child: FaIcon(item['icon'], size: 16, color: Colors.white)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['title'], style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                    Row(
                      children: [
                        Text('Seller: @david_k ', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                        const Icon(Icons.verified_rounded, size: 8, color: Color(0xFF3B82F6)),
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(item['price'], style: GoogleFonts.robotoMono(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                  Row(
                    children: [
                      Text('Details', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                      const Icon(Icons.chevron_right_rounded, size: 8, color: Color(0xFF6B7280)),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildChatArea() {
    return ListView(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      children: [
        _buildDateDivider('Today'),
        ..._messages.map((msg) => _buildMessage(msg)),
      ],
    );
  }

  Widget _buildDateDivider(String text) {
    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20)),
        child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
      ),
    );
  }

  Widget _buildMessage(Map<String, dynamic> msg) {
    if (msg['type'] == 'system') {
      return _buildSystemMessage(msg);
    } else if (msg['type'] == 'seller') {
      return _buildSellerMessage(msg);
    } else {
      return _buildBuyerMessage(msg);
    }
  }

  Widget _buildSystemMessage(Map<String, dynamic> msg) {
    final isEscrow = msg['subtype'] == 'escrow';
    final bgColor = isEscrow ? const Color(0xFF10B981).withOpacity(0.1) : const Color(0xFFF97316).withOpacity(0.1);
    final borderColor = isEscrow ? const Color(0xFF10B981).withOpacity(0.2) : const Color(0xFFF97316).withOpacity(0.2);
    final iconColor = isEscrow ? const Color(0xFF34D399) : const Color(0xFFF97316);
    final titleColor = isEscrow ? const Color(0xFF34D399) : const Color(0xFFF97316);

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: borderColor)),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24, height: 24,
            decoration: BoxDecoration(shape: BoxShape.circle, color: iconColor.withOpacity(0.2)),
            child: Center(child: Icon(isEscrow ? Icons.lock_rounded : Icons.warning_rounded, size: 10, color: iconColor)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(msg['title'], style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: titleColor, letterSpacing: 0.5)),
                const SizedBox(height: 2),
                Text(msg['body'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5)),
                if (msg['body2'] != null) ...[
                  const SizedBox(height: 4),
                  Text(msg['body2'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white, height: 1.5)),
                ],
                if (msg['time'] != null) ...[
                  const SizedBox(height: 4),
                  Text(msg['time'], style: GoogleFonts.plusJakartaSans(fontSize: 8, fontWeight: FontWeight.w700, color: iconColor.withOpacity(0.5))),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSellerMessage(Map<String, dynamic> msg) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Stack(
            children: [
              Container(
                width: 28, height: 28,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF2563EB)),
                child: Center(child: Text('D', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white))),
              ),
              Positioned(
                bottom: 0, right: 0,
                child: Container(
                  width: 10, height: 10,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF34D399), border: Border.all(color: const Color(0xFF000000), width: 2)),
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 2),
                  child: Text(msg['name'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18), bottomRight: Radius.circular(18), bottomLeft: Radius.circular(4)),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Text(msg['text'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white, height: 1.5)),
                ),
                Padding(
                  padding: const EdgeInsets.only(left: 4, top: 2),
                  child: Text(msg['time'], style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBuyerMessage(Map<String, dynamic> msg) {
    return Container(
      margin: const EdgeInsets.only(top: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.end,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB),
                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18), bottomLeft: Radius.circular(18), bottomRight: Radius.circular(4)),
                    boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.2), blurRadius: 15)],
                  ),
                  child: Text(msg['text'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white, height: 1.5)),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 4, top: 2),
                  child: Text('Read ${msg['time']}', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Positioned(
      left: 0, right: 0, bottom: 0,
      child: Container(
        padding: EdgeInsets.fromLTRB(16, 40, 16, 16 + MediaQuery.viewInsetsOf(context).bottom),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [
              const Color(0xFF000000),
              const Color(0xFF000000).withOpacity(0.95),
              Colors.transparent,
            ],
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => _showReleaseSheet(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF34D399),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [BoxShadow(color: const Color(0xFF10B981).withOpacity(0.3), blurRadius: 15)],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.done_all_rounded, size: 12, color: Color(0xFF000000)),
                          const SizedBox(width: 6),
                          Text('Release Funds', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFF000000))),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _showDisputeSheet(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.flag_rounded, size: 12, color: Color(0xFFF87171)),
                        const SizedBox(width: 6),
                        Text('Dispute', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFFF87171))),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0F1F).withOpacity(0.8),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _chatController,
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Type a message to seller...',
                        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white.withOpacity(0.4)),
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: Container(
                      width: 36, height: 36,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.transparent),
                      child: const Center(child: Icon(Icons.attach_file_rounded, size: 14, color: Color(0xFF9CA3AF))),
                    ),
                  ),
                  GestureDetector(
                    onTap: () {
                      if (_chatController.text.trim().isNotEmpty) {
                        final text = _chatController.text.trim();
                        setState(() {
                          _messages.add({
                            'type': 'buyer',
                            'text': text,
                            'time': 'Now',
                            'read': false,
                          });
                          _chatController.clear();
                        });
                        final tradeId = widget.item['tradeId'] as String?;
                        if (tradeId != null) {
                          P2PService.sendMessage(tradeId: tradeId, text: text).catchError((_) {});
                        }
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (_scrollController.hasClients) {
                            _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
                          }
                        });
                      }
                    },
                    child: Container(
                      width: 40, height: 40,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF2563EB)),
                      child: const Center(child: Icon(Icons.send_rounded, size: 14, color: Colors.white)),
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

  void _showDetailsSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => _buildDetailsSheet(),
    );
  }

  void _showReleaseSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => _buildReleaseSheet(setModalState),
      ),
    );
  }

  void _showDisputeSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => _buildDisputeSheet(),
    );
  }

  Widget _buildSheetContainer({required Widget child, required double heightFactor}) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: MediaQuery.of(context).size.height * heightFactor,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1423).withOpacity(0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: const Border(top: BorderSide(color: Color(0x1AFFFFFF))),
          ),
          child: child,
        ),
      ),
    );
  }

  Widget _buildSheetHeader(String title, {IconData? headerIcon, Color? iconColor, Color? iconBgColor}) {
    return Column(
      children: [
        Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                if (headerIcon != null) ...[
                  Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: (iconBgColor ?? const Color(0xFF2563EB)).withOpacity(0.2)),
                    child: Center(child: Icon(headerIcon, size: 14, color: iconColor ?? Colors.white)),
                  ),
                  const SizedBox(width: 10),
                ],
                Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
              ],
            ),
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 32, height: 32,
                decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.05)),
                child: const Center(child: Icon(Icons.close_rounded, size: 14, color: Color(0xFF9CA3AF))),
              ),
            ),
          ],
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildDetailsSheet() {
    final item = widget.item;
    return _buildSheetContainer(
      heightFactor: 0.75,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            _buildSheetHeader('Order Details'),
            Expanded(
              child: ListView(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: Column(
                      children: [
                        Container(
                          width: 56, height: 56,
                          decoration: BoxDecoration(
                            color: (item['bgColor'] as Color?) ?? const Color(0xFF2563EB),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFF25F4EE)),
                            boxShadow: const [BoxShadow(color: Color(0xFFFE2C55), blurRadius: 0, offset: Offset(-1, 1))],
                          ),
                          child: Center(child: FaIcon(item['icon'], size: 24, color: Colors.white)),
                        ),
                        const SizedBox(height: 12),
                        Text('${item['title']} TikTok', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                        const SizedBox(height: 4),
                        Text('${item['handle']} \u2022 ${item['followers']} Followers', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                        const SizedBox(height: 12),
                        Text(item['price'], style: GoogleFonts.robotoMono(fontSize: 24, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.08))),
                    child: Column(
                      children: [
                        _detailRow('Order ID', '#KAT-8841'),
                        _detailDivider(),
                        _detailRow('Seller', 'David_K', verified: true),
                        _detailDivider(),
                        _detailRow('Escrow Fee (Paid by Seller)', '\u20A617,500 (5%)'),
                        _detailDivider(),
                        _detailRow('Started On', 'Oct 14, 2023 10:45 AM'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(String label, String value, {bool verified = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
          Row(
            children: [
              Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
              if (verified) ...[
                const SizedBox(width: 6),
                const Icon(Icons.verified_rounded, size: 10, color: Color(0xFF3B82F6)),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _detailDivider() {
    return Container(width: double.infinity, height: 1, color: Colors.white.withOpacity(0.05));
  }

  Widget _buildReleaseSheet(StateSetter setModalState) {
    return _buildSheetContainer(
      heightFactor: 0.55,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            _buildSheetHeader('Release Funds', headerIcon: Icons.lock_open_rounded, iconColor: const Color(0xFF34D399), iconBgColor: const Color(0xFF10B981)),
            Expanded(
              child: ListView(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFFF97316).withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFF97316).withOpacity(0.2))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.warning_rounded, size: 14, color: Color(0xFFF97316)),
                            const SizedBox(width: 8),
                            Text('Irreversible Action', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: const Color(0xFFF97316))),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('Releasing funds will transfer the locked \u20A6350,000 permanently to the seller. Only do this if you have completely secured the account (changed email, password, and added 2FA).',
                            style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  GestureDetector(
                    onTap: () => setModalState(() => _confirmedSecured = !_confirmedSecured),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                      child: Row(
                        children: [
                          Container(
                            width: 20, height: 20,
                            decoration: BoxDecoration(
                              color: _confirmedSecured ? const Color(0xFF10B981) : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: _confirmedSecured ? const Color(0xFF10B981) : Colors.white.withOpacity(0.2), width: 2),
                            ),
                            child: _confirmedSecured ? const Center(child: Icon(Icons.check_rounded, size: 12, color: Colors.white)) : null,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text('I confirm that I have successfully logged in and fully secured the account.',
                                style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text('ENTER SECURITY PIN TO CONFIRM', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(4, (index) => Container(
                      width: 48, height: 48,
                      margin: EdgeInsets.only(right: index < 3 ? 12 : 0),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                      child: Center(child: Text('\u2022', style: GoogleFonts.plusJakartaSans(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white))),
                    )),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 32),
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF34D399),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: const Color(0xFF10B981).withOpacity(0.3), blurRadius: 25, offset: const Offset(0, 4))],
                  ),
                  child: Center(child: Text('Confirm & Release \u20A6350,000', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF000000)))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  int _selectedDisputeReason = 0;
  final List<String> _disputeReasons = [
    'Login Credentials Invalid',
    'Account is Banned / Restricted',
    'Account Details Mismatch Description',
    'Seller Unresponsive',
  ];

  Widget _buildDisputeSheet() {
    return _buildSheetContainer(
      heightFactor: 0.85,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            _buildSheetHeader('Open Dispute', headerIcon: Icons.flag_rounded, iconColor: const Color(0xFFF87171), iconBgColor: const Color(0xFFEF4444)),
            Expanded(
              child: StatefulBuilder(
                builder: (context, setModalState) {
                  return ListView(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(color: const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2))),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.info_rounded, size: 14, color: Color(0xFFF87171)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text('Opening a dispute will freeze the escrow funds. An admin will step in to mediate the situation. Please provide accurate details below.',
                                  style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5)),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 8),
                        child: Text('REASON FOR DISPUTE', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                      ),
                      ...List.generate(_disputeReasons.length, (index) {
                        final isSelected = _selectedDisputeReason == index;
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: GestureDetector(
                            onTap: () => setModalState(() => _selectedDisputeReason = index),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFFEF4444).withOpacity(0.15) : Colors.white.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: isSelected ? const Color(0xFFEF4444) : Colors.white.withOpacity(0.1)),
                              ),
                              child: Text(_disputeReasons[index],
                                  style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFFD1D5DB))),
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 16),
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 6),
                        child: Text('ADDITIONAL DETAILS', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                      ),
                      Container(
                        height: 112,
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                        child: TextField(
                          maxLines: null,
                          expands: true,
                          style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                          decoration: InputDecoration(
                            hintText: 'Explain what happened in detail...',
                            hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.4)),
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 6),
                        child: Text('PROOF (SCREENSHOTS/VIDEO)', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                      ),
                      GestureDetector(
                        onTap: () {},
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.2), style: BorderStyle.solid)),
                          child: Column(
                            children: [
                              Container(
                                width: 40, height: 40,
                                decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.1)),
                                child: const Center(child: Icon(Icons.cloud_upload_rounded, size: 14, color: Color(0xFF9CA3AF))),
                              ),
                              const SizedBox(height: 8),
                              Text('Tap to upload evidence', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA))),
                              const SizedBox(height: 2),
                              Text('Max 5 files (JPG, PNG, MP4)', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 32),
              child: GestureDetector(
                onTap: () {
                  final dynamicOrderId = widget.item['tradeId'] ?? widget.item['orderId'] ?? widget.item['id'] ?? '8841';
                  Navigator.pop(context);
                  Navigator.push(context, MaterialPageRoute(builder: (context) => DisputeScreen(orderId: dynamicOrderId.toString())));
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: const Color(0xFFEF4444).withOpacity(0.4), blurRadius: 25, offset: const Offset(0, 4))],
                  ),
                  child: Center(child: Text('Submit Dispute', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

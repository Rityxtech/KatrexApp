import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/app_background.dart';

class DisputeScreen extends StatefulWidget {
  final String orderId;

  const DisputeScreen({super.key, this.orderId = '8841'});

  @override
  State<DisputeScreen> createState() => _DisputeScreenState();
}

class _DisputeScreenState extends State<DisputeScreen> {
  final TextEditingController _chatController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  int _selectedVerdict = -1;

  final List<Map<String, dynamic>> _messages = [
    {
      'type': 'system',
      'title': 'Dispute Initiated by Buyer',
      'body': 'Reason: Login Credentials Invalid. Escrow funds have been temporarily frozen.',
      'time': '11:05 AM',
    },
    {
      'type': 'buyer',
      'name': 'John_Doe (Buyer)',
      'text': 'The password he provided is incorrect. I tried resetting it but the original email is also wrong. Here is the screenshot.',
      'time': '11:06 AM',
      'hasEvidence': true,
    },
    {
      'type': 'seller',
      'name': 'David_K (Seller)',
      'text': "That's a lie! I checked the login history and someone logged in from his location. He probably changed it and is trying to scam.",
      'time': '11:08 AM',
    },
    {
      'type': 'admin',
      'text': 'Hello both. I am reviewing the logs and the provided credentials now. David_K, please send the creation date and the exact device model used to create the account for verification.',
      'time': 'Just now',
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
                _buildDisputeBanner(),
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
                  Text('Admin: Dispute #${widget.orderId}', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                  Row(
                    children: [
                      Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFEF4444), boxShadow: [BoxShadow(color: Color(0xFFEF4444), blurRadius: 8)])),
                      const SizedBox(width: 6),
                      Text('ESCROW FROZEN', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFFF87171), letterSpacing: 1.5)),
                    ],
                  ),
                ],
              ),
            ],
          ),
          GestureDetector(
            onTap: () => _showDetailsSheet(),
            child: Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: const Center(child: Icon(Icons.info_rounded, size: 14, color: Colors.white)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDisputeBanner() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFEF4444).withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('DISPUTED AMOUNT', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFF87171), letterSpacing: 1.5)),
                Text('\u20A6350,000', style: GoogleFonts.robotoMono(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
              ],
            ),
            const SizedBox(height: 10),
            Container(width: double.infinity, height: 1, color: const Color(0xFFEF4444).withOpacity(0.1)),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 20, height: 20,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF2563EB), border: Border.all(color: const Color(0xFF60A5FA), width: 1.5)),
                        child: Center(child: Text('J', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white))),
                      ),
                      const SizedBox(width: 8),
                      Text('Buyer', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB))),
                    ],
                  ),
                ),
                const Icon(Icons.bolt_rounded, size: 12, color: Color(0x80EF4444)),
                Expanded(
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text('Seller', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB))),
                      const SizedBox(width: 8),
                      Container(
                        width: 20, height: 20,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFFF97316), border: Border.all(color: const Color(0xFFFBBF24), width: 1.5)),
                        child: Center(child: Text('D', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white))),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatArea() {
    return ListView(
      controller: _scrollController,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
      children: _messages.map((msg) => _buildMessage(msg)).toList(),
    );
  }

  Widget _buildMessage(Map<String, dynamic> msg) {
    switch (msg['type']) {
      case 'system':
        return _buildSystemMessage(msg);
      case 'buyer':
        return _buildPartyMessage(msg, isBuyer: true);
      case 'seller':
        return _buildPartyMessage(msg, isBuyer: false);
      case 'admin':
        return _buildAdminMessage(msg);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildSystemMessage(Map<String, dynamic> msg) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 24, height: 24,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x33EF4444)),
            child: const Center(child: Icon(Icons.flag_rounded, size: 10, color: Color(0xFFF87171))),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(msg['title'], style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFFF87171))),
                const SizedBox(height: 2),
                Text(msg['body'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5)),
                const SizedBox(height: 4),
                Text(msg['time'], style: GoogleFonts.plusJakartaSans(fontSize: 8, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPartyMessage(Map<String, dynamic> msg, {required bool isBuyer}) {
    final nameColor = isBuyer ? const Color(0xFF60A5FA) : const Color(0xFFFBBF24);
    final borderColor = isBuyer ? const Color(0xFF60A5FA) : const Color(0xFFFBBF24);
    final bgColor = isBuyer ? const Color(0xFF2563EB) : const Color(0xFFF97316);
    final initial = isBuyer ? 'J' : 'D';

    return Container(
      margin: const EdgeInsets.only(top: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(shape: BoxShape.circle, color: bgColor, border: Border.all(color: borderColor, width: 1.5)),
            child: Center(child: Text(initial, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white))),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 4, bottom: 2),
                  child: Text(msg['name'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: nameColor)),
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.1),
                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18), bottomRight: Radius.circular(18), bottomLeft: Radius.circular(4)),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Text(msg['text'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white, height: 1.5)),
                      ),
                      if (msg['hasEvidence'] == true) ...[
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity, height: 96,
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: Stack(
                            children: [
                              Center(child: Icon(Icons.image_rounded, size: 32, color: Colors.white.withOpacity(0.3))),
                              Center(
                                child: Container(
                                  width: 32, height: 32,
                                  decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.black.withOpacity(0.4)),
                                  child: const Center(child: Icon(Icons.fullscreen_rounded, size: 16, color: Colors.white)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
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

  Widget _buildAdminMessage(Map<String, dynamic> msg) {
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
                Padding(
                  padding: const EdgeInsets.only(right: 4, bottom: 2),
                  child: Text('You (Admin)', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFA78BFA))),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF4F46E5),
                    borderRadius: const BorderRadius.only(topLeft: Radius.circular(18), topRight: Radius.circular(18), bottomLeft: Radius.circular(18), bottomRight: Radius.circular(4)),
                    boxShadow: [BoxShadow(color: const Color(0xFF4F46E5).withOpacity(0.3), blurRadius: 15)],
                  ),
                  child: Text(msg['text'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w500, color: Colors.white, height: 1.5)),
                ),
                Padding(
                  padding: const EdgeInsets.only(right: 4, top: 2),
                  child: Text(msg['time'], style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
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
                    onTap: () => _showResolveSheet(),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF7C3AED),
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [BoxShadow(color: const Color(0xFF9333EA).withOpacity(0.3), blurRadius: 15)],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.gavel_rounded, size: 12, color: Colors.white),
                          const SizedBox(width: 6),
                          Text('Resolve Dispute', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => _showDetailsSheet(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.folder_open_rounded, size: 12, color: Colors.white),
                        const SizedBox(width: 6),
                        Text('Evidence', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
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
                        hintText: 'Type official admin response...',
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
                        setState(() {
                          _messages.add({
                            'type': 'admin',
                            'text': _chatController.text.trim(),
                            'time': 'Just now',
                          });
                          _chatController.clear();
                        });
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (_scrollController.hasClients) {
                            _scrollController.animateTo(_scrollController.position.maxScrollExtent, duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
                          }
                        });
                      }
                    },
                    child: Container(
                      width: 40, height: 40,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF4F46E5)),
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

  void _showResolveSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => _buildResolveSheet(setModalState),
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

  Widget _buildSheetHandle(String title, {IconData? headerIcon, Color? iconColor, Color? iconBgColor}) {
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
                    decoration: BoxDecoration(shape: BoxShape.circle, color: (iconBgColor ?? const Color(0xFF7C3AED)).withOpacity(0.2)),
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

  final List<Map<String, dynamic>> _verdicts = [
    {'title': 'Refund Buyer', 'icon': Icons.reply_rounded, 'desc': 'Return \u20A6350,000 to John_Doe. Account details remain with seller.'},
    {'title': 'Pay Seller', 'icon': Icons.done_all_rounded, 'desc': 'Release \u20A6350,000 to David_K. Buyer keeps the account.'},
    {'title': 'Split Funds (50/50)', 'icon': Icons.call_split_rounded, 'desc': 'Distribute \u20A6175,000 to both parties.'},
  ];

  Widget _buildResolveSheet(StateSetter setModalState) {
    return _buildSheetContainer(
      heightFactor: 0.75,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            _buildSheetHandle('Final Verdict', headerIcon: Icons.gavel_rounded, iconColor: const Color(0xFFA78BFA), iconBgColor: const Color(0xFF7C3AED)),
            Expanded(
              child: ListView(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFF7C3AED).withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF7C3AED).withOpacity(0.2))),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.info_rounded, size: 14, color: Color(0xFFA78BFA)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text('This action will immediately unlock the escrow and disburse the funds based on your ruling. This cannot be undone.',
                              style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 8),
                    child: Text('FUND DISBURSEMENT', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  ),
                  ...List.generate(_verdicts.length, (index) {
                    final isSelected = _selectedVerdict == index;
                    final v = _verdicts[index];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: GestureDetector(
                        onTap: () => setModalState(() => _selectedVerdict = index),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.1)),
                            boxShadow: isSelected ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 12)] : [],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(v['icon'], size: 14, color: isSelected ? Colors.white : Colors.white),
                                  const SizedBox(width: 8),
                                  Text(v['title'], style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(v['desc'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: isSelected ? Colors.white.withOpacity(0.8) : const Color(0xFF9CA3AF))),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 6),
                    child: Text('ADMIN RULING NOTE', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  ),
                  Container(
                    height: 96,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: TextField(
                      maxLines: null,
                      expands: true,
                      style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Explain the reasoning for this verdict. Both parties will see this...',
                        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.4)),
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
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
                    color: const Color(0xFF7C3AED),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: const Color(0xFF9333EA).withOpacity(0.4), blurRadius: 25, offset: const Offset(0, 4))],
                  ),
                  child: Center(child: Text('Confirm & Execute Ruling', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailsSheet() {
    return _buildSheetContainer(
      heightFactor: 0.70,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            _buildSheetHandle('Dispute Details'),
            Expanded(
              child: ListView(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.08))),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('STATED REASON', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                        const SizedBox(height: 4),
                        Text('Login Credentials Invalid', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
                        const SizedBox(height: 12),
                        Container(width: double.infinity, height: 1, color: Colors.white.withOpacity(0.05)),
                        const SizedBox(height: 12),
                        Text("BUYER'S DESCRIPTION", style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                        const SizedBox(height: 4),
                        Text('The password he provided is incorrect. I tried resetting it but the original email is also wrong.',
                            style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w500, color: const Color(0xFFD1D5DB), height: 1.5)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 10),
                    child: Text('UPLOADED EVIDENCE', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 112,
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                          child: Stack(
                            children: [
                              Center(child: Icon(Icons.image_rounded, size: 28, color: Colors.white.withOpacity(0.3))),
                              Center(
                                child: Container(
                                  width: 32, height: 32,
                                  decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.black.withOpacity(0.4)),
                                  child: const Center(child: Icon(Icons.visibility_rounded, size: 16, color: Colors.white)),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          height: 112,
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.videocam_rounded, size: 24, color: Color(0xFF9CA3AF)),
                              const SizedBox(height: 8),
                              Text('screen_rec.mp4', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                            ],
                          ),
                        ),
                      ),
                    ],
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
}

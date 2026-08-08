import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/firestore_service.dart';
import '../widgets/app_background.dart';
import '../widgets/glass_modal_sheet.dart';
import '../widgets/notification_icon.dart';

class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});

  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}

class _WithdrawScreenState extends State<WithdrawScreen> {
  final TextEditingController _amountController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _amountFocusNode = FocusNode();

  bool _isProcessing = false;

  double get _maxBalance => context.read<WalletProvider>().nairaBalance;
  final double _fee = 50;

  int _selectedBankIndex = 0;

  final _banks = [
    {
      'name': 'Guaranty Trust Bank',
      'short': 'GTB',
      'color': 0xFFF97316,
      'account': '0123456789',
      'holder': 'John Doe'
    },
    {
      'name': 'Kuda Bank',
      'short': 'KDA',
      'color': 0xFF9333EA,
      'account': '3001234567',
      'holder': 'John Doe'
    },
  ];

  @override
  void initState() {
    super.initState();
    _amountController.addListener(() => setState(() {}));
    _amountFocusNode.addListener(() {
      if (_amountFocusNode.hasFocus) _scrollToField(200);
    });
  }

  void _scrollToField(double offset) {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(offset,
            duration: const Duration(milliseconds: 300), curve: Curves.easeOut);
      }
    });
  }

  double get _amount {
    final val = double.tryParse(_amountController.text);
    return val ?? 0;
  }

  double get _receiveAmount {
    final r = _amount - _fee;
    return r < 0 ? 0 : r;
  }

  bool get _exceedsBalance => _amount > _maxBalance;

  String _formatCurrency(double val) {
    return '\u20A6${val.toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  void _setMaxAmount() {
    _amountController.text = _maxBalance.toStringAsFixed(0);
  }

  Future<void> _processWithdrawal() async {
    if (_amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter a valid amount', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }
    if (_exceedsBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Amount exceeds balance', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final bank = _banks[_selectedBankIndex];
      final tx = TransactionModel(
        id: '',
        uid: uid,
        type: TransactionType.withdrawal,
        status: TransactionStatus.pending,
        amountNaira: _amount,
        description: 'Withdrawal to ${bank['name']}',
        reference: 'WD-${DateTime.now().millisecondsSinceEpoch}',
        createdAt: DateTime.now(),
      );

      await FirestoreService().createTransaction(tx);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Withdrawal of \u20A6${NumberFormat('#,##0').format(_amount)} submitted', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFF10B981)),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Withdrawal failed: $e', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  void dispose() {
    _amountController.dispose();
    _scrollController.dispose();
    _amountFocusNode.dispose();
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
                Expanded(
                  child: Stack(
                    children: [
                      ListView(
                        controller: _scrollController,
                        padding: EdgeInsets.fromLTRB(
                          16,
                          24,
                          16,
                          120 + MediaQuery.viewInsetsOf(context).bottom,
                        ),
                        children: [
                          _buildAmountSection(),
                          const SizedBox(height: 24),
                          _buildDestinationSection(),
                          const SizedBox(height: 24),
                          _buildBreakdownSection(),
                          const SizedBox(height: 16),
                          _buildInfoBanner(),
                        ],
                      ),
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        child: _buildActionButton(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: const Center(
                      child: Icon(Icons.chevron_left_rounded,
                          color: Colors.white, size: 18)),
                ),
              ),
            ),
          ),
          Text('Withdraw Funds',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.5)),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildAmountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.6),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('AVAILABLE BALANCE',
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF6B7280),
                                letterSpacing: 1.5)),
                        Text(_formatCurrency(_maxBalance),
                            style: GoogleFonts.robotoMono(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: Colors.white)),
                      ],
                    ),
                  ),
                  Container(
                      width: double.infinity,
                      height: 1,
                      color: Colors.white.withOpacity(0.05)),
                  const SizedBox(height: 12),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF10B981).withOpacity(0.1),
                          border: Border.all(
                              color: const Color(0xFF10B981).withOpacity(0.2)),
                        ),
                        child: Center(
                          child: Text('\u20B6',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF34D399))),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('NGN',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white)),
                          Text('Fiat Wallet',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF6B7280))),
                        ],
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: TextField(
                          controller: _amountController,
                          focusNode: _amountFocusNode,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.right,
                          style: GoogleFonts.robotoMono(
                            fontSize: 36,
                            fontWeight: FontWeight.w700,
                            color: _exceedsBalance
                                ? const Color(0xFFF87171)
                                : Colors.white,
                            letterSpacing: -1,
                          ),
                          decoration: InputDecoration(
                            hintText: '0.00',
                            hintStyle: GoogleFonts.robotoMono(
                                fontSize: 36,
                                fontWeight: FontWeight.w700,
                                color: Colors.white24,
                                letterSpacing: -1),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                        ),
                      ),
                      const SizedBox(width: 4),
                      GestureDetector(
                        onTap: _setMaxAmount,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 3),
                          decoration: BoxDecoration(
                            color:
                                const Color(0xFF2563EB).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(
                                color: const Color(0xFF3B82F6)
                                    .withOpacity(0.3)),
                          ),
                          child: Text('MAX',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF60A5FA))),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
        ),
        if (_exceedsBalance)
          Padding(
            padding: const EdgeInsets.only(left: 8, top: 8),
            child: Text('Amount exceeds available balance.',
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFF87171))),
          ),
      ],
    );
  }

  Widget _buildDestinationSection() {
    final bank = _banks[_selectedBankIndex];
    final color = Color(bank['color'] as int);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('WITHDRAW TO',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF6B7280),
                      letterSpacing: 1.5)),
              GestureDetector(
                onTap: () => _showBankSheet(),
                child: Text('Change',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF60A5FA))),
              ),
            ],
          ),
        ),
        GestureDetector(
          onTap: () => _showBankSheet(),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.1),
                      ),
                      child: Center(
                        child: Icon(Icons.account_balance_rounded,
                            color: color, size: 20),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(bank['name'] as String,
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white)),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Text(bank['account'] as String,
                                  style: GoogleFonts.robotoMono(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF9CA3AF))),
                              const SizedBox(width: 6),
                              Container(
                                  width: 4,
                                  height: 4,
                                  decoration: const BoxDecoration(
                                      color: Color(0xFF4B5563),
                                      shape: BoxShape.circle)),
                              const SizedBox(width: 6),
                              Text(bank['holder'] as String,
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF9CA3AF))),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.05),
                      ),
                      child: const Center(
                          child: Icon(Icons.keyboard_arrow_down_rounded,
                              color: Color(0xFF9CA3AF), size: 18)),
                    ),
                  ],
                ),
          ),
        ),
      ],
    );
  }

  Widget _buildBreakdownSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text('TRANSACTION DETAILS',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF6B7280),
                  letterSpacing: 1.5)),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
                children: [
                  _breakdownRow('Amount to Withdraw', _formatCurrency(_amount),
                      Colors.white, 14),
                  const SizedBox(height: 12),
                  _breakdownRow('Network Fee', '- ${_formatCurrency(_fee)}',
                      const Color(0xFFF87171), 14,
                      icon: Icons.info_outline_rounded),
                  const SizedBox(height: 12),
                  Container(
                      width: double.infinity,
                      height: 1,
                      color: Colors.white.withOpacity(0.1)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('You will receive',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: Colors.white)),
                      Text(_formatCurrency(_receiveAmount),
                          style: GoogleFonts.robotoMono(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: _receiveAmount > 0
                                  ? const Color(0xFF34D399)
                                  : const Color(0xFF6B7280))),
                    ],
                  ),
                ],
              ),
        ),
      ],
    );
  }

  Widget _breakdownRow(
      String label, String value, Color valueColor, double valueSize,
      {IconData? icon}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Text(label,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF9CA3AF))),
            if (icon != null) ...[
              const SizedBox(width: 4),
              Icon(icon,
                  size: 10, color: const Color(0xFF9CA3AF).withOpacity(0.7)),
            ],
          ],
        ),
        Text(value,
            style: GoogleFonts.robotoMono(
                fontSize: valueSize,
                fontWeight: FontWeight.w900,
                color: valueColor)),
      ],
    );
  }

  Widget _buildInfoBanner() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF3B82F6).withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.2)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.bolt_rounded, color: Color(0xFF60A5FA), size: 14),
          const SizedBox(width: 10),
          Expanded(
            child: RichText(
              text: TextSpan(
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFFD1D5DB),
                    height: 1.4),
                children: [
                  const TextSpan(
                      text:
                          'Withdrawals are processed automatically and usually arrive within '),
                  TextSpan(
                      text: '2-5 minutes',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: Colors.white)),
                  const TextSpan(text: '.'),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton() {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            const Color(0xFF000000),
            const Color(0xFF000000).withOpacity(0.9),
            Colors.transparent,
          ],
        ),
      ),
      child: GestureDetector(
        onTap: _isProcessing ? null : _processWithdrawal,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF2563EB).withOpacity(0.4),
                blurRadius: 25,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Center(
            child: _isProcessing
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Preview Withdrawal',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Colors.white)),
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded,
                          color: Colors.white, size: 16),
                    ],
                  ),
          ),
        ),
      ),
    );
  }

  void _showBankSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return _buildBankSheetContent(setModalState);
          },
        );
      },
    );
  }

  Widget _buildBankSheetContent(StateSetter setModalState) {
    return GlassModalSheet(
      title: 'Select Destination',
      height: MediaQuery.of(context).size.height * 0.75,
      child:
          ListView(padding: const EdgeInsets.symmetric(vertical: 8), children: [
        const Padding(
          padding: EdgeInsets.only(left: 4, bottom: 12),
          child: GlassModalLabel('Saved Accounts'),
        ),
        ...List.generate(_banks.length, (index) {
          final bank = _banks[index];
          final color = Color(bank['color'] as int);
          final isActive = _selectedBankIndex == index;
          return Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: GestureDetector(
              onTap: () {
                setModalState(() => _selectedBankIndex = index);
                setState(() {});
                Navigator.pop(context);
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isActive
                      ? const Color(0xFF2563EB).withOpacity(0.1)
                      : Colors.white.withOpacity(0.03),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isActive
                        ? const Color(0xFF3B82F6).withOpacity(0.5)
                        : Colors.white.withOpacity(0.08),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: color,
                      ),
                      child: Center(
                        child: Text(bank['short'] as String,
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: Colors.white)),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(bank['name'] as String,
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.white)),
                          const SizedBox(height: 2),
                          Row(
                            children: [
                              Text(bank['account'] as String,
                                  style: GoogleFonts.robotoMono(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF9CA3AF))),
                              const SizedBox(width: 6),
                              Container(
                                  width: 4,
                                  height: 4,
                                  decoration: const BoxDecoration(
                                      color: Color(0xFF4B5563),
                                      shape: BoxShape.circle)),
                              const SizedBox(width: 6),
                              Text(bank['holder'] as String,
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 12,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF9CA3AF))),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Container(
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isActive
                            ? const Color(0xFF3B82F6)
                            : Colors.transparent,
                        border: isActive
                            ? null
                            : Border.all(
                                color: Colors.white.withOpacity(0.2), width: 2),
                      ),
                      child: isActive
                          ? const Center(
                              child: Icon(Icons.check_rounded,
                                  size: 10, color: Colors.white))
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
        const SizedBox(height: 16),
        GestureDetector(
          onTap: () {},
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                  color: Colors.white.withOpacity(0.2),
                  width: 2,
                  strokeAlign: BorderSide.strokeAlignInside),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.1),
                  ),
                  child: const Center(
                      child: Icon(Icons.add_rounded,
                          color: Colors.white, size: 16)),
                ),
                const SizedBox(width: 10),
                Text('Add New Bank Account',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Colors.white)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
      ]),
    );
  }
}

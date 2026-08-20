import 'dart:math';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/firestore_service.dart';
import '../utils/constants.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/pin_input_sheet.dart';
import 'profile_modals.dart';

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
  int _selectedBankIndex = 0;

  static const double _fee = 50.0;

  @override
  void initState() {
    super.initState();
    _amountController.addListener(() => setState(() {}));
    _amountFocusNode.addListener(() {
      if (_amountFocusNode.hasFocus) _scrollToField(200);
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _scrollController.dispose();
    _amountFocusNode.dispose();
    super.dispose();
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
    final val = double.tryParse(_amountController.text.replaceAll(',', '').replaceAll(' ', ''));
    return val ?? 0;
  }

  double get _receiveAmount {
    final r = _amount - _fee;
    return r < 0 ? 0 : r;
  }

  double get _maxBalance => context.read<WalletProvider>().nairaBalance;

  bool get _exceedsBalance => _amount + _fee > _maxBalance;

  String _formatCurrency(double val) {
    return '₦' + val.toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},');
  }

  void _setMaxAmount() {
    final max = _maxBalance - _fee;
    if (max > 0) {
      _amountController.text = max.toStringAsFixed(0);
    } else {
      _amountController.text = '0';
    }
  }

  List<Map<String, dynamic>> get _paymentMethods {
    return context.read<AuthProvider>().userModel?.paymentMethods ?? [];
  }

  void _openAddBankModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const PaymentMethodsModal(),
    ).then((_) => setState(() {}));
  }

  Future<void> _showConfirmationSheet(Map<String, dynamic> bank) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => _ConfirmWithdrawSheet(
        amount: _amount,
        fee: _fee,
        receiveAmount: _receiveAmount,
        bankName: bank['bankName'] as String? ?? '',
        accountNumber: bank['accountNumber'] as String? ?? '',
        accountName: bank['accountName'] as String? ?? '',
      ),
    );
    if (confirmed == true) {
      await _processWithdrawal(bank);
    }
  }

  Future<void> _processWithdrawal(Map<String, dynamic> bank) async {
    if (_amount < AppConstants.minWithdrawal) {
      _showError('Minimum withdrawal is ${_formatCurrency(AppConstants.minWithdrawal)}');
      return;
    }
    if (_exceedsBalance) {
      _showError('Amount exceeds available balance');
      return;
    }

    // PIN gate
    final success = await PinInputSheet.ensurePinRequired(context);
    if (success != true) return;

    setState(() => _isProcessing = true);
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      await FirestoreService().requestWithdrawal(
        uid: uid,
        amount: _amount,
        bankName: bank['bankName'] as String? ?? '',
        accountNumber: bank['accountNumber'] as String? ?? '',
        accountName: bank['accountName'] as String? ?? '',
        bankCode: bank['bankCode'] as String?,
      );
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Withdrawal of ${_formatCurrency(_amount)} submitted for processing. You will be notified when completed.',
              style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700),
            ),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
            duration: const Duration(seconds: 5),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (e) {
      if (mounted) _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
        backgroundColor: const Color(0xFFEF4444),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final paymentMethods = context.watch<AuthProvider>().userModel?.paymentMethods ?? [];
    final wallet = context.watch<WalletProvider>();
    final ngnBalance = wallet.nairaBalance;

    // Clamp selected index if list shrinks
    if (_selectedBankIndex >= paymentMethods.length && paymentMethods.isNotEmpty) {
      _selectedBankIndex = 0;
    }

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
                          _buildAmountSection(ngnBalance),
                          const SizedBox(height: 24),
                          _buildDestinationSection(paymentMethods),
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
                        child: _buildActionButton(paymentMethods),
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
                    child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18),
                  ),
                ),
              ),
            ),
          ),
          Text(
            'Withdraw Funds',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -0.5),
          ),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildAmountSection(double ngnBalance) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Available Balance',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              Text('₦' + NumberFormat('#,##0.00').format(ngnBalance),
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text('₦',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white54)),
              const SizedBox(width: 4),
              Flexible(
                child: TextField(
                  controller: _amountController,
                  focusNode: _amountFocusNode,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white),
                  decoration: InputDecoration(
                    hintText: '0',
                    hintStyle: GoogleFonts.plusJakartaSans(
                        fontSize: 42, fontWeight: FontWeight.w900, color: Colors.white24),
                    border: InputBorder.none,
                    isDense: true,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_exceedsBalance)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8)),
              child: Text('Exceeds available balance',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFEF4444))),
            )
          else if (_amount < AppConstants.minWithdrawal && _amount > 0)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8)),
              child: Text('Minimum withdrawal: ₦' + NumberFormat('#,##0').format(AppConstants.minWithdrawal),
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFF59E0B))),
            ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _setMaxAmount,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Text('Max',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white70)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDestinationSection(List<Map<String, dynamic>> paymentMethods) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Withdraw To',
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
            GestureDetector(
              onTap: _openAddBankModal,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('+ Add Account',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA))),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (paymentMethods.isEmpty)
          _buildEmptyBankState()
        else
          ...List.generate(paymentMethods.length, (index) {
            final bank = paymentMethods[index];
            final isSelected = _selectedBankIndex == index;
            final bankName = bank['bankName'] as String? ?? 'Bank';
            final accountNumber = bank['accountNumber'] as String? ?? '';
            final accountName = bank['accountName'] as String? ?? '';
            final initial = bankName.isNotEmpty ? bankName[0].toUpperCase() : 'B';

            return GestureDetector(
              onTap: () => setState(() => _selectedBankIndex = index),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected
                      ? const Color(0xFF2563EB).withOpacity(0.08)
                      : Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected
                        ? const Color(0xFF2563EB).withOpacity(0.4)
                        : Colors.white.withOpacity(0.08),
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF1E3A8A).withOpacity(0.3),
                        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                      ),
                      child: Center(
                        child: Text(initial,
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA))),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(bankName,
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text(accountNumber,
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                          Text(accountName,
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
                        ],
                      ),
                    ),
                    if (isSelected)
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF2563EB).withOpacity(0.2),
                        ),
                        child: const Icon(Icons.check_rounded, size: 12, color: Color(0xFF60A5FA)),
                      ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildEmptyBankState() {
    return GestureDetector(
      onTap: _openAddBankModal,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 32),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
              color: Colors.white.withOpacity(0.08), style: BorderStyle.solid),
        ),
        child: Column(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF2563EB).withOpacity(0.1),
              ),
              child: const Icon(Icons.account_balance_rounded,
                  color: Color(0xFF60A5FA), size: 22),
            ),
            const SizedBox(height: 12),
            Text('No bank accounts added',
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(height: 4),
            Text('Add a bank account to withdraw funds',
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text('+ Add Bank Account',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreakdownSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        children: [
          _infoRow('Amount', _amount > 0 ? '₦' + NumberFormat('#,##0.00').format(_amount) : '₦0.00'),
          const SizedBox(height: 10),
          _infoRow('Processing Fee', '₦' + NumberFormat('#,##0.00').format(_fee),
              valueColor: const Color(0xFFEF4444)),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(color: Color(0x1AFFFFFF), height: 1),
          ),
          _infoRow(
            'You Receive',
            _receiveAmount > 0 ? '₦' + NumberFormat('#,##0.00').format(_receiveAmount) : '₦0.00',
            valueColor: const Color(0xFF10B981),
            bold: true,
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value,
      {Color? valueColor, bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
                color: const Color(0xFF9CA3AF))),
        Text(value,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
                color: valueColor ?? Colors.white)),
      ],
    );
  }

  Widget _buildInfoBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withOpacity(0.06),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline_rounded, color: Color(0xFFF59E0B), size: 16),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Withdrawals are processed within 24 hours. You will receive a notification once completed.',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFFF59E0B)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(List<Map<String, dynamic>> paymentMethods) {
    final canWithdraw = _amount >= AppConstants.minWithdrawal &&
        !_exceedsBalance &&
        paymentMethods.isNotEmpty &&
        !_isProcessing;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withOpacity(0),
            Colors.black.withOpacity(0.9),
          ],
        ),
      ),
      child: GestureDetector(
        onTap: canWithdraw
            ? () {
                final bank = paymentMethods[_selectedBankIndex];
                _showConfirmationSheet(bank);
              }
            : null,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 18),
          decoration: BoxDecoration(
            color: canWithdraw ? const Color(0xFFEF4444) : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(16),
            boxShadow: canWithdraw
                ? [BoxShadow(color: const Color(0xFFEF4444).withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 6))]
                : [],
          ),
          child: Center(
            child: _isProcessing
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : Text(
                    paymentMethods.isEmpty ? 'Add Bank Account First' : 'Withdraw Funds',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: canWithdraw ? Colors.white : const Color(0xFF4B5563)),
                  ),
          ),
        ),
      ),
    );
  }
}

// ─── Confirmation Sheet ──────────────────────────────────────────────────────

class _ConfirmWithdrawSheet extends StatelessWidget {
  const _ConfirmWithdrawSheet({
    required this.amount,
    required this.fee,
    required this.receiveAmount,
    required this.bankName,
    required this.accountNumber,
    required this.accountName,
  });

  final double amount;
  final double fee;
  final double receiveAmount;
  final String bankName;
  final String accountNumber;
  final String accountName;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F1423),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
      ),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white24,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 20),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFEF4444).withOpacity(0.1),
              border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3)),
            ),
            child: const Icon(Icons.send_rounded, color: Color(0xFFEF4444), size: 24),
          ),
          const SizedBox(height: 12),
          Text('Confirm Withdrawal',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
          const SizedBox(height: 4),
          Text('Please review before confirming',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
          const SizedBox(height: 24),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              children: [
                _row('Amount', '₦' + NumberFormat('#,##0.00').format(amount)),
                const SizedBox(height: 10),
                _row('Fee', '₦' + NumberFormat('#,##0.00').format(fee),
                    valueColor: const Color(0xFFEF4444)),
                const SizedBox(height: 10),
                _row('You Receive', '₦' + NumberFormat('#,##0.00').format(receiveAmount),
                    valueColor: const Color(0xFF10B981), bold: true),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(color: Color(0x1AFFFFFF), height: 1),
                ),
                _row('Bank', bankName),
                const SizedBox(height: 6),
                _row('Account Number', accountNumber),
                const SizedBox(height: 6),
                _row('Account Name', accountName),
              ],
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF59E0B).withOpacity(0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2)),
            ),
            child: Row(
              children: [
                const Icon(Icons.schedule_rounded, color: Color(0xFFF59E0B), size: 14),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Processing time: up to 24 hours',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFFF59E0B)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  onTap: () => Navigator.pop(context, false),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.06),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Center(
                        child: Text('Cancel',
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                color: Colors.white70))),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: GestureDetector(
                  onTap: () => Navigator.pop(context, true),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                            color: const Color(0xFFEF4444).withOpacity(0.3),
                            blurRadius: 16,
                            offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Center(
                        child: Text('Confirm Withdrawal',
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: Colors.white))),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value,
      {Color? valueColor, bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF9CA3AF))),
        Text(value,
            style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
                color: valueColor ?? Colors.white)),
      ],
    );
  }
}

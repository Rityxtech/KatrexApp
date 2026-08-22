import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/cloud_functions_service.dart';
import '../services/firestore_service.dart';
import '../utils/constants.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/pin_input_sheet.dart';
import 'profile_modals.dart';
import 'transaction_history_screen.dart';

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
      if (_amountFocusNode.hasFocus) _scrollToField(100);
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
    return '₦${NumberFormat('#,##0.00').format(val)}';
  }

  void _setPercentageAmount(double fraction) {
    final available = _maxBalance - _fee;
    if (available <= 0) {
      _amountController.text = '0';
      return;
    }
    final target = (available * fraction).floorToDouble();
    _amountController.text = NumberFormat('#,###').format(target);
  }

  List<Map<String, dynamic>> get _paymentMethods {
    return context.read<AuthProvider>().userModel?.paymentMethods ?? [];
  }

  void _openAddBankModal() {
    final methods = context.read<AuthProvider>().userModel?.paymentMethods ?? [];
    if (methods.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Maximum of 3 bank accounts reached. Delete an existing account to add a new one.',
            style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700),
          ),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AddBankAccountModal(),
    ).then((_) => setState(() {}));
  }

  void _showAccountPicker(List<Map<String, dynamic>> paymentMethods) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setSheetState) {
          final user = context.watch<AuthProvider>().userModel;
          final currentMethods = user?.paymentMethods ?? paymentMethods;
          final isLimit = currentMethods.length >= 3;

          return Container(
            decoration: const BoxDecoration(
              color: Color(0xFF0F1423),
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white24,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Select Destination Bank',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      if (!isLimit)
                        GestureDetector(
                          onTap: () {
                            Navigator.pop(ctx);
                            _openAddBankModal();
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB).withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '+ Add New (${currentMethods.length}/3)',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF60A5FA),
                              ),
                            ),
                          ),
                        )
                      else
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            '3/3 Accounts Used',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF9CA3AF),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  if (currentMethods.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'No bank accounts linked yet',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF9CA3AF),
                          ),
                        ),
                      ),
                    )
                  else
                    ...List.generate(currentMethods.length, (index) {
                      final bank = currentMethods[index];
                      final isSelected = _selectedBankIndex == index;
                      final bankName = bank['bankName'] as String? ?? 'Bank';
                      final accountNumber = bank['accountNumber'] as String? ?? '';
                      final accountName = bank['accountName'] as String? ?? '';
                      final initial = bankName.isNotEmpty ? bankName[0].toUpperCase() : 'B';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFF2563EB).withOpacity(0.12)
                              : Colors.white.withOpacity(0.04),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isSelected
                                ? const Color(0xFF2563EB).withOpacity(0.5)
                                : Colors.white.withOpacity(0.08),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () {
                                  setState(() => _selectedBankIndex = index);
                                  Navigator.pop(ctx);
                                },
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          shape: BoxShape.circle,
                                          color: const Color(0xFF1E3A8A).withOpacity(0.4),
                                          border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                                        ),
                                        child: Center(
                                          child: Text(
                                            initial,
                                            style: GoogleFonts.plusJakartaSans(
                                              fontSize: 15,
                                              fontWeight: FontWeight.w900,
                                              color: const Color(0xFF60A5FA),
                                            ),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              bankName,
                                              style: GoogleFonts.plusJakartaSans(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w800,
                                                color: Colors.white,
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '$accountNumber • $accountName',
                                              style: GoogleFonts.plusJakartaSans(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w600,
                                                color: const Color(0xFF9CA3AF),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (isSelected)
                                        const Icon(Icons.check_circle_rounded, color: Color(0xFF2563EB), size: 20),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: () async {
                                final confirmed = await showModalBottomSheet<bool>(
                                  context: context,
                                  backgroundColor: Colors.transparent,
                                  builder: (confirmCtx) => Container(
                                    decoration: const BoxDecoration(
                                      color: Color(0xFF0F1423),
                                      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
                                      border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
                                    ),
                                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
                                    child: SafeArea(
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
                                          const SizedBox(height: 18),
                                          Container(
                                            width: 50,
                                            height: 50,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              color: const Color(0xFFEF4444).withOpacity(0.12),
                                            ),
                                            child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 24),
                                          ),
                                          const SizedBox(height: 12),
                                          Text(
                                            'Remove Bank Account?',
                                            style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w900, color: Colors.white),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            'Are you sure you want to remove $bankName ($accountNumber)?',
                                            textAlign: TextAlign.center,
                                            style: GoogleFonts.plusJakartaSans(fontSize: 12.5, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)),
                                          ),
                                          const SizedBox(height: 20),
                                          Row(
                                            children: [
                                              Expanded(
                                                child: GestureDetector(
                                                  onTap: () => Navigator.pop(confirmCtx, false),
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                                    decoration: BoxDecoration(
                                                      color: Colors.white.withOpacity(0.06),
                                                      borderRadius: BorderRadius.circular(12),
                                                    ),
                                                    child: Center(
                                                      child: Text(
                                                        'Cancel',
                                                        style: GoogleFonts.plusJakartaSans(fontSize: 13.5, fontWeight: FontWeight.w800, color: Colors.white70),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                              const SizedBox(width: 10),
                                              Expanded(
                                                child: GestureDetector(
                                                  onTap: () => Navigator.pop(confirmCtx, true),
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFFEF4444),
                                                      borderRadius: BorderRadius.circular(12),
                                                    ),
                                                    child: Center(
                                                      child: Text(
                                                        'Remove',
                                                        style: GoogleFonts.plusJakartaSans(fontSize: 13.5, fontWeight: FontWeight.w900, color: Colors.white),
                                                      ),
                                                    ),
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );

                                if (confirmed == true) {
                                  final auth = context.read<AuthProvider>();
                                  final uid = auth.firebaseUser?.uid;
                                  if (uid != null) {
                                    await FirestoreService().removeBankAccount(uid: uid, accountNumber: accountNumber);
                                    try {
                                      await CloudFunctionsService.removeBankAccount(accountNumber: accountNumber);
                                    } catch (_) {}
                                    await auth.reloadUserProfile();
                                    if (mounted) {
                                      setState(() {
                                        _selectedBankIndex = 0;
                                      });
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text('Bank account removed', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                                          backgroundColor: const Color(0xFF10B981),
                                          behavior: SnackBarBehavior.floating,
                                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                        ),
                                      );
                                    }
                                  }
                                }
                              },
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                child: const Icon(Icons.delete_outline_rounded, color: Color(0xFFEF4444), size: 20),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
          );
        },
      ),
    );
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
      _showError('Amount + fee exceeds available balance');
      return;
    }

    // PIN Gate
    final success = await PinInputSheet.ensurePinRequired(context);
    if (success != true) return;

    setState(() => _isProcessing = true);
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final txId = await FirestoreService().requestWithdrawal(
        uid: uid,
        amount: _amount,
        bankName: bank['bankName'] as String? ?? '',
        accountNumber: bank['accountNumber'] as String? ?? '',
        accountName: bank['accountName'] as String? ?? '',
        bankCode: bank['bankCode'] as String?,
      );

      if (mounted) {
        _amountController.clear();
        await _showProcessingResultSheet(
          txId: txId,
          amount: _amount,
          receiveAmount: _receiveAmount,
          bankName: bank['bankName'] as String? ?? '',
          accountNumber: bank['accountNumber'] as String? ?? '',
          accountName: bank['accountName'] as String? ?? '',
        );
      }
    } catch (e) {
      if (mounted) _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _showProcessingResultSheet({
    required String txId,
    required double amount,
    required double receiveAmount,
    required String bankName,
    required String accountNumber,
    required String accountName,
  }) async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (ctx) => _WithdrawalStatusModal(
        txId: txId,
        amount: amount,
        receiveAmount: receiveAmount,
        bankName: bankName,
        accountNumber: accountNumber,
        accountName: accountName,
      ),
    );
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
                          10,
                          16,
                          115 + MediaQuery.viewInsetsOf(context).bottom,
                        ),
                        children: [
                          _buildWithdrawalHero(ngnBalance),
                          const SizedBox(height: 14),
                          _buildDestinationCard(paymentMethods),
                          const SizedBox(height: 14),
                          _buildBreakdownCard(),
                          const SizedBox(height: 12),
                          _buildSecurityBadge(),
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
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: const Center(
                    child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 22),
                  ),
                ),
              ),
            ),
          ),
          Row(
            children: [
              Text(
                'Withdraw NGN',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.bolt_rounded, size: 10, color: Color(0xFF10B981)),
                    const SizedBox(width: 2),
                    Text(
                      'INSTANT',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF10B981),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          GestureDetector(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const TransactionHistoryScreen()),
            ),
            child: Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: const Center(
                child: Icon(Icons.receipt_long_rounded, color: Colors.white70, size: 18),
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Compact, unified hero card combining Available Balance + Amount Input + Quick Percentages
  Widget _buildWithdrawalHero(double ngnBalance) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1423).withOpacity(0.7),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.white.withOpacity(0.09)),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF1E293B).withOpacity(0.35),
            const Color(0xFF0F172A).withOpacity(0.7),
          ],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row 1: Compact Sided Balance & Fee Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4.5),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.08)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.account_balance_wallet_rounded, color: Color(0xFF10B981), size: 12),
                    const SizedBox(width: 5),
                    Text(
                      'Available: ',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF9CA3AF),
                      ),
                    ),
                    Text(
                      _formatCurrency(ngnBalance),
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_amount > 0)
                    GestureDetector(
                      onTap: () => _amountController.clear(),
                      child: Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: Text(
                          'Clear',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFFEF4444),
                          ),
                        ),
                      ),
                    ),
                  Text(
                    'Fee: ₦50',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ],
          ),

          const SizedBox(height: 14),

          // Row 2: Large Amount Input with Currency and Inline Max Button
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                '₦',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 28,
                  fontWeight: FontWeight.w900,
                  color: _amount > 0 ? const Color(0xFF10B981) : Colors.white30,
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: TextField(
                  controller: _amountController,
                  focusNode: _amountFocusNode,
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.left,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 32,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                  inputFormatters: [
                    _ThousandsSeparatorInputFormatter(),
                  ],
                  decoration: InputDecoration(
                    hintText: '0.00',
                    hintStyle: GoogleFonts.plusJakartaSans(
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: Colors.white24,
                    ),
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ),
              GestureDetector(
                onTap: () => _setPercentageAmount(1.0),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.18),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.35)),
                  ),
                  child: Text(
                    'MAX',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF60A5FA),
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
            ],
          ),

          // Inline validation notice (compact)
          if (_exceedsBalance) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444).withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.error_outline_rounded, size: 12, color: Color(0xFFEF4444)),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      'Exceeds balance (need ${_formatCurrency(_amount + _fee)} incl. ₦50 fee)',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFFEF4444),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ] else if (_amount < AppConstants.minWithdrawal && _amount > 0) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.info_outline_rounded, size: 12, color: Color(0xFFF59E0B)),
                  const SizedBox(width: 4),
                  Text(
                    'Min withdrawal is ${_formatCurrency(AppConstants.minWithdrawal)}',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFFF59E0B),
                    ),
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 14),

          // Row 3: Quick Percentage Chips
          Row(
            children: [
              _percentageChip('25%', () => _setPercentageAmount(0.25)),
              const SizedBox(width: 6),
              _percentageChip('50%', () => _setPercentageAmount(0.50)),
              const SizedBox(width: 6),
              _percentageChip('75%', () => _setPercentageAmount(0.75)),
              const SizedBox(width: 6),
              _percentageChip('100%', () => _setPercentageAmount(1.0), isPrimary: true),
            ],
          ),
        ],
      ),
    );
  }

  Widget _percentageChip(String label, VoidCallback onTap, {bool isPrimary = false}) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6.5),
          decoration: BoxDecoration(
            color: isPrimary
                ? const Color(0xFF2563EB).withOpacity(0.18)
                : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: isPrimary
                  ? const Color(0xFF2563EB).withOpacity(0.35)
                  : Colors.white.withOpacity(0.08),
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: isPrimary ? const Color(0xFF60A5FA) : Colors.white70,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDestinationCard(List<Map<String, dynamic>> paymentMethods) {
    if (paymentMethods.isEmpty) {
      return _buildEmptyBankState();
    }

    final selectedBank = paymentMethods[_selectedBankIndex];
    final bankName = selectedBank['bankName'] as String? ?? 'Bank Account';
    final accountNumber = selectedBank['accountNumber'] as String? ?? '';
    final accountName = selectedBank['accountName'] as String? ?? '';
    final initial = bankName.isNotEmpty ? bankName[0].toUpperCase() : 'B';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1423).withOpacity(0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'DESTINATION ACCOUNT',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 10.5,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF6B7280),
                  letterSpacing: 1.2,
                ),
              ),
              GestureDetector(
                onTap: () => _showAccountPicker(paymentMethods),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3.5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    paymentMethods.length > 1 ? 'Switch Account' : '+ Add Bank',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF60A5FA),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF1E3A8A).withOpacity(0.3),
                    border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                  ),
                  child: Center(
                    child: Text(
                      initial,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF60A5FA),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              bankName,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(width: 5),
                          const Icon(Icons.verified_rounded, size: 13, color: Color(0xFF10B981)),
                        ],
                      ),
                      const SizedBox(height: 1.5),
                      Text(
                        accountNumber,
                        style: GoogleFonts.robotoMono(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFE5E7EB),
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        accountName,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF9CA3AF),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right_rounded, size: 18, color: Color(0xFF6B7280)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyBankState() {
    return GestureDetector(
      onTap: _openAddBankModal,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1423).withOpacity(0.5),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF2563EB).withOpacity(0.12),
                border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2)),
              ),
              child: const Icon(Icons.account_balance_rounded, color: Color(0xFF60A5FA), size: 20),
            ),
            const SizedBox(height: 10),
            Text(
              'No Bank Account Added',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13.5,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              'Add a bank account in your name to withdraw funds',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '+ Add Bank Account',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11.5,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreakdownCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F1423).withOpacity(0.5),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        children: [
          _infoRow('Withdrawal Amount', _amount > 0 ? _formatCurrency(_amount) : '₦0.00'),
          const SizedBox(height: 8),
          _infoRow('Processing Fee', _formatCurrency(_fee), valueColor: const Color(0xFFEF4444)),
          const SizedBox(height: 8),
          _infoRow('Estimated Settlement', '⚡ Instant - 15 Mins', valueColor: const Color(0xFF60A5FA)),
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 10),
            child: Divider(color: Color(0x1AFFFFFF), height: 1),
          ),
          _infoRow(
            'You Receive',
            _receiveAmount > 0 ? _formatCurrency(_receiveAmount) : '₦0.00',
            valueColor: const Color(0xFF10B981),
            bold: true,
            large: true,
          ),
        ],
      ),
    );
  }

  Widget _infoRow(
    String label,
    String value, {
    Color? valueColor,
    bool bold = false,
    bool large = false,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: large ? 13.5 : 11.5,
            fontWeight: bold ? FontWeight.w800 : FontWeight.w600,
            color: const Color(0xFF9CA3AF),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: large ? 15.5 : 12.5,
            fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
            color: valueColor ?? Colors.white,
          ),
        ),
      ],
    );
  }

  Widget _buildSecurityBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF10B981).withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.15)),
      ),
      child: Row(
        children: [
          const Icon(Icons.shield_outlined, color: Color(0xFF10B981), size: 15),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Bank-grade encrypted transfers to your verified account only.',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF10B981),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton(List<Map<String, dynamic>> paymentMethods) {
    final hasBank = paymentMethods.isNotEmpty;
    final validAmount = _amount >= AppConstants.minWithdrawal && !_exceedsBalance;
    final canWithdraw = hasBank && validAmount && !_isProcessing;

    String buttonText = 'Withdraw Funds';
    if (!hasBank) {
      buttonText = 'Add Bank Account First';
    } else if (_amount == 0) {
      buttonText = 'Enter Amount';
    } else if (_amount < AppConstants.minWithdrawal) {
      buttonText = 'Min Withdrawal ${_formatCurrency(AppConstants.minWithdrawal)}';
    } else if (_exceedsBalance) {
      buttonText = 'Insufficient Balance';
    } else {
      buttonText = 'Withdraw ${_formatCurrency(_amount)}';
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withOpacity(0),
            Colors.black.withOpacity(0.95),
          ],
        ),
      ),
      child: GestureDetector(
        onTap: canWithdraw
            ? () {
                final bank = paymentMethods[_selectedBankIndex];
                _showConfirmationSheet(bank);
              }
            : (!hasBank ? _openAddBankModal : null),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 15),
          decoration: BoxDecoration(
            color: canWithdraw
                ? const Color(0xFF10B981)
                : (hasBank ? const Color(0xFF1E293B) : const Color(0xFF2563EB)),
            borderRadius: BorderRadius.circular(15),
            boxShadow: canWithdraw
                ? [
                    BoxShadow(
                      color: const Color(0xFF10B981).withOpacity(0.35),
                      blurRadius: 18,
                      offset: const Offset(0, 5),
                    ),
                  ]
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
                    buttonText,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w900,
                      color: canWithdraw || !hasBank ? Colors.white : const Color(0xFF6B7280),
                    ),
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
              color: const Color(0xFF10B981).withOpacity(0.12),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
            ),
            child: const Icon(Icons.send_rounded, color: Color(0xFF10B981), size: 24),
          ),
          const SizedBox(height: 12),
          Text(
            'Confirm Withdrawal',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 18,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Please review your transaction details before proceeding',
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF9CA3AF),
            ),
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(
              children: [
                _row('Amount', '₦${NumberFormat('#,##0.00').format(amount)}'),
                const SizedBox(height: 10),
                _row('Fee', '₦${NumberFormat('#,##0.00').format(fee)}', valueColor: const Color(0xFFEF4444)),
                const SizedBox(height: 10),
                _row('You Receive', '₦${NumberFormat('#,##0.00').format(receiveAmount)}',
                    valueColor: const Color(0xFF10B981), bold: true),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Divider(color: Color(0x1AFFFFFF), height: 1),
                ),
                _row('Bank', bankName),
                const SizedBox(height: 8),
                _row('Account Number', accountNumber),
                const SizedBox(height: 8),
                _row('Account Name', accountName),
              ],
            ),
          ),
          const SizedBox(height: 16),
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
                    'Withdrawal will be queued and sent to your bank account securely.',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFFF59E0B),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
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
                      child: Text(
                        'Cancel',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Colors.white70,
                        ),
                      ),
                    ),
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
                      color: const Color(0xFF10B981),
                      borderRadius: BorderRadius.circular(14),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF10B981).withOpacity(0.35),
                          blurRadius: 16,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        'Confirm & Authorize',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _row(String label, String value, {Color? valueColor, bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF9CA3AF),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: bold ? FontWeight.w900 : FontWeight.w700,
            color: valueColor ?? Colors.white,
          ),
        ),
      ],
    );
  }
}

// ─── Withdrawal Processing Status Modal ──────────────────────────────────────

class _WithdrawalStatusModal extends StatelessWidget {
  final String txId;
  final double amount;
  final double receiveAmount;
  final String bankName;
  final String accountNumber;
  final String accountName;

  const _WithdrawalStatusModal({
    required this.txId,
    required this.amount,
    required this.receiveAmount,
    required this.bankName,
    required this.accountNumber,
    required this.accountName,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0F1423),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
      ),
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 36),
      child: SafeArea(
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
            const SizedBox(height: 24),
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFF59E0B).withOpacity(0.12),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
              ),
              child: const Center(
                child: Icon(Icons.hourglass_top_rounded, color: Color(0xFFF59E0B), size: 30),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Withdrawal Processing',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Your request of ₦${NumberFormat('#,##0.00').format(amount)} is in the processing queue.',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(height: 22),
            // Timeline
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                children: [
                  _timelineItem(
                    title: 'Withdrawal Requested',
                    subtitle: 'Funds securely deducted from your wallet',
                    isDone: true,
                    isActive: false,
                  ),
                  _timelineDivider(),
                  _timelineItem(
                    title: 'Admin Review & Transfer',
                    subtitle: 'Payout queued to $bankName ($accountNumber)',
                    isDone: false,
                    isActive: true,
                  ),
                  _timelineDivider(),
                  _timelineItem(
                    title: 'Bank Credit',
                    subtitle: 'Funds delivered to $accountName',
                    isDone: false,
                    isActive: false,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withOpacity(0.3),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Center(
                  child: Text(
                    'Done',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 15,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _timelineItem({
    required String title,
    required String subtitle,
    required bool isDone,
    required bool isActive,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 22,
          height: 22,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isDone
                ? const Color(0xFF10B981)
                : (isActive ? const Color(0xFFF59E0B) : Colors.white12),
          ),
          child: Center(
            child: isDone
                ? const Icon(Icons.check_rounded, color: Colors.white, size: 14)
                : (isActive
                    ? const SizedBox(
                        width: 10,
                        height: 10,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 1.5,
                        ),
                      )
                    : const Icon(Icons.circle, color: Colors.white24, size: 6)),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: isDone || isActive ? Colors.white : const Color(0xFF6B7280),
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _timelineDivider() {
    return Padding(
      padding: const EdgeInsets.only(left: 10, top: 4, bottom: 4),
      child: Align(
        alignment: Alignment.centerLeft,
        child: Container(
          width: 2,
          height: 16,
          color: Colors.white12,
        ),
      ),
    );
  }
}

// ─── Input Formatter for Auto-Comma Separator ────────────────────────────────

class _ThousandsSeparatorInputFormatter extends TextInputFormatter {
  static final NumberFormat _formatter = NumberFormat('#,###');

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    if (newValue.text.isEmpty) {
      return newValue.copyWith(text: '');
    }

    final text = newValue.text;
    final parts = text.split('.');
    if (parts.length > 2) {
      return oldValue;
    }

    final rawInteger = parts[0].replaceAll(RegExp(r'[^\d]'), '');
    if (rawInteger.isEmpty) {
      if (parts.length == 2) {
        final decimalPart = parts[1].replaceAll(RegExp(r'[^\d]'), '');
        final formatted = '0.$decimalPart';
        return TextEditingValue(
          text: formatted,
          selection: TextSelection.collapsed(offset: formatted.length),
        );
      }
      return const TextEditingValue(
        text: '',
        selection: TextSelection.collapsed(offset: 0),
      );
    }

    final numVal = int.tryParse(rawInteger);
    if (numVal == null) {
      return oldValue;
    }

    final formattedInteger = _formatter.format(numVal);
    final String formattedText = parts.length == 2
        ? '$formattedInteger.${parts[1].replaceAll(RegExp(r'[^\d]'), '')}'
        : formattedInteger;

    // Calculate cursor position properly based on non-comma characters
    int nonCommaCharsBeforeCursor = 0;
    for (int i = 0; i < newValue.selection.end && i < newValue.text.length; i++) {
      if (newValue.text[i] != ',') {
        nonCommaCharsBeforeCursor++;
      }
    }

    int newCursorOffset = 0;
    int nonCommaCharsSeen = 0;
    while (newCursorOffset < formattedText.length && nonCommaCharsSeen < nonCommaCharsBeforeCursor) {
      if (formattedText[newCursorOffset] != ',') {
        nonCommaCharsSeen++;
      }
      newCursorOffset++;
    }

    if (newValue.selection.end == newValue.text.length) {
      newCursorOffset = formattedText.length;
    }

    return TextEditingValue(
      text: formattedText,
      selection: TextSelection.collapsed(offset: newCursorOffset.clamp(0, formattedText.length)),
    );
  }
}

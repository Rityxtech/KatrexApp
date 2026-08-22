import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/firestore_service.dart';
import '../services/cloud_functions_service.dart';
import '../services/squad_service.dart';
import '../services/vtu_provider_service.dart';
import '../utils/constants.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/pin_input_sheet.dart';
import '../widgets/squad_checkout_sheet.dart';
import '../widgets/transaction_result_modal.dart';
import '../utils/recent_numbers.dart';
import 'package:flutter_contacts/flutter_contacts.dart';

class BuyAirtimeScreen extends StatefulWidget {
  const BuyAirtimeScreen({super.key});

  @override
  State<BuyAirtimeScreen> createState() => _BuyAirtimeScreenState();
}

class _BuyAirtimeScreenState extends State<BuyAirtimeScreen> {
  int _selectedNetwork = 0; // 0: MTN, 1: Airtel, 2: Glo, 3: 9Mobile
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _amountController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final FocusNode _phoneFocusNode = FocusNode();
  final FocusNode _amountFocusNode = FocusNode();
  bool _isProcessing = false;
  int _paymentMethod = 0; // 0: Wallet, 1: Card (Squad)
  List<_RecentContact> _recentNumbers = [];

  double get _amount => double.tryParse(_amountController.text.replaceAll(',', '')) ?? 0;

  Future<void> _processAirtime() async {
    final rawPhone = _phoneController.text.trim();
    String phone = rawPhone.replaceAll(RegExp(r'[^0-9]'), '');
    if (phone.startsWith('234')) phone = '0${phone.substring(3)}';
    else if (!phone.startsWith('0')) phone = '0$phone';
    if (phone.length < 11) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter a phone number', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }
    if (_amount < AppConstants.minAirtimePurchase) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Minimum airtime purchase is \u20A6${AppConstants.minAirtimePurchase}', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }
    if (_amount > AppConstants.maxAirtimePurchase) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Maximum airtime purchase is \u20A6${NumberFormat('#,##0').format(AppConstants.maxAirtimePurchase)} per transaction', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }

    final wallet = context.read<WalletProvider>();
    if (_paymentMethod == 0 && _amount > wallet.nairaBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Insufficient wallet balance. Use card payment instead.', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }

    final pinPassed = await PinInputSheet.ensurePinRequired(context);
    if (!pinPassed) return;

    setState(() => _isProcessing = true);
    final messenger = ScaffoldMessenger.of(context);

    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final user = context.read<AuthProvider>().userModel;
      final network = _networks[_selectedNetwork]['name'] as String;
      final reference = 'smclientkx-air-${DateTime.now().millisecondsSinceEpoch}';
      final firestore = FirestoreService();

      // If paying with card, initialize Squad checkout
      if (_paymentMethod == 1) {
        final squadResult = await SquadService.initializeCheckout(
          amount: _amount,
          customerName: user?.fullName ?? 'User',
          customerEmail: user?.email ?? 'user@smclientkx.com',
          reference: reference,
        );

        if (!squadResult.success || squadResult.checkoutUrl == null) {
          if (mounted) {
            messenger.showSnackBar(
              SnackBar(content: Text(squadResult.errorMessage ?? 'Payment initialization failed', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
            );
          }
          return;
        }

        // Create pending transaction before launching checkout
        final pendingTx = TransactionModel(
          id: '',
          uid: uid,
          type: TransactionType.airtime,
          status: TransactionStatus.pending,
          amountNaira: _amount,
          description: 'Airtime purchase - $network - $phone',
          reference: reference,
          createdAt: DateTime.now(),
          paymentMethod: 'card',
          recipient: phone,
        );
        final txId = await firestore.createTransaction(pendingTx);

        // Launch in-app Squad checkout in a bottom sheet
        if (!mounted) return;
        final returnedRef = await SquadCheckoutSheet.show(
          context,
          checkoutUrl: squadResult.checkoutUrl!,
          amount: amount,
          reference: squadResult.reference,
        );

        if (returnedRef == null) {
          await firestore.updateTransactionStatus(txId, TransactionStatus.failed);
          if (mounted) {
            messenger.showSnackBar(
              SnackBar(content: Text('Payment cancelled', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
            );
          }
          return;
        }

        // Complete card payment server-side (verifies Squad + delivers airtime + updates transaction)
        final cardResult = await CloudFunctionsService.completeCardAirtime(
          squadRef: returnedRef,
          phone: phone,
          amount: _amount,
          network: network,
          transactionId: txId,
        );
        final cardSuccess = cardResult['success'] == true;

        if (mounted) {
          await showTransactionResultModal(
            context: context,
            success: cardSuccess,
            title: cardSuccess ? 'Airtime Purchased!' : 'Purchase Failed',
            subtitle: cardSuccess
                ? '\u20A6${NumberFormat('#,##0').format(_amount)} airtime delivered to $phone'
                : (cardResult['refunded'] == true
                    ? '\u20A6${NumberFormat('#,##0').format(_amount)} refunded to wallet'
                    : (cardResult['message'] ?? 'Purchase failed')),
            amount: _amount,
            recipient: phone,
            network: network,
            reference: returnedRef,
            paymentMethod: 'card',
            errorMessage: cardSuccess ? null : (cardResult['message'] as String?),
          );
          if (mounted && cardSuccess) {
            await RecentNumbers.save(uid, phone, _selectedNetwork);
            _loadRecentNumbers();
            _phoneController.clear();
            setState(() {
              _selectedNetwork = 0;
              _amountController.clear();
            });
          }
        }
      } else {
        // Wallet payment — Cloud Function handles atomic debit and transaction
        final result = await VtuProviderService.purchaseAirtime(
          networkIndex: _selectedNetwork,
          amount: _amount,
          phone: phone,
          customerReference: reference,
        );

        if (mounted) {
          await showTransactionResultModal(
            context: context,
            success: result.success,
            title: result.success ? 'Airtime Purchased!' : 'Purchase Failed',
            subtitle: result.success
                ? '₦${NumberFormat('#,##0').format(_amount)} airtime delivered to $phone'
                : (result.message ?? 'Purchase failed'),
            amount: _amount,
            recipient: phone,
            network: network,
            reference: reference,
            paymentMethod: 'wallet',
            errorMessage: result.success ? null : result.message,
          );
          if (mounted && result.success) {
            await RecentNumbers.save(uid, phone, _selectedNetwork);
            _loadRecentNumbers();
            _phoneController.clear();
            setState(() {
              _selectedNetwork = 0;
              _amountController.clear();
            });
          }
        }
      }
    } catch (e) {
      if (mounted) {
        messenger.showSnackBar(
          SnackBar(content: Text('Purchase failed: $e', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  final _networks = [
    {'name': 'MTN', 'short': 'MTN', 'color': const Color(0xFFFFCC00), 'image': 'assets/networks/mtn.jpg'},
    {'name': 'Airtel', 'short': 'AIR', 'color': const Color(0xFFFF0000), 'image': 'assets/networks/airtel.jpg'},
    {'name': 'Glo', 'short': 'GLO', 'color': const Color(0xFF009933), 'image': 'assets/networks/glo.jpg'},
    {'name': '9Mobile', 'short': '9M', 'color': const Color(0xFF006600), 'image': 'assets/networks/9mobile.jpg'},
  ];

  static const _mtnPrefixes = ['0703', '0706', '0803', '0806', '0813', '0814', '0816', '0903', '0906', '0913', '0916'];
  static const _airtelPrefixes = ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912'];
  static const _gloPrefixes = ['0705', '0805', '0807', '0811', '0815', '0905', '0915'];
  static const _9mobilePrefixes = ['0809', '0817', '0818', '0908', '0909'];

  void _detectNetwork(String phone) {
    String digits = phone.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.startsWith('234')) digits = '0${digits.substring(3)}';
    if (!digits.startsWith('0')) digits = '0$digits';
    if (digits.length < 4) return;
    final prefix = digits.substring(0, 4);
    int? detected;
    if (_mtnPrefixes.contains(prefix)) detected = 0;
    else if (_airtelPrefixes.contains(prefix)) detected = 1;
    else if (_gloPrefixes.contains(prefix)) detected = 2;
    else if (_9mobilePrefixes.contains(prefix)) detected = 3;
    if (detected != null) {
      setState(() => _selectedNetwork = detected!);
    }
  }

  @override
  void initState() {
    super.initState();
    _amountFocusNode.addListener(() {
      if (_amountFocusNode.hasFocus) _scrollToField(200);
    });
    _loadRecentNumbers();
  }

  Future<void> _loadRecentNumbers() async {
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      // Load local recent numbers first for instant display
      final localRecents = await RecentNumbers.load(uid);
      final numbers = <_RecentContact>[];
      final seen = <String>{};

      for (final r in localRecents) {
        if (r.phone.length >= 11 && !seen.contains(r.phone)) {
          seen.add(r.phone);
          numbers.add(_RecentContact(
            phone: r.phone,
            networkIndex: r.networkIndex,
          ));
        }
      }

      if (mounted && numbers.isNotEmpty) {
        setState(() => _recentNumbers = numbers.take(3).toList());
      }

      // Also check Firestore transactions to merge
      final firestore = FirestoreService();
      final txs = await firestore.watchTransactions(uid, limit: 50).first;
      for (final tx in txs) {
        if ((tx.type == TransactionType.airtime || tx.type == TransactionType.data) &&
            tx.recipient != null && tx.recipient!.isNotEmpty &&
            tx.recipient!.length >= 11 &&
            !seen.contains(tx.recipient)) {
          seen.add(tx.recipient!);
          numbers.add(_RecentContact(
            phone: tx.recipient!,
            networkIndex: _networkIndexFromName(tx.networkProvider),
          ));
          await RecentNumbers.save(uid, tx.recipient!, _networkIndexFromName(tx.networkProvider));
        }
        if (numbers.length >= 3) break;
      }
      if (mounted) setState(() => _recentNumbers = numbers.take(3).toList());
    } catch (_) {}
  }

  int? _networkIndexFromName(String? name) {
    if (name == null) return null;
    final lower = name.toLowerCase();
    if (lower.contains('mtn')) return 0;
    if (lower.contains('airtel')) return 1;
    if (lower.contains('glo')) return 2;
    if (lower.contains('9mobile') || lower.contains('etisalat')) return 3;
    return null;
  }

  Future<void> _pickContact() async {
    try {
      if (!await FlutterContacts.requestPermission()) return;
      final contact = await FlutterContacts.openExternalPick();
      if (contact != null && contact.phones.isNotEmpty) {
        String num = contact.phones.first.number.replaceAll(RegExp(r'[^0-9]'), '');
        if (num.startsWith('234')) num = '0${num.substring(3)}';
        else if (!num.startsWith('0')) num = '0$num';
        _phoneController.text = num;
        _detectNetwork(num);
      }
    } catch (_) {}
  }

  void _scrollToField(double offset) {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          offset,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _amountController.dispose();
    _scrollController.dispose();
    _phoneFocusNode.dispose();
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
                          16, 24, 16,
                          120 + MediaQuery.viewInsetsOf(context).bottom,
                        ),
                        children: [
                          _buildNetworkSection(),
                          const SizedBox(height: 16),
                          _buildPhoneSection(),
                          const SizedBox(height: 16),
                          _buildAmountSection(),
                          const SizedBox(height: 16),
                          _buildPayFromSection(),
                        ],
                      ),
                      
                      Positioned(
                        left: 0, right: 0, bottom: 0,
                        child: Container(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.bottomCenter,
                              end: Alignment.topCenter,
                              colors: [
                                const Color(0xFF000000),
                                const Color(0xFF000000).withOpacity(0.8),
                                Colors.transparent,
                              ],
                            ),
                          ),
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: _isProcessing ? null : _processAirtime,
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
                                          Text(
                                            'Review Purchase',
                                            style: GoogleFonts.plusJakartaSans(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w900,
                                              color: Colors.white,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 16),
                                        ],
                                      ),
                              ),
                            ),
                          ),
                        ),
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
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: const Center(child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18)),
                ),
              ),
            ),
          ),
          Text('Buy Airtime', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildNetworkSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '1. Network (auto-detected)',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: List.generate(_networks.length, (index) {
            final n = _networks[index];
            final color = n['color'] as Color;
            final isActive = _selectedNetwork == index;
            return Expanded(
              child: Padding(
                padding: EdgeInsets.only(right: index < _networks.length - 1 ? 12 : 0),
                child: GestureDetector(
                  onTap: () => setState(() => _selectedNetwork = index),
                  child: Container(
                    decoration: BoxDecoration(
                      color: isActive ? const Color(0xFF2563EB).withOpacity(0.15) : Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: isActive ? const Color(0xFF2563EB).withOpacity(0.5) : Colors.white.withOpacity(0.08),
                      ),
                      boxShadow: isActive ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.2), blurRadius: 15, offset: const Offset(0, 4))] : [],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(18),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                        child: Padding(
                          padding: const EdgeInsets.all(12),
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Column(
                                children: [
                                  Container(
                                    width: 40, height: 40,
                                    decoration: BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: color.withOpacity(0.2),
                                      border: Border.all(color: color.withOpacity(0.3)),
                                      boxShadow: isActive ? [BoxShadow(color: color.withOpacity(0.2), blurRadius: 10)] : [],
                                    ),
                                    child: ClipOval(
                                      child: Image.asset(
                                        n['image'] as String,
                                        fit: BoxFit.cover,
                                        width: 40,
                                        height: 40,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    n['name'] as String,
                                    style: GoogleFonts.plusJakartaSans(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                              if (isActive)
                                Positioned(
                                  top: -4, right: -4,
                                  child: Container(
                                    width: 16, height: 16,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Color(0xFF3B82F6),
                                    ),
                                    child: const Center(child: Icon(Icons.check_rounded, size: 10, color: Colors.white)),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ],
    );
  }

  Widget _buildPhoneSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '2. Phone Number',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Row(
                children: [
                  const Text('\u{1F1F3}\u{1F1EC}', style: TextStyle(fontSize: 22)),
                  const SizedBox(width: 10),
                  Container(width: 1, height: 20, color: Colors.white.withOpacity(0.1)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextField(
                      controller: _phoneController,
                      focusNode: _phoneFocusNode,
                      keyboardType: TextInputType.phone,
                      onChanged: (v) => _detectNetwork(v),
                      style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 1.0),
                      decoration: InputDecoration(
                        hintText: '0801 234 5678',
                        hintStyle: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white30, letterSpacing: 1.0),
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: _pickContact,
                    child: Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(child: Icon(Icons.contacts_rounded, color: Color(0xFF60A5FA), size: 18)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        if (_recentNumbers.isNotEmpty)
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                Container(
                  width: 24, height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withOpacity(0.05),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: const Center(child: Icon(Icons.history_rounded, size: 10, color: Color(0xFF9CA3AF))),
                ),
                ..._recentNumbers.map((rc) => Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: _quickPhoneChip(rc),
                )),
              ],
            ),
          ),
      ],
    );
  }

  Widget _quickPhoneChip(_RecentContact rc) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        setState(() {
          _phoneController.text = rc.phone;
          if (rc.networkIndex != null) {
            _selectedNetwork = rc.networkIndex!;
          } else {
            _detectNetwork(rc.phone);
          }
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Text(rc.phone, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFFD1D5DB))),
      ),
    );
  }

  Widget _buildAmountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '3. Enter Amount',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            Text(
              'Bal: \u20A6${NumberFormat('#,##0').format(context.watch<WalletProvider>().nairaBalance)}',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF9CA3AF),
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.black.withOpacity(0.6),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF10B981).withOpacity(0.2),
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                    ),
                    child: Center(
                      child: Text('₦', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('NGN', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
                      Text('Min: ₦100', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextField(
                      controller: _amountController,
                      focusNode: _amountFocusNode,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.right,
                      style: GoogleFonts.robotoMono(fontSize: 32, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: -1),
                      decoration: InputDecoration(
                        hintText: '0.00',
                        hintStyle: GoogleFonts.robotoMono(fontSize: 32, fontWeight: FontWeight.w700, color: Colors.white30, letterSpacing: -1),
                        border: InputBorder.none,
                        isDense: true,
                        contentPadding: EdgeInsets.zero,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _quickAmountChip('100')),
            const SizedBox(width: 10),
            Expanded(child: _quickAmountChip('500')),
            const SizedBox(width: 10),
            Expanded(child: _quickAmountChip('1000')),
            const SizedBox(width: 10),
            Expanded(child: _quickAmountChip('2000')),
          ],
        ),
      ],
    );
  }

  Widget _quickAmountChip(String amount) {
    final isSelected = _amountController.text == amount;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        setState(() {
          _amountController.text = amount;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.1)),
        ),
        child: Center(
          child: Text('₦$amount', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: isSelected ? Colors.white : const Color(0xFFD1D5DB))),
        ),
      ),
    );
  }

  Widget _buildPayFromSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Pay From',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 6),
        // Wallet option
        GestureDetector(
          onTap: () => setState(() => _paymentMethod = 0),
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            margin: const EdgeInsets.only(bottom: 8),
            decoration: BoxDecoration(
              color: _paymentMethod == 0
                  ? const Color(0xFF3B82F6).withOpacity(0.1)
                  : Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _paymentMethod == 0
                    ? const Color(0xFF3B82F6).withOpacity(0.5)
                    : Colors.white.withOpacity(0.08),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Row(
                  children: [
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF3B82F6).withOpacity(0.2),
                        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
                      ),
                      child: const Center(child: Icon(Icons.account_balance_wallet_rounded, size: 16, color: Color(0xFF60A5FA))),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Fiat Wallet', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text('Bal: \u20A6${NumberFormat('#,##0').format(context.watch<WalletProvider>().nairaBalance)}', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                        ],
                      ),
                    ),
                    Container(
                      width: 24, height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _paymentMethod == 0 ? const Color(0xFF3B82F6) : Colors.white.withOpacity(0.05),
                        border: Border.all(color: _paymentMethod == 0 ? Colors.transparent : Colors.white.withOpacity(0.2)),
                      ),
                      child: _paymentMethod == 0
                          ? const Center(child: Icon(Icons.check_rounded, size: 12, color: Colors.white))
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        // Card (Squad) option
        GestureDetector(
          onTap: () => setState(() => _paymentMethod = 1),
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            decoration: BoxDecoration(
              color: _paymentMethod == 1
                  ? const Color(0xFF10B981).withOpacity(0.1)
                  : Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _paymentMethod == 1
                    ? const Color(0xFF10B981).withOpacity(0.5)
                    : Colors.white.withOpacity(0.08),
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Row(
                  children: [
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF10B981).withOpacity(0.2),
                        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                      ),
                      child: const Center(child: Icon(Icons.credit_card_rounded, size: 16, color: Color(0xFF34D399))),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Card / Bank Transfer', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                          const SizedBox(height: 2),
                          Text('Pay via card or bank transfer', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                        ],
                      ),
                    ),
                    Container(
                      width: 24, height: 24,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _paymentMethod == 1 ? const Color(0xFF10B981) : Colors.white.withOpacity(0.05),
                        border: Border.all(color: _paymentMethod == 1 ? Colors.transparent : Colors.white.withOpacity(0.2)),
                      ),
                      child: _paymentMethod == 1
                          ? const Center(child: Icon(Icons.check_rounded, size: 12, color: Colors.white))
                          : null,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _RecentContact {
  final String phone;
  final int? networkIndex;
  _RecentContact({required this.phone, this.networkIndex});
}

import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/firestore_service.dart';
import '../services/squad_service.dart';
import '../services/vtu_provider_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/squad_checkout_sheet.dart';
import '../widgets/transaction_result_modal.dart';
import 'package:flutter_contacts/flutter_contacts.dart';

class BuyDataScreen extends StatefulWidget {
  const BuyDataScreen({super.key});

  @override
  State<BuyDataScreen> createState() => _BuyDataScreenState();
}

class _BuyDataScreenState extends State<BuyDataScreen> {
  int _selectedNetwork = 0; // 0: MTN, 1: Airtel, 2: Glo, 3: 9Mobile
  final TextEditingController _phoneController = TextEditingController();
  bool _isProcessing = false;
  int _paymentMethod = 0; // 0: Wallet, 1: Card (Squad)
  List<_RecentContact> _recentNumbers = [];
  String _planFilter = 'All Plans';

  Map<String, dynamic>? _selectedPlan;
  List<VtuDataPlan> _fetchedPlans = [];
  bool _isLoadingPlans = false;
  String? _plansError;

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
      _fetchPlans();
    }
  }

  @override
  void initState() {
    super.initState();
    _isLoadingPlans = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchPlans();
    });
    _loadRecentNumbers();
  }

  Future<void> _loadRecentNumbers() async {
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final firestore = FirestoreService();
      final txs = await firestore.watchTransactions(uid, limit: 50).first;
      final numbers = <_RecentContact>[];
      final seen = <String>{};
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
        }
        if (numbers.length >= 3) break;
      }
      if (mounted) setState(() => _recentNumbers = numbers);
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

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  double get _amount => _selectedPlan?['price'] ?? 0;

  StateSetter? _modalSetState;
  int _fetchId = 0;

  Future<void> _fetchPlans() async {
    final currentFetchId = ++_fetchId;

    void updateState(VoidCallback fn) {
      setState(fn);
      _modalSetState?.call(fn);
    }

    updateState(() {
      _plansError = null;
      _selectedPlan = null;
      _planFilter = 'All Plans';
      _fetchedPlans = [];
    });

    try {
      final plans = await VtuProviderService.getDataPlans(_selectedNetwork);
      // Guard against race condition: only apply if this is still the latest fetch
      if (mounted && currentFetchId == _fetchId) {
        if (plans.isEmpty) {
          // Retry once after a short delay if plans came back empty
          await Future.delayed(const Duration(seconds: 2));
          if (mounted && currentFetchId == _fetchId) {
            final retryPlans = await VtuProviderService.getDataPlans(_selectedNetwork);
            if (mounted && currentFetchId == _fetchId) {
              updateState(() {
                _fetchedPlans = retryPlans;
                _isLoadingPlans = false;
                if (retryPlans.isEmpty) {
                  _plansError = 'No plans available. Try switching networks and back.';
                }
              });
            }
          }
        } else {
          updateState(() {
            _fetchedPlans = plans;
            _isLoadingPlans = false;
          });
        }
      }
    } catch (e) {
      if (mounted && currentFetchId == _fetchId) {
        updateState(() {
          _plansError = 'Failed to load plans: $e';
          _isLoadingPlans = false;
        });
      }
    }
  }

  List<VtuDataPlan> get _currentPlans {
    if (_planFilter == 'All Plans') return _fetchedPlans;
    final filter = _planFilter.toLowerCase();
    return _fetchedPlans.where((p) {
      final name = p.name.toLowerCase();
      final days = (p.days ?? '').toLowerCase();
      if (filter == 'daily') return name.contains('daily') || name.contains('1 day') || days.contains('1day') || days.contains('2day') || days.contains('1days');
      if (filter == 'weekly') return name.contains('week') || days.contains('7day') || days.contains('7days');
      if (filter == 'monthly') return name.contains('month') || days.contains('30day') || days.contains('30days');
      return true;
    }).toList();
  }

  Future<void> _processData() async {
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
    if (_selectedPlan == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Select a data plan', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
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

    setState(() => _isProcessing = true);
    final messenger = ScaffoldMessenger.of(context);

    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final user = context.read<AuthProvider>().userModel;
      final network = _networks[_selectedNetwork]['name'] as String;
      final planId = _selectedPlan!['id'] as int;
      final planName = _selectedPlan!['name'] as String;
      final reference = 'smclientkx-data-${DateTime.now().millisecondsSinceEpoch}';
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
          type: TransactionType.data,
          status: TransactionStatus.pending,
          amountNaira: _amount,
          description: 'Data purchase - $network - $planName',
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

        // Verify transaction via Squad API
        final verification = await SquadService.verifyTransaction(reference: reference);
        if (!verification.success || verification.status.toLowerCase() != 'success') {
          await firestore.updateTransactionStatus(txId, TransactionStatus.failed);
          if (mounted) {
            messenger.showSnackBar(
              SnackBar(content: Text('Payment verification failed: ${verification.errorMessage ?? verification.status}', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
            );
          }
          return;
        }

        // Payment verified — proceed to deliver data via active provider
        final result = await VtuProviderService.purchaseData(
          networkIndex: _selectedNetwork,
          planId: planId,
          phone: phone,
          customerReference: reference,
        );

        await firestore.updateTransactionStatus(
          txId,
          result.success ? TransactionStatus.completed : TransactionStatus.failed,
        );

        // If delivery failed after successful payment, refund to wallet
        if (!result.success) {
          final wallet = await firestore.getWallet(uid);
          await firestore.updateWallet(wallet.copyWith(
            nairaBalance: wallet.nairaBalance + _amount,
            totalValueNaira: wallet.totalValueNaira + _amount,
            updatedAt: DateTime.now(),
          ));
        }

        if (mounted) {
          await showTransactionResultModal(
            context: context,
            success: result.success,
            title: result.success ? 'Data Purchased!' : 'Purchase Failed',
            subtitle: result.success
                ? '$planName delivered to $phone'
                : '\u20A6${NumberFormat('#,##0').format(_amount)} refunded to wallet',
            amount: _amount,
            recipient: phone,
            network: network,
            reference: reference,
            paymentMethod: 'card',
            errorMessage: result.success ? null : result.message,
          );
          if (mounted && result.success) {
            _phoneController.clear();
            setState(() {
              _selectedNetwork = 0;
              _selectedPlan = null;
            });
            _fetchPlans();
          }
        }
      } else {
        // Wallet payment — debit wallet first, then purchase
        final wallet = await firestore.getWallet(uid);
        if (wallet.nairaBalance < _amount) {
          if (mounted) {
            messenger.showSnackBar(
              SnackBar(content: Text('Insufficient wallet balance', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
            );
          }
          return;
        }

        // Debit wallet
        await firestore.updateWallet(wallet.copyWith(
          nairaBalance: wallet.nairaBalance - _amount,
          totalValueNaira: wallet.totalValueNaira - _amount,
          updatedAt: DateTime.now(),
        ));

        final result = await VtuProviderService.purchaseData(
          networkIndex: _selectedNetwork,
          planId: planId,
          phone: phone,
          customerReference: reference,
        );

        final tx = TransactionModel(
          id: '',
          uid: uid,
          type: TransactionType.data,
          status: result.success ? TransactionStatus.completed : TransactionStatus.failed,
          amountNaira: _amount,
          description: 'Data purchase - $network - $planName',
          reference: reference,
          createdAt: DateTime.now(),
          paymentMethod: 'wallet',
          recipient: phone,
        );

        await firestore.createTransaction(tx);

        // If delivery failed, refund to wallet
        if (!result.success) {
          final updatedWallet = await firestore.getWallet(uid);
          await firestore.updateWallet(updatedWallet.copyWith(
            nairaBalance: updatedWallet.nairaBalance + _amount,
            totalValueNaira: updatedWallet.totalValueNaira + _amount,
            updatedAt: DateTime.now(),
          ));
        }

        if (mounted) {
          await showTransactionResultModal(
            context: context,
            success: result.success,
            title: result.success ? 'Data Purchased!' : 'Purchase Failed',
            subtitle: result.success
                ? '$planName delivered to $phone'
                : '\u20A6${NumberFormat('#,##0').format(_amount)} refunded to wallet',
            amount: _amount,
            recipient: phone,
            network: network,
            reference: reference,
            paymentMethod: 'wallet',
            errorMessage: result.success ? null : result.message,
          );
          if (mounted && result.success) {
            _phoneController.clear();
            setState(() {
              _selectedNetwork = 0;
              _selectedPlan = null;
            });
            _fetchPlans();
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
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 120),
                        children: [
                          _buildNetworkSection(),
                          const SizedBox(height: 16),
                          _buildPhoneSection(),
                          const SizedBox(height: 16),
                          _buildPlanSection(),
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
                            onTap: _isProcessing ? null : _processData,
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
          Text('Buy Data', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
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
                  onTap: () {
                  setState(() => _selectedNetwork = index);
                  _fetchPlans();
                },
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
        _phoneController.text = rc.phone;
        if (rc.networkIndex != null) {
          setState(() => _selectedNetwork = rc.networkIndex!);
          _fetchPlans();
        } else {
          _detectNetwork(rc.phone);
        }
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

  Widget _buildPlanSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '3. Select Plan',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 14,
            fontWeight: FontWeight.w800,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 6),
        GestureDetector(
          onTap: () => _showPlanBottomSheet(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.6),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: _selectedPlan != null ? const Color(0xFF3B82F6).withOpacity(0.5) : Colors.white.withOpacity(0.1),
              ),
              boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10, offset: Offset(0, 4))],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: Row(
                  children: [
                    Container(
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF3B82F6).withOpacity(0.2),
                        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
                      ),
                      child: const Center(child: Icon(Icons.wifi_rounded, size: 16, color: Color(0xFF60A5FA))),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Data Bundle', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                          const SizedBox(height: 2),
                          Text(
                            _selectedPlan != null ? _selectedPlan!['name'] as String : 'Choose a plan...',
                            style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, height: 1.2),
                          ),
                          if (_selectedPlan != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              '\u20A6${NumberFormat('#,##0').format(_selectedPlan!['price'] as double)}',
                              style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF60A5FA)),
                            ),
                          ],
                        ],
                      ),
                    ),
                    if (_selectedPlan != null) ...[
                      Text(
                        '\u20A6${NumberFormat('#,##0').format(_selectedPlan!['price'] as double)}',
                        style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF34D399)),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.05),
                      ),
                      child: const Center(child: Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF9CA3AF), size: 18)),
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

  void _showPlanBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            _modalSetState = setModalState;
            return _buildPlanSheetContent(setModalState);
          },
        );
      },
    ).then((_) => _modalSetState = null);
  }

  Widget _buildPlanSheetContent(StateSetter setModalState) {
    final activeColor = _networks[_selectedNetwork]['color'] as Color;
    final plans = _currentPlans;
    final filters = ['All Plans', 'Daily', 'Weekly', 'Monthly'];

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: MediaQuery.of(context).size.height * 0.75,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1423).withOpacity(0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(width: 48, height: 6, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(3))),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32, height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: activeColor.withOpacity(0.2),
                            border: Border.all(color: activeColor.withOpacity(0.3)),
                          ),
                          child: ClipOval(
                            child: Image.asset(
                              _networks[_selectedNetwork]['image'] as String,
                              fit: BoxFit.cover,
                              width: 32,
                              height: 32,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Select Plan',
                          style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5),
                        ),
                      ],
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle),
                        child: const Icon(Icons.close_rounded, color: Color(0xFF9CA3AF), size: 16),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: filters.map((f) {
                    final isActive = _planFilter == f;
                    return Padding(
                      padding: EdgeInsets.only(right: f != filters.last ? 8 : 0),
                      child: GestureDetector(
                        onTap: () => setModalState(() => _planFilter = f),
                        child: _filterTab(f, isActive),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: _isLoadingPlans
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                    : _plansError != null
                        ? Center(
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Text(_plansError!, style: GoogleFonts.plusJakartaSans(fontSize: 14, color: const Color(0xFF9CA3AF)), textAlign: TextAlign.center),
                            ),
                          )
                        : _currentPlans.isEmpty
                            ? Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(20),
                                  child: Text('No plans available', style: GoogleFonts.plusJakartaSans(fontSize: 14, color: const Color(0xFF9CA3AF))),
                                ),
                              )
                            : ListView(
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                                children: [
                                  ...plans.map((p) => Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: _planItem(p, setModalState),
                                  )),
                                  const SizedBox(height: 24),
                                ],
                              ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _filterTab(String label, bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isActive ? Colors.transparent : Colors.white.withOpacity(0.1)),
        boxShadow: isActive ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))] : [],
      ),
      child: Text(
        label,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 13,
          fontWeight: isActive ? FontWeight.w800 : FontWeight.w700,
          color: isActive ? Colors.white : const Color(0xFF9CA3AF),
        ),
      ),
    );
  }

  Widget _planItem(VtuDataPlan plan, StateSetter setModalState) {
    final isSelected = _selectedPlan?['id'] == plan.id;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedPlan = {
            'id': plan.id,
            'name': plan.name,
            'price': plan.price,
          };
        });
        Navigator.pop(context);
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB).withOpacity(0.1) : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: isSelected ? const Color(0xFF2563EB).withOpacity(0.5) : Colors.white.withOpacity(0.08)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(plan.name, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
                ],
              ),
            ),
            Row(
              children: [
                Text('\u20A6${NumberFormat('#,##0').format(plan.price)}', style: GoogleFonts.robotoMono(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                const SizedBox(width: 12),
                Container(
                  width: 24, height: 24,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: isSelected ? const Color(0xFF2563EB) : Colors.transparent,
                    border: Border.all(color: isSelected ? Colors.transparent : Colors.white.withOpacity(0.2)),
                  ),
                  child: isSelected ? const Center(child: Icon(Icons.check_rounded, size: 12, color: Colors.white)) : null,
                ),
              ],
            ),
          ],
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

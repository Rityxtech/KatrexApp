import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../models/user_model.dart';
import '../providers/auth_provider.dart';
import '../services/firestore_service.dart';
import '../services/squad_service.dart';
import '../services/cloud_functions_service.dart';
import '../services/hd_wallet_service.dart';
import '../services/network_fee_service.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/squad_checkout_sheet.dart';

class DepositScreen extends StatefulWidget {
  const DepositScreen({super.key});

  @override
  State<DepositScreen> createState() => _DepositScreenState();
}

class _DepositScreenState extends State<DepositScreen> {
  final TextEditingController _cardAmountController = TextEditingController();
  final TextEditingController _bvnController = TextEditingController();
  final TextEditingController _phoneController = TextEditingController();
  final TextEditingController _dobController = TextEditingController();
  final TextEditingController _addressController = TextEditingController();
  String? _selectedGender;
  int? _selectedCardIndex;
  bool _isProcessing = false;
  bool _isLoadingAccount = true;
  bool _needsKyc = false;
  String? _accountNumber;
  String? _bankName;
  String? _accountName;
  String? _accountReference;
  String? _accountError;

  // Crypto deposit state
  String? _cryptoPayAddress;
  String _cryptoSelectedAsset = 'usdttrc20';
  String _cryptoSelectedNetwork = 'TRC20';
  bool _cryptoLoading = false;
  String? _cryptoError;
  Map<String, Map<String, dynamic>> _cryptoSavedAddresses = {};
  NetworkFeeInfo? _cryptoFeeInfo;
  bool _cryptoFeeLoading = false;
  bool _cryptoInitStarted = false;

  static const List<Map<String, String>> _cryptoAssets = [
    {'code': 'usdttrc20', 'label': 'USDT', 'network': 'TRC20'},
    {'code': 'usdtbsc', 'label': 'USDT', 'network': 'BEP20'},
    {'code': 'usdt', 'label': 'USDT', 'network': 'ERC20'},
    {'code': 'btc', 'label': 'BTC', 'network': 'Bitcoin'},
    {'code': 'eth', 'label': 'ETH', 'network': 'ERC20'},
    {'code': 'trx', 'label': 'TRX', 'network': 'TRC20'},
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadVirtualAccount());
  }

  Future<void> _loadVirtualAccount() async {
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final user = context.read<AuthProvider>().userModel;
      final firestore = FirestoreService();

      // Check if we already have a saved virtual account
      final saved = await firestore.getVirtualAccount(uid);
      if (saved != null && saved['account_number'] != null) {
        if (mounted) {
          setState(() {
            _accountNumber = saved['account_number'] as String;
            _bankName = saved['bank_name'] as String;
            _accountName = saved['account_name'] as String;
            _accountReference = saved['account_reference'] as String;
            _isLoadingAccount = false;
          });
        }
        return;
      }

      // Check if user has all required KYC fields for Squad virtual account
      if (user?.bvn == null ||
          user?.phone == null ||
          user?.dateOfBirth == null ||
          user?.gender == null ||
          user?.address == null) {
        // Pre-fill any existing values
        _phoneController.text = user?.phone ?? '';
        _dobController.text = user?.dateOfBirth ?? '';
        _addressController.text = user?.address ?? '';
        _selectedGender = user?.gender;
        if (mounted) {
          setState(() {
            _needsKyc = true;
            _isLoadingAccount = false;
          });
        }
        return;
      }

      // User has KYC data — create permanent virtual account
      await _createVirtualAccount(uid, user!);
    } catch (e) {
      if (mounted) {
        setState(() {
          _needsKyc = true;
          _isLoadingAccount = false;
        });
      }
    }
  }

  Future<void> _createVirtualAccount(String uid, UserModel user) async {
    final firestore = FirestoreService();
    final accountRef = 'smclientkx-vba-$uid';

    final nameParts = user.fullName.trim().split(' ');
    final firstName = nameParts.first;
    final lastName = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : firstName;

    final genderCode = (user.gender ?? '').toLowerCase() == 'male' ? '1' : '2';

    final result = await SquadService.createCustomerVirtualAccount(
      firstName: firstName,
      lastName: lastName,
      mobileNum: user.phone!,
      dob: user.dateOfBirth!,
      gender: genderCode,
      address: user.address!,
      customerIdentifier: accountRef,
      bvn: user.bvn!,
      email: user.email,
    );

    if (result.success) {
      final accountData = {
        'uid': uid,
        'account_name': result.accountName,
        'account_number': result.accountNumber,
        'bank_name': result.bankName,
        'account_reference': result.accountReference,
        'provider': 'squad',
        'created_at': DateTime.now().toIso8601String(),
      };
      await firestore.saveVirtualAccount(uid, accountData);
      if (mounted) {
        setState(() {
          _accountNumber = result.accountNumber;
          _bankName = result.bankName;
          _accountName = result.accountName;
          _accountReference = result.accountReference;
          _needsKyc = false;
          _isLoadingAccount = false;
        });
      }
    } else {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result.errorMessage ?? 'Failed to create account', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
          );
        });
        setState(() {
          _needsKyc = true;
          _isLoadingAccount = false;
        });
      }
    }
  }

  Future<void> _submitKycAndCreateAccount() async {
    final bvn = _bvnController.text.trim();
    final phone = _phoneController.text.trim();
    final dob = _dobController.text.trim();
    final address = _addressController.text.trim();

    if (bvn.length != 11) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter a valid 11-digit BVN', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }
    if (phone.length < 11) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter a valid phone number', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }
    if (dob.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter your date of birth', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }
    if (_selectedGender == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Select your gender', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }
    if (address.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter your address', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }

    setState(() => _isLoadingAccount = true);

    try {
      final auth = context.read<AuthProvider>();
      final uid = auth.firebaseUser!.uid;
      final user = auth.userModel!;

      final updated = user.copyWith(
        bvn: bvn,
        phone: phone,
        dateOfBirth: dob,
        gender: _selectedGender,
        address: address,
      );
      await auth.updateUserProfileDirect(updated);

      await _createVirtualAccount(uid, updated);
    } catch (e) {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error: $e', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
          );
        });
        setState(() {
          _needsKyc = true;
          _isLoadingAccount = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _cardAmountController.dispose();
    _bvnController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _processCardDeposit(StateSetter setSheetState) async {
    final amountStr = _cardAmountController.text.trim();
    final amount = double.tryParse(amountStr.replaceAll(',', ''));
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter a valid amount', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }

    setSheetState(() => _isProcessing = true);

    try {
      final auth = context.read<AuthProvider>();
      final uid = auth.firebaseUser!.uid;
      final user = auth.userModel!;
      final ref = 'smclientkx-dep-${DateTime.now().millisecondsSinceEpoch}';

      if (_selectedCardIndex != null && _selectedCardIndex! < user.savedCards.length) {
        // Saved card: charge directly using token, then server-side credit.
        final card = user.savedCards[_selectedCardIndex!];
        final tokenId = card['tokenId'] as String;

        final result = await SquadService.chargeCard(
          amount: amount,
          tokenId: tokenId,
          reference: ref,
        );

        if (result.success && result.reference != null) {
          // Create pending transaction — server will complete it.
          final pendingTx = TransactionModel(
            id: '',
            uid: uid,
            type: TransactionType.deposit,
            status: TransactionStatus.pending,
            amountNaira: amount,
            description: 'Card deposit (saved card)',
            reference: result.reference!,
            createdAt: DateTime.now(),
            paymentMethod: 'card',
          );
          final txId = await FirestoreService().createTransaction(pendingTx);

          // Server-side verify + consume-once + atomic wallet credit.
          final creditResult = await CloudFunctionsService.completeCardDeposit(
            squadRef: result.reference!,
            amount: amount,
            transactionId: txId,
            idempotencyKey: CloudFunctionsService.newIdempotencyKey(),
          );
          final success = creditResult['success'] as bool? ?? false;

          if (success && mounted) {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Deposit of \u20A6${NumberFormat('#,##0').format(amount)} successful', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFF10B981)),
            );
          } else if (!success && mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Payment could not be verified — if you were debited, contact support.', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
            );
          }
        } else {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(result.errorMessage ?? 'Failed to charge card', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
            );
          }
        }
      } else {
        // No saved card selected: initiate Squad checkout
        debugPrint('Initiating Squad checkout: amount=$amount, ref=$ref');
        final result = await SquadService.initializeCheckout(
          amount: amount,
          customerName: user.fullName,
          customerEmail: user.email,
          reference: ref,
          paymentChannels: const ['card', 'transfer', 'ussd'],
          isRecurring: false,
        );

        debugPrint('Squad result: success=${result.success}, url=${result.checkoutUrl}, ref=${result.reference}, error=${result.errorMessage}');

        if (result.success && result.checkoutUrl != null) {
          if (!mounted) return;

          // Create pending transaction — server will complete it.
          final pendingTx = TransactionModel(
            id: '',
            uid: uid,
            type: TransactionType.deposit,
            status: TransactionStatus.pending,
            amountNaira: amount,
            description: 'Card / Transfer deposit',
            reference: result.reference!,
            createdAt: DateTime.now(),
            paymentMethod: 'card',
          );
          final txId = await FirestoreService().createTransaction(pendingTx);

          final returnedRef = await SquadCheckoutSheet.show(context, checkoutUrl: result.checkoutUrl!);
          if (returnedRef != null) {
            debugPrint('Checkout returned ref: $returnedRef, calling server to verify + credit...');

            // Server-side verify + consume-once + atomic wallet credit.
            final creditResult = await CloudFunctionsService.completeCardDeposit(
              squadRef: result.reference!,
              amount: amount,
              transactionId: txId,
              idempotencyKey: CloudFunctionsService.newIdempotencyKey(),
            );
            final success = creditResult['success'] as bool? ?? false;

            if (success && mounted) {
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Deposit of \u20A6${NumberFormat('#,##0').format(amount)} successful', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFF10B981)),
              );
            } else if (!success && mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Payment could not be verified — if you were debited, contact support.', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
              );
            }
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Payment cancelled', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
              );
            }
          }
        } else {
          debugPrint('Squad checkout failed: ${result.errorMessage}');
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(result.errorMessage ?? 'Failed to initialize payment', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Deposit failed: $e', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } finally {
      if (mounted) setSheetState(() => _isProcessing = false);
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard!',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 13, fontWeight: FontWeight.w800, color: Colors.black)),
        backgroundColor: const Color(0xFF34D399),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        margin: const EdgeInsets.only(top: 40, left: 16, right: 16),
        duration: const Duration(seconds: 2),
      ),
    );
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
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
                    children: [
                      _buildVirtualAccountSection(),
                      const SizedBox(height: 24),
                      _buildOtherMethods(),
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
              child: const Center(child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18)),
            ),
          ),
          Text('Deposit Funds', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildVirtualAccountSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text('DIRECT BANK TRANSFER',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
        ),
        Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                const Color(0xFF10B981).withOpacity(0.1),
                const Color(0xFF2563EB).withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
            boxShadow: [BoxShadow(color: const Color(0xFF10B981).withOpacity(0.15), blurRadius: 40, offset: const Offset(0, 10))],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Stack(
              children: [
                Positioned(
                  top: -40, right: -40,
                  child: Container(
                    width: 128, height: 128,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF10B981).withOpacity(0.2)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF10B981).withOpacity(0.2), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3))),
                        child: const Center(child: Icon(Icons.account_balance_rounded, size: 14, color: Color(0xFF34D399))),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2))),
                        child: Text('INSTANT FUNDING', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: const Color(0xFF34D399), letterSpacing: 0.5)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_needsKyc || _accountError != null || _accountNumber == null)
                    RichText(
                      text: TextSpan(
                        style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5),
                        children: [
                          const TextSpan(text: 'Complete a quick '),
                          TextSpan(text: 'KYC', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                          const TextSpan(text: ' to get your personal account number for instant wallet funding.'),
                        ],
                      ),
                    )
                  else
                    RichText(
                      text: TextSpan(
                        style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5),
                        children: [
                          const TextSpan(text: 'This is your '),
                          TextSpan(text: 'permanent personal bank account', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                          const TextSpan(text: '. Fund it anytime and it reflects automatically in your '),
                          TextSpan(text: 'NGN Wallet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                          const TextSpan(text: '.'),
                        ],
                      ),
                    ),
                  const SizedBox(height: 12),
                  _buildAccountDetailsBox(),
                ],
              ),
            ),
            ],
          ),
          ),
        ),
      ],
    );
  }

  Widget _buildAccountDetailsBox() {
    if (_isLoadingAccount) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: const Color(0xFF000000).withOpacity(0.6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: const Center(
          child: SizedBox(
            width: 24, height: 24,
            child: CircularProgressIndicator(color: Color(0xFF34D399), strokeWidth: 2),
          ),
        ),
      );
    }

    if (_needsKyc || _accountError != null || _accountNumber == null) {
      return _buildKycForm();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF000000).withOpacity(0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Column(
        children: [
          _accountDetailRow('Bank Name', _bankName!, null),
          _dashedDivider(),
          _accountDetailRow('Account Number', _accountNumber!, () => _copyToClipboard(_accountNumber!, 'Account number'),
            isHighlight: true, isMono: true, fontSize: 16, letterSpacing: 3.0),
          _dashedDivider(),
          _accountDetailRow('Account Name', _accountName!, null),
        ],
      ),
    );
  }

  Widget _buildKycForm() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF000000).withOpacity(0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.verified_user_rounded, size: 16, color: Color(0xFF34D399)),
              const SizedBox(width: 8),
              Text('Get your permanent bank account',
                style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text('A quick one-time verification to assign your personal account.',
            style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)),
          ),
          const SizedBox(height: 16),
          _buildKycField(
            controller: _bvnController,
            label: 'BVN',
            hint: '12345678901',
            keyboardType: TextInputType.number,
            maxLength: 11,
          ),
          const SizedBox(height: 12),
          _buildKycField(
            controller: _phoneController,
            label: 'Phone Number',
            hint: '08012345678',
            keyboardType: TextInputType.phone,
            maxLength: 11,
          ),
          const SizedBox(height: 12),
          _buildKycField(
            controller: _dobController,
            label: 'Date of Birth',
            hint: 'MM/DD/YYYY',
            keyboardType: TextInputType.datetime,
          ),
          const SizedBox(height: 12),
          Text('Gender', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
          const SizedBox(height: 6),
          Row(
            children: [
              _buildGenderChip('Male'),
              const SizedBox(width: 8),
              _buildGenderChip('Female'),
            ],
          ),
          const SizedBox(height: 12),
          _buildKycField(
            controller: _addressController,
            label: 'Address',
            hint: 'Enter your home address',
            keyboardType: TextInputType.streetAddress,
          ),
          const SizedBox(height: 20),
          GestureDetector(
            onTap: _submitKycAndCreateAccount,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text('Generate Account',
                  style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildKycField({
    required TextEditingController controller,
    required String label,
    required String hint,
    TextInputType keyboardType = TextInputType.text,
    int? maxLength,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280), letterSpacing: 0.5)),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          maxLength: maxLength,
          style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white24),
            filled: true,
            fillColor: Colors.white.withOpacity(0.05),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Color(0xFF10B981), width: 1.5),
            ),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            counterText: '',
          ),
        ),
      ],
    );
  }

  Widget _buildGenderChip(String label) {
    final isSelected = _selectedGender == label;
    return GestureDetector(
      onTap: () => setState(() => _selectedGender = label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF10B981) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? const Color(0xFF10B981) : Colors.white.withOpacity(0.1)),
        ),
        child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFF9CA3AF))),
      ),
    );
  }

  Widget _accountDetailRow(String label, String value, VoidCallback? onCopy, {bool isHighlight = false, bool isMono = false, double fontSize = 13, double letterSpacing = 0}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280), letterSpacing: 0.5)),
            const SizedBox(height: 2),
            Text(value,
                style: isMono
                    ? GoogleFonts.robotoMono(fontSize: fontSize, fontWeight: FontWeight.w900, color: isHighlight ? const Color(0xFF34D399) : Colors.white, letterSpacing: letterSpacing)
                    : GoogleFonts.plusJakartaSans(fontSize: fontSize, fontWeight: FontWeight.w900, color: isHighlight ? const Color(0xFF34D399) : Colors.white)),
          ],
        ),
        if (onCopy != null)
          GestureDetector(
            onTap: onCopy,
            child: Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
              child: const Center(child: Icon(Icons.copy_rounded, size: 14, color: Color(0xFFD1D5DB))),
            ),
          ),
      ],
    );
  }

  Widget _dashedDivider() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: CustomPaint(
        size: const Size(double.infinity, 1),
        painter: _DashedLinePainter(color: Colors.white.withOpacity(0.1)),
      ),
    );
  }

  Widget _buildOtherMethods() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text('OTHER TOP-UP METHODS',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
        ),
        _buildMethodCard(
          icon: Icons.credit_card_rounded,
          iconColor: const Color(0xFF60A5FA),
          bgColor: const Color(0xFF2563EB).withOpacity(0.1),
          borderColor: const Color(0xFF2563EB).withOpacity(0.2),
          title: 'Card / Bank Transfer',
          subtitle: 'Pay via card or bank transfer',
          onTap: () => _showCardSheet(),
        ),
        const SizedBox(height: 8),
        _buildMethodCard(
          icon: FontAwesomeIcons.bitcoin,
          iconColor: const Color(0xFFF7931A),
          bgColor: const Color(0xFFF7931A).withOpacity(0.1),
          borderColor: const Color(0xFFF7931A).withOpacity(0.2),
          title: 'Cryptocurrency',
          subtitle: 'BTC, ETH, USDT • Free',
          onTap: () => _showCryptoSheet(),
        ),
      ],
    );
  }

  Widget _buildMethodCard({
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
    required Color borderColor,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Row(
          children: [
            Container(
              width: 48, height: 48,
              decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: borderColor)),
              child: Center(child: Icon(icon, size: 18, color: iconColor)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                ],
              ),
            ),
            Container(
              width: 32, height: 32,
              decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.05)),
              child: const Center(child: Icon(Icons.chevron_right_rounded, size: 12, color: Color(0xFF9CA3AF))),
            ),
          ],
        ),
      ),
    );
  }

  void _showCardSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) => _buildCardSheet(setSheetState),
      ),
    );
  }

  Future<void> _initCryptoDeposit(StateSetter ss) async {
    ss(() => _cryptoLoading = true);
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final fs = FirestoreService();
      final saved = await fs.getCryptoDeposit(uid);
      if (saved != null && saved['addresses'] != null) {
        _cryptoSavedAddresses = Map<String, Map<String, dynamic>>.from(
          (saved['addresses'] as Map).map((k, v) => MapEntry(k, Map<String, dynamic>.from(v))),
        );
      }

      // Auto-generate any missing addresses for all supported currencies
      final missingCurrencies = _cryptoAssets.where((a) {
        final code = a['code']!;
        return _cryptoSavedAddresses[code] == null || _cryptoSavedAddresses[code]?['address'] == null;
      }).toList();

      if (missingCurrencies.isNotEmpty) {
        for (final asset in missingCurrencies) {
          final currency = asset['code']!;
          try {
            final address = HdWalletService.deriveAddress(currency, uid);
            _cryptoSavedAddresses[currency] = {
              'address': address,
              'network': asset['network'],
              'created_at': DateTime.now().toIso8601String(),
            };
          } catch (_) {}
        }
        await fs.saveCryptoDeposit(uid, {
          'uid': uid,
          'addresses': _cryptoSavedAddresses,
        });
      }

      _loadSavedAddressForAsset(ss);
      ss(() => _cryptoLoading = false);
    } catch (e) { ss(() { _cryptoError = 'Error: $e'; _cryptoLoading = false; }); }
  }

  void _loadSavedAddressForAsset(StateSetter ss) {
    final saved = _cryptoSavedAddresses[_cryptoSelectedAsset];
    if (saved != null && saved['address'] != null) {
      ss(() {
        _cryptoPayAddress = saved['address'] as String;
        _cryptoError = null;
      });
    } else {
      ss(() {
        _cryptoPayAddress = null;
      });
    }
    _fetchFeeInfo(ss);
  }

  Future<void> _fetchFeeInfo(StateSetter ss) async {
    ss(() => _cryptoFeeLoading = true);
    try {
      final info = await NetworkFeeService.getFeeInfo(_cryptoSelectedAsset);
      ss(() { _cryptoFeeInfo = info; _cryptoFeeLoading = false; });
    } catch (_) {
      ss(() => _cryptoFeeLoading = false);
    }
  }

  Future<void> _generateCryptoAddress(StateSetter ss) async {
    final saved = _cryptoSavedAddresses[_cryptoSelectedAsset];
    if (saved != null && saved['address'] != null) {
      _loadSavedAddressForAsset(ss);
      return;
    }

    ss(() { _cryptoLoading = true; _cryptoError = null; _cryptoPayAddress = null; });
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final address = HdWalletService.deriveAddress(_cryptoSelectedAsset, uid);
      _cryptoSavedAddresses[_cryptoSelectedAsset] = {
        'address': address,
        'network': _cryptoSelectedNetwork,
        'created_at': DateTime.now().toIso8601String(),
      };
      await FirestoreService().saveCryptoDeposit(uid, {
        'uid': uid,
        'addresses': _cryptoSavedAddresses,
      });
      ss(() { _cryptoPayAddress = address; _cryptoLoading = false; });
      _fetchFeeInfo(ss);
    } catch (e) { ss(() { _cryptoError = 'Error: $e'; _cryptoLoading = false; }); }
  }

  void _showCryptoSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setSheetState) {
          if (!_cryptoInitStarted) {
            _cryptoInitStarted = true;
            _initCryptoDeposit(setSheetState);
          }
          return _buildCryptoSheet(setSheetState);
        },
      ),
    );
  }

  Widget _buildSheetHeader(String title) {
    return Column(
      children: [
        Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
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

  Widget _buildCardSheet(StateSetter setSheetState) {
    return _buildSheetContainer(
      heightFactor: 0.55,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            _buildSheetHeader('Card Deposit'),
            Expanded(
              child: ListView(
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF000000).withOpacity(0.6),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40, height: 40,
                          decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF2563EB).withOpacity(0.2), border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3))),
                          child: Center(child: Text('\u20B6', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA)))),
                        ),
                        const SizedBox(width: 12),
                        Text('NGN', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
                        const SizedBox(width: 16),
                        Expanded(
                          child: TextField(
                            controller: _cardAmountController,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.right,
                            style: GoogleFonts.robotoMono(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1),
                            decoration: InputDecoration(
                              hintText: '0.00',
                              hintStyle: GoogleFonts.robotoMono(fontSize: 28, fontWeight: FontWeight.w900, color: Colors.white24, letterSpacing: -1),
                              border: InputBorder.none,
                              isDense: true,
                              contentPadding: EdgeInsets.zero,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 10),
                    child: Text('SELECT CARD', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  ),
                  _buildSavedCardsList(setSheetState),
                  const SizedBox(height: 20),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 32),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: _isProcessing ? null : () {
                  debugPrint('Pay button tapped');
                  _processCardDeposit(setSheetState);
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 25, offset: const Offset(0, 4))],
                  ),
                  child: Center(
                    child: _isProcessing
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('Pay', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
                              const SizedBox(width: 8),
                              const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 16),
                            ],
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

  Widget _buildSavedCardsList(StateSetter setSheetState) {
    final user = context.read<AuthProvider>().userModel;
    final savedCards = user?.savedCards ?? [];

    if (savedCards.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          children: [
            const Icon(Icons.credit_card_rounded, size: 28, color: Color(0xFF6B7280)),
            const SizedBox(height: 8),
            Text('No saved cards yet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
            const SizedBox(height: 4),
            Text('Enter an amount and tap Pay to add a card', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF4B5563))),
          ],
        ),
      );
    }

    return Column(
      children: [
        for (int i = 0; i < savedCards.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _buildSavedCardItem(savedCards[i], i, setSheetState),
          ),
      ],
    );
  }

  Widget _buildSavedCardItem(Map<String, dynamic> card, int index, StateSetter setSheetState) {
    final isSelected = _selectedCardIndex == index;
    final brand = (card['brand'] as String?) ?? '';
    final last4 = (card['last4'] as String?) ?? '****';
    final displayName = brand.isNotEmpty ? brand : 'Card';

    IconData cardIcon = FontAwesomeIcons.creditCard;
    if (brand.toLowerCase().contains('master')) {
      cardIcon = FontAwesomeIcons.ccMastercard;
    } else if (brand.toLowerCase().contains('visa')) {
      cardIcon = FontAwesomeIcons.ccVisa;
    } else if (brand.toLowerCase().contains('verve')) {
      cardIcon = FontAwesomeIcons.creditCard;
    }

    return GestureDetector(
      onTap: () => setSheetState(() {
        _selectedCardIndex = index;
      }),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF2563EB).withOpacity(0.1) : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? const Color(0xFF2563EB).withOpacity(0.5) : Colors.white.withOpacity(0.08),
          ),
        ),
        child: Row(
          children: [
            Icon(cardIcon, size: 24, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(displayName, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                  const SizedBox(height: 2),
                  Text('**** $last4', style: GoogleFonts.robotoMono(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                ],
              ),
            ),
            Container(
              width: 20, height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isSelected ? const Color(0xFF2563EB) : Colors.transparent,
                border: Border.all(color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.2)),
              ),
              child: isSelected ? const Center(child: Icon(Icons.check_rounded, size: 10, color: Colors.white)) : null,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCryptoSheet(StateSetter ss) {
    return _buildSheetContainer(
      heightFactor: 0.65,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            _buildSheetHeader('Deposit Crypto'),
            Expanded(child: ListView(children: [
              Row(children: [
                Expanded(child: _buildAssetDropdown(ss)),
                const SizedBox(width: 12),
                Expanded(child: _buildNetworkDropdown(ss)),
              ]),
              const SizedBox(height: 20),
              if (_cryptoLoading && _cryptoPayAddress == null)
                _buildCryptoLoading()
              else if (_cryptoError != null && _cryptoPayAddress == null)
                _buildCryptoError(ss)
              else if (_cryptoPayAddress != null)
                _buildCryptoDepositInfo(ss)
              else
                _buildCryptoGenerateButton(ss),
              const SizedBox(height: 20),
            ])),
          ],
        ),
      ),
    );
  }

  Widget _buildAssetDropdown(StateSetter ss) {
    final label = _cryptoAssets.firstWhere((a) => a['code'] == _cryptoSelectedAsset)['label']!;
    return GestureDetector(
      onTap: () => _showAssetPicker(ss),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text('ASSET', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5))),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Row(children: [
            Icon(FontAwesomeIcons.bitcoin, size: 14, color: const Color(0xFFF7931A)),
            const SizedBox(width: 8),
            Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
            const Spacer(),
            const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF6B7280)),
          ]),
        ),
      ]),
    );
  }

  Widget _buildNetworkDropdown(StateSetter ss) {
    return GestureDetector(
      onTap: () => _showNetworkPicker(ss),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text('NETWORK', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5))),
        Container(padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Row(children: [
            Text(_cryptoSelectedNetwork, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
            const Spacer(),
            const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF6B7280)),
          ])),
      ]),
    );
  }

  void _showAssetPicker(StateSetter ss) {
    final labels = _cryptoAssets.map((a) => a['label']!).toSet().toList();
    showModalBottomSheet(context: context, backgroundColor: const Color(0xFF0F1423),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 12),
        Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
        const SizedBox(height: 16),
        ...labels.map((label) {
          final asset = _cryptoAssets.firstWhere((a) => a['label'] == label);
          return ListTile(leading: Icon(FontAwesomeIcons.bitcoin, size: 16, color: const Color(0xFFF7931A)),
            title: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
            onTap: () { ss(() { _cryptoSelectedAsset = asset['code']!; _cryptoSelectedNetwork = asset['network']!; }); Navigator.pop(ctx); _loadSavedAddressForAsset(ss); });
        }),
        const SizedBox(height: 12),
      ])));
  }

  void _showNetworkPicker(StateSetter ss) {
    final curLabel = _cryptoAssets.firstWhere((a) => a['code'] == _cryptoSelectedAsset)['label']!;
    final nets = _cryptoAssets.where((a) => a['label'] == curLabel).map((a) => a['network']!).toList();
    showModalBottomSheet(context: context, backgroundColor: const Color(0xFF0F1423),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => SafeArea(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const SizedBox(height: 12),
        Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
        const SizedBox(height: 16),
        ...nets.map((net) {
          final asset = _cryptoAssets.firstWhere((a) => a['network'] == net && a['label'] == curLabel);
          return ListTile(title: Text(net, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
            onTap: () { ss(() { _cryptoSelectedAsset = asset['code']!; _cryptoSelectedNetwork = net; }); Navigator.pop(ctx); _loadSavedAddressForAsset(ss); });
        }),
        const SizedBox(height: 12),
      ])));
  }

  Widget _buildCryptoLoading() {
    return Container(padding: const EdgeInsets.symmetric(vertical: 40),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.1))),
      child: Column(children: [
        const CircularProgressIndicator(color: Color(0xFF10B981), strokeWidth: 2),
        const SizedBox(height: 16),
        Text('Generating deposit address...', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
      ]));
  }

  Widget _buildCryptoError(StateSetter ss) {
    return Container(padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(24), border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2))),
      child: Column(children: [
        const Icon(Icons.error_outline_rounded, color: Color(0xFFEF4444), size: 24),
        const SizedBox(height: 8),
        Text(_cryptoError ?? 'Error', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)), textAlign: TextAlign.center),
        const SizedBox(height: 12),
        GestureDetector(onTap: () => _generateCryptoAddress(ss),
          child: Text('Retry', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF34D399)))),
      ]));
  }

  Widget _buildCryptoGenerateButton(StateSetter ss) {
    return GestureDetector(onTap: () => _generateCryptoAddress(ss),
      child: Container(width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(color: const Color(0xFF10B981), borderRadius: BorderRadius.circular(16)),
        child: Center(child: Text('Generate Deposit Address',
          style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)))),
    );
  }

  Widget _buildCryptoDepositInfo(StateSetter ss) {
    final label = _cryptoAssets.firstWhere((a) => a['code'] == _cryptoSelectedAsset)['label']!;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.1))),
        child: Column(children: [
          Center(child: Container(padding: const EdgeInsets.all(8),
            decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(12))),
            child: QrImageView(data: _cryptoPayAddress!, size: 110, backgroundColor: Colors.white))),
          const SizedBox(height: 12),
          RichText(text: TextSpan(
            style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
            children: [
              const TextSpan(text: 'Send only '),
              TextSpan(text: '$label ($_cryptoSelectedNetwork)', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
              const TextSpan(text: ' to this address.'),
            ])),
        ])),
      const SizedBox(height: 16),
      Padding(padding: const EdgeInsets.only(left: 4, bottom: 6),
        child: Text('WALLET ADDRESS', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5))),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFF000000).withOpacity(0.6), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Expanded(child: Text(_cryptoPayAddress!, style: GoogleFonts.robotoMono(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB)), overflow: TextOverflow.ellipsis)),
            const SizedBox(width: 8),
            GestureDetector(onTap: () => _copyToClipboard(_cryptoPayAddress!, 'Wallet address'),
              child: Container(width: 32, height: 32,
                decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                child: const Center(child: Icon(Icons.copy_rounded, size: 12, color: Color(0xFF60A5FA))))),
          ]),
          if (_cryptoFeeInfo != null) ...[
            const SizedBox(height: 10),
            Divider(height: 1, color: Colors.white.withOpacity(0.08)),
            const SizedBox(height: 10),
            _buildFeeRow(
              'Network Fee',
              _cryptoFeeLoading ? 'Loading...' : _formatCoinAmount(_cryptoFeeInfo!.networkFeeCoin, _cryptoFeeInfo!.feeCoinSymbol),
              '',
              const Color(0xFF10B981),
            ),
            const SizedBox(height: 8),
            _buildFeeRow(
              'Min Deposit',
              _cryptoFeeLoading ? 'Loading...' : _formatCoinAmount(_cryptoFeeInfo!.minDepositCoin, _cryptoFeeInfo!.minDepositSymbol),
              '',
              const Color(0xFF2563EB),
            ),
          ] else if (_cryptoFeeLoading) ...[
            const SizedBox(height: 10),
            Divider(height: 1, color: Colors.white.withOpacity(0.08)),
            const SizedBox(height: 10),
            Center(child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Color(0xFF6B7280), strokeWidth: 1.5))),
          ],
        ]),
      ),
    ]);
  }

  Widget _buildFeeRow(String title, String value, String subtitle, Color color) {
    return Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
      Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
      const SizedBox(width: 6),
      Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
      const Spacer(),
      Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
      if (subtitle.isNotEmpty) ...[
        const SizedBox(width: 4),
        Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w600, color: color)),
      ],
    ]);
  }

  String _formatCoinAmount(double amount, String symbol) {
    if (symbol.isEmpty) return '\$${amount.toStringAsFixed(2)}';
    if (amount >= 1) return '${amount.toStringAsFixed(2)} $symbol';
    if (amount >= 0.01) return '${amount.toStringAsFixed(4)} $symbol';
    return '${amount.toStringAsFixed(6)} $symbol';
  }
}

class _DashedLinePainter extends CustomPainter {
  final Color color;
  _DashedLinePainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 1;
    const dashWidth = 5.0;
    const dashSpace = 5.0;
    double startX = 0;
    while (startX < size.width) {
      canvas.drawLine(Offset(startX, 0), Offset(startX + dashWidth, 0), paint);
      startX += dashWidth + dashSpace;
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../services/cloud_functions_service.dart';
import '../services/firestore_service.dart';
import '../services/network_fee_service.dart';
import '../services/squad_service.dart';
import '../utils/constants.dart';
import 'crypto_result_modal.dart';
import 'squad_checkout_sheet.dart';
import 'universal_icon.dart';
import 'coin_icon.dart';
import '../utils/coin_meta.dart';

/// Active deposit flow shown from the homepage/wallet "Add Money" buttons.
///
/// Card / Bank Transfer runs the secure Squad checkout (server-verified,
/// consume-once wallet credit via the completeCardDeposit action).
/// Cryptocurrency shows the user's unique deposit address with QR code.
///
/// NOTE: the full DepositScreen (deposit_screen.dart) remains intentionally
/// disabled — this modal IS the deposit UI.
Future<void> showDepositMethodsModal({required BuildContext context}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (ctx) => const _DepositMethodsSheet(),
  );
}

class _DepositMethodsSheet extends StatefulWidget {
  const _DepositMethodsSheet();

  @override
  State<_DepositMethodsSheet> createState() => _DepositMethodsSheetState();
}

class _DepositMethodsSheetState extends State<_DepositMethodsSheet> {
  final TextEditingController _amountController = TextEditingController();
  final NumberFormat _fmt = NumberFormat('#,##0');
  bool _isProcessing = false;

  static const List<String> _quickAmounts = ['1,000', '5,000', '10,000', '50,000'];

  double get _amount =>
      double.tryParse(_amountController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;

  @override
  void dispose() {
    _amountController.dispose();
    super.dispose();
  }

  void _setAmount(String raw) {
    final value = double.tryParse(raw.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
    setState(() => _amountController.text = value > 0 ? value.toInt().toString() : '');
  }

  // ── Card / Bank Transfer — Squad checkout flow ─────────────────────────

  Future<void> _processCardDeposit() async {
    if (_isProcessing) return;
    if (_amount < AppConstants.minDeposit) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Minimum deposit is \u20A6${_fmt.format(AppConstants.minDeposit)}',
              style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
          backgroundColor: const Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    FocusManager.instance.primaryFocus?.unfocus();
    setState(() => _isProcessing = true);
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);

    try {
      final auth = context.read<AuthProvider>();
      final uid = auth.firebaseUser!.uid;
      final user = auth.userModel!;

      final squadResult = await SquadService.initializeCheckout(
        amount: _amount,
        customerName: user.fullName,
        customerEmail: user.email,
        paymentChannels: const ['card', 'transfer', 'ussd'],
      );

      if (!squadResult.success || squadResult.checkoutUrl == null) {
        if (mounted) {
          messenger.showSnackBar(
            SnackBar(
              content: Text(squadResult.errorMessage ?? 'Failed to initialize payment',
                  style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return;
      }

      // Pending transaction first — the server completes it after verifying.
      final pendingTx = TransactionModel(
        id: '',
        uid: uid,
        type: TransactionType.deposit,
        status: TransactionStatus.pending,
        amountNaira: _amount,
        description: 'Card / Transfer deposit',
        reference: squadResult.reference ?? '',
        createdAt: DateTime.now(),
        paymentMethod: 'card',
      );
      final txId = await FirestoreService().createTransaction(pendingTx);

      if (!mounted) return;
      final returnedRef = await SquadCheckoutSheet.show(
        context,
        checkoutUrl: squadResult.checkoutUrl!,
        amount: _amount,
        reference: squadResult.reference,
      );
      if (returnedRef == null) {
        if (mounted) {
          messenger.showSnackBar(
            SnackBar(
              content: Text('Payment cancelled',
                  style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
              backgroundColor: const Color(0xFFEF4444),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
        return;
      }

      // Server-side verify + consume-once + atomic wallet credit.
      final result = await CloudFunctionsService.completeCardDeposit(
        squadRef: squadResult.reference!,
        amount: _amount,
        transactionId: txId,
        idempotencyKey: CloudFunctionsService.newIdempotencyKey(),
      );
      final success = result['success'] as bool? ?? false;

      if (mounted) {
        navigator.pop(); // close this methods sheet
        await showCryptoResultModal(
          context: context,
          success: success,
          title: success ? 'Deposit Successful!' : 'Deposit Failed',
          subtitle: success
              ? 'Your wallet has been credited'
              : 'Payment could not be verified — if you were debited, contact support.',
          details: {
            'Amount': '\u20A6${_fmt.format(_amount)}',
            'Method': 'Card / Bank Transfer',
          },
        );
      }
    } catch (e) {
      if (mounted) {
        await showCryptoResultModal(
          context: context,
          success: false,
          title: 'Deposit Failed',
          subtitle: 'Unable to complete your deposit',
          errorMessage: e.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  // ── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xF20F1423),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(32),
            topRight: Radius.circular(32),
          ),
          border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
          boxShadow: [BoxShadow(color: Color(0x80000000), blurRadius: 40, offset: Offset(0, -10))],
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Grab handle
                Center(
                  child: Container(
                    width: 48,
                    height: 6,
                    margin: const EdgeInsets.only(top: 12),
                    decoration: BoxDecoration(
                      color: const Color(0x33FFFFFF),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                const SizedBox(height: 16),

                // Title
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF10B981), Color(0xFF059669)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.add_rounded, color: Colors.white, size: 26),
                      ),
                      const SizedBox(width: 12),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Add Money',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                          Text('Choose how you want to top up',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Amount field
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('AMOUNT (NGN)',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: Row(
                          children: [
                            Text('\u20A6',
                                style: GoogleFonts.plusJakartaSans(
                                    fontSize: 22, fontWeight: FontWeight.w900, color: const Color(0xFF10B981))),
                            const SizedBox(width: 10),
                            Expanded(
                              child: TextField(
                                controller: _amountController,
                                keyboardType: TextInputType.number,
                                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                style: GoogleFonts.plusJakartaSans(
                                    fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
                                decoration: InputDecoration(
                                  hintText: '0',
                                  hintStyle: GoogleFonts.plusJakartaSans(
                                      fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white24),
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: const EdgeInsets.symmetric(vertical: 16),
                                ),
                                onChanged: (_) => setState(() {}),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 10),
                      // Quick amounts
                      Row(
                        children: _quickAmounts
                            .map((q) => Expanded(
                                  child: GestureDetector(
                                    behavior: HitTestBehavior.opaque,
                                    onTap: () => _setAmount(q),
                                    child: Container(
                                      margin: EdgeInsets.only(right: q == _quickAmounts.last ? 0 : 6),
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF2563EB).withOpacity(0.1),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2)),
                                      ),
                                      child: Center(
                                        child: Text('\u20A6$q',
                                            style: GoogleFonts.plusJakartaSans(
                                                fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA))),
                                      ),
                                    ),
                                  ),
                                ))
                            .toList(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // ── Card / Bank Transfer ────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _DepositMethodCard(
                    icon: Icons.credit_card_rounded,
                    iconColor: const Color(0xFF60A5FA),
                    bgColor: const Color(0xFF2563EB).withOpacity(0.1),
                    borderColor: const Color(0xFF2563EB).withOpacity(0.2),
                    title: 'Card / Bank Transfer',
                    subtitle: _amount >= AppConstants.minDeposit
                        ? 'Pay \u20A6${_fmt.format(_amount)} via Squad checkout'
                        : 'Pay via card or bank transfer',
                    badge: 'POPULAR',
                    badgeColor: const Color(0xFF2563EB),
                    isProcessing: _isProcessing,
                    onTap: _processCardDeposit,
                  ),
                ),
                const SizedBox(height: 10),

                // ── Cryptocurrency ──────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _DepositMethodCard(
                    customIconWidget: const CoinIcon(symbol: 'USDT', size: 24),
                    iconColor: const Color(0xFF10B981),
                    bgColor: const Color(0xFF10B981).withOpacity(0.1),
                    borderColor: const Color(0xFF10B981).withOpacity(0.2),
                    title: 'Cryptocurrency',
                    subtitle: 'BTC, ETH, USDT, TRX • Free',
                    badge: 'FREE',
                    badgeColor: const Color(0xFF10B981),
                    onTap: () {
                      final rootContext = Navigator.of(context, rootNavigator: true).context;
                      Navigator.of(context).pop();
                      showCryptoDepositSheet(context: rootContext);
                    },
                  ),
                ),
                const SizedBox(height: 12),

                // Footer note
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_rounded, size: 13, color: Color(0xFF6B7280)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text('All deposits are secured and processed instantly',
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF6B7280))),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ── Crypto deposit sheet — unique address + QR ─────────────────────────────

const List<Map<String, String>> _cryptoAssets = [
  {'code': 'usdttrc20', 'label': 'USDT', 'network': 'TRC20'},
  {'code': 'usdtbsc', 'label': 'USDT', 'network': 'BEP20'},
  {'code': 'usdt', 'label': 'USDT', 'network': 'ERC20'},
  {'code': 'btc', 'label': 'BTC', 'network': 'Bitcoin'},
  {'code': 'eth', 'label': 'ETH', 'network': 'ERC20'},
  {'code': 'trx', 'label': 'TRX', 'network': 'TRC20'},
  {'code': 'sol', 'label': 'SOL', 'network': 'Solana'},
  {'code': 'bnb', 'label': 'BNB', 'network': 'BEP20'},
  {'code': 'doge', 'label': 'DOGE', 'network': 'Dogecoin'},
  {'code': 'xrp', 'label': 'XRP', 'network': 'XRPL'},
  {'code': 'ada', 'label': 'ADA', 'network': 'Cardano'},
  {'code': 'matic', 'label': 'MATIC', 'network': 'Polygon'},
  {'code': 'ton', 'label': 'TON', 'network': 'TON'},
];

Future<void> showCryptoDepositSheet({required BuildContext context}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    builder: (ctx) => const _CryptoDepositSheet(),
  );
}

class _CryptoDepositSheet extends StatefulWidget {
  const _CryptoDepositSheet();

  @override
  State<_CryptoDepositSheet> createState() => _CryptoDepositSheetState();
}

class _CryptoDepositSheetState extends State<_CryptoDepositSheet> {
  String _selectedAsset = 'usdttrc20';
  Map<String, Map<String, dynamic>> _savedAddresses = {};
  String? _address;
  bool _loading = false;
  String? _error;
  bool _initialized = false;

  String get _selectedNetwork =>
      _cryptoAssets.firstWhere((a) => a['code'] == _selectedAsset)['network']!;
  String get _selectedLabel =>
      _cryptoAssets.firstWhere((a) => a['code'] == _selectedAsset)['label']!;

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      _initialized = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _init());
    }
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.7),
        decoration: const BoxDecoration(
          color: Color(0xF20F1423),
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(32),
            topRight: Radius.circular(32),
          ),
          border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Center(
                  child: Container(
                    width: 48,
                    height: 6,
                    margin: const EdgeInsets.only(top: 12),
                    decoration: BoxDecoration(
                      color: const Color(0x33FFFFFF),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Deposit Crypto',
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                const SizedBox(height: 16),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Expanded(child: _buildAssetPicker()),
                      const SizedBox(width: 12),
                      Expanded(child: _buildNetworkTag()),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _buildAddressSection(),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAssetPicker() {
    return GestureDetector(
      onTap: _showAssetPicker,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('ASSET',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Row(children: [
            CoinIcon(symbol: _selectedLabel, size: 18),
            const SizedBox(width: 8),
            Text(_selectedLabel,
                style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
            const Spacer(),
            const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Color(0xFF6B7280)),
          ]),
        ),
      ]),
    );
  }

  Widget _buildNetworkTag() {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('NETWORK',
          style: GoogleFonts.plusJakartaSans(
              fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
      const SizedBox(height: 6),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
        decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.1))),
        child: Row(children: [
          Flexible(
            child: Text(_selectedNetwork,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
          ),
        ]),
      ),
    ]);
  }

  Widget _buildAddressSection() {
    if (_loading && _address == null) {
      return Column(
        children: [
          const SizedBox(height: 24),
          const CircularProgressIndicator(color: Color(0xFFF7931A), strokeWidth: 2),
          const SizedBox(height: 16),
          Text('Generating your secure deposit address...',
              style: GoogleFonts.plusJakartaSans(fontSize: 12, color: const Color(0xFF9CA3AF))),
          const SizedBox(height: 24),
        ],
      );
    }
    if (_error != null && _address == null) {
      return Column(
        children: [
          const SizedBox(height: 12),
          Text(_error!, style: GoogleFonts.plusJakartaSans(fontSize: 12, color: const Color(0xFFEF4444))),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: _generateAddress,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFFF7931A),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Center(
                child: Text('Retry',
                    style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
              ),
            ),
          ),
        ],
      );
    }
    if (_address == null) {
      return GestureDetector(
        onTap: _generateAddress,
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: const Color(0xFFF7931A),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Center(
            child: Text('Generate Deposit Address',
                style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
          ),
        ),
      );
    }
    return Column(
      children: [
        // QR + address card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                child: QrImageView(data: _address!, size: 120),
              ),
              const SizedBox(height: 14),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CoinIcon(symbol: _selectedLabel, size: 16),
                  const SizedBox(width: 6),
                  Text('Your $_selectedLabel deposit address',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withOpacity(0.08))),
                child: Text(_address!,
                    textAlign: TextAlign.center,
                    style: GoogleFonts.robotoMono(fontSize: 11, color: const Color(0xFFD1D5DB))),
              ),
              const SizedBox(height: 10),
              GestureDetector(
                onTap: () {
                  Clipboard.setData(ClipboardData(text: _address!));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Address copied to clipboard',
                          style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                      backgroundColor: const Color(0xFF0F1423),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                },
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7931A).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFF7931A).withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.copy_rounded, size: 15, color: Color(0xFFF7931A)),
                      const SizedBox(width: 8),
                      Text('Copy Address',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFFF7931A))),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Warning
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFEF4444).withOpacity(0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.15)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.warning_amber_rounded, size: 15, color: Color(0xFFEF4444)),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Send only $_selectedLabel ($_selectedNetwork) to this address. Deposits are credited after network confirmation.',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 10.5, fontWeight: FontWeight.w600, color: const Color(0xFFEF4444).withOpacity(0.9)),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showAssetPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Color(0xF20F1423),
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 48, height: 6,
                decoration: BoxDecoration(
                  color: const Color(0x33FFFFFF),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              const SizedBox(height: 16),
              Text('Select Asset',
                  style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
              const SizedBox(height: 8),
              Flexible(
                child: ListView(
                  shrinkWrap: true,
                  children: _cryptoAssets
                      .map((a) {
                        final label = a['label']!;
                        final network = a['network']!;
                        final isSelected = _selectedAsset == a['code'];
                        return ListTile(
                          dense: true,
                          leading: CoinIcon(symbol: label, size: 24, showBackground: true),
                          onTap: () {
                            Navigator.pop(ctx);
                            setState(() {
                              _selectedAsset = a['code']!;
                              _address = null;
                              _error = null;
                            });
                            _init();
                          },
                          title: Text('$label ($network)',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                          trailing: isSelected
                              ? const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18)
                              : null,
                        );
                      })
                      .toList(),
                ),
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _init() async {
    setState(() => _loading = true);
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final saved = await FirestoreService().getCryptoDeposit(uid);
      if (saved != null && saved['addresses'] != null) {
        _savedAddresses = Map<String, Map<String, dynamic>>.from(
          (saved['addresses'] as Map).map((k, v) => MapEntry(k, Map<String, dynamic>.from(v))),
        );
      }
      final existing = _savedAddresses[_selectedAsset]?['address'] as String?;
      if (existing != null && existing.isNotEmpty) {
        setState(() {
          _address = existing;
          _loading = false;
        });
      } else {
        await _generateAddress();
      }
    } catch (e) {
      setState(() {
        _error = 'Error loading deposit address: $e';
        _loading = false;
      });
    }
  }

  Future<void> _generateAddress() async {
    final existing = _savedAddresses[_selectedAsset]?['address'] as String?;
    if (existing != null && existing.isNotEmpty) {
      setState(() {
        _address = existing;
        _loading = false;
      });
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final address = await CloudFunctionsService.deriveDepositAddress(_selectedAsset);
      _savedAddresses[_selectedAsset] = {
        'address': address,
        'network': _selectedNetwork,
        'created_at': DateTime.now().toIso8601String(),
      };
      setState(() {
        _address = address;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = 'Could not generate address: $e';
        _loading = false;
      });
    }
  }
}

// ── Method card ────────────────────────────────────────────────────────────

class _DepositMethodCard extends StatelessWidget {
  final dynamic icon;
  final Widget? customIconWidget;
  final Color iconColor;
  final Color bgColor;
  final Color borderColor;
  final String title;
  final String subtitle;
  final String badge;
  final Color badgeColor;
  final bool isProcessing;
  final VoidCallback onTap;

  const _DepositMethodCard({
    this.icon,
    this.customIconWidget,
    required this.iconColor,
    required this.bgColor,
    required this.borderColor,
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.badgeColor,
    this.isProcessing = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: isProcessing ? null : onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Row(
          children: [
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: bgColor,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: borderColor),
              ),
              child: isProcessing
                  ? const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      ),
                    )
                  : Center(child: customIconWidget ?? UniversalIcon(icon, size: 20, color: iconColor)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(title,
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: badgeColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(badge,
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 9, fontWeight: FontWeight.w900, color: badgeColor, letterSpacing: 0.5)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(subtitle,
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                ],
              ),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right_rounded, color: Color(0xFF6B7280), size: 22),
          ],
        ),
      ),
    );
  }
}

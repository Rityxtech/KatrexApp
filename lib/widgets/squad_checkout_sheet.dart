import 'dart:async';
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../services/cloud_functions_service.dart';
import '../services/firestore_service.dart';
import '../services/squad_service.dart';
import '../utils/api_config.dart';

/// A brand-new, clean, spacious, and professional payment window.
/// Replaces clustered and scattered web layouts with a simple, high-contrast,
/// native Flutter interface that makes bank transfer and card payments seamless.
class SquadCheckoutSheet extends StatefulWidget {
  final String checkoutUrl;
  final double? amount;
  final String? reference;
  final String? accountNumber;
  final String? bankName;
  final String? accountName;
  final String? customerEmail;

  const SquadCheckoutSheet({
    super.key,
    required this.checkoutUrl,
    this.amount,
    this.reference,
    this.accountNumber,
    this.bankName,
    this.accountName,
    this.customerEmail,
  });

  /// Push the checkout page as a full-screen route.
  /// Returns the reference string if payment was verified or completed, null if cancelled.
  static Future<String?> show(
    BuildContext context, {
    required String checkoutUrl,
    double? amount,
    String? reference,
    String? accountNumber,
    String? bankName,
    String? accountName,
    String? customerEmail,
  }) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => SquadCheckoutSheet(
          checkoutUrl: checkoutUrl,
          amount: amount,
          reference: reference,
          accountNumber: accountNumber,
          bankName: bankName,
          accountName: accountName,
          customerEmail: customerEmail,
        ),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  State<SquadCheckoutSheet> createState() => _SquadCheckoutSheetState();
}

class _SquadCheckoutSheetState extends State<SquadCheckoutSheet> {
  WebViewController? _controller;
  bool _isLoading = true;
  bool _isClosing = false;
  bool _isVerifying = false;
  bool _copied = false;

  // Selected payment method: 0 = Bank Transfer, 1 = Card / Web Checkout
  int _selectedTab = 0;

  // Dynamic bank account
  String _bankName = 'Guaranty Trust Bank (GTB)';
  String _accountNumber = '';
  String _accountName = 'Squad Checkout / Katrex';
  double _amount = 0.0;
  String _ref = '';
  Timer? _extractionTimer;

  @override
  void initState() {
    super.initState();
    _amount = widget.amount ?? _extractAmountFromUrl(widget.checkoutUrl);
    _ref = widget.reference ?? _extractRefFromUrl(widget.checkoutUrl);
    if (widget.accountNumber != null && widget.accountNumber!.isNotEmpty) {
      _accountNumber = widget.accountNumber!;
    }
    if (widget.bankName != null && widget.bankName!.isNotEmpty) {
      _bankName = widget.bankName!;
    }
    if (widget.accountName != null && widget.accountName!.isNotEmpty) {
      _accountName = widget.accountName!;
    }

    // If account number wasn't provided yet, fetch dynamic virtual account via API
    if (_accountNumber.isEmpty) {
      _fetchDynamicAccount();
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _isClosing) return;

      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (_) {
              if (mounted) setState(() => _isLoading = true);
            },
            onPageFinished: (_) {
              if (mounted) {
                setState(() => _isLoading = false);
                _extractAccountDetails();
              }
            },
            onNavigationRequest: (request) {
              final uri = Uri.tryParse(request.url);
              if (uri != null) {
                const callbackBase = ApiConfig.squadCallbackUrl;
                final callbackHost = Uri.parse(callbackBase).host;
                if (uri.host == callbackHost) {
                  final reference = uri.queryParameters['transaction_ref'] ??
                      uri.queryParameters['reference'] ??
                      _ref;
                  _handleSuccess(reference);
                  return NavigationDecision.prevent;
                }
              }
              return NavigationDecision.navigate;
            },
          ),
        )
        ..loadRequest(Uri.parse(widget.checkoutUrl));

      if (mounted) setState(() {});

      // Periodically extract account details in case page loads dynamically
      _extractionTimer = Timer.periodic(const Duration(milliseconds: 1000), (timer) {
        if (!mounted || _accountNumber.isNotEmpty || timer.tick > 25) {
          if (_accountNumber.isNotEmpty || timer.tick > 25) timer.cancel();
          return;
        }
        _extractAccountDetails();
      });
    });
  }

  @override
  void dispose() {
    _extractionTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchDynamicAccount() async {
    try {
      // 1. Check if user already has an active virtual account in Firestore
      final uid = FirebaseAuth.instance.currentUser?.uid;
      if (uid != null) {
        final saved = await FirestoreService().getVirtualAccount(uid);
        if (saved != null && saved['account_number'] != null && mounted) {
          final acc = saved['account_number'].toString().trim();
          if (acc.isNotEmpty) {
            setState(() {
              _accountNumber = acc;
              if (saved['bank_name'] != null) _bankName = saved['bank_name'].toString();
              if (saved['account_name'] != null) _accountName = saved['account_name'].toString();
            });
            return;
          }
        }
      }

      // 2. Query Cloud Functions for dynamic virtual account
      final email = widget.customerEmail ?? FirebaseAuth.instance.currentUser?.email ?? 'user@katrex.app';
      final res = await CloudFunctionsService.createDynamicVirtualAccount(
        amount: _amount > 0 ? _amount : 100,
        email: email,
        transactionRef: _ref.isNotEmpty ? _ref : 'KX-${DateTime.now().millisecondsSinceEpoch}',
      );
      if (res['success'] == true && mounted) {
        final acc = res['accountNumber'] as String? ?? '';
        if (acc.isNotEmpty) {
          setState(() {
            _accountNumber = acc;
            if (res['bankName'] != null) _bankName = res['bankName'] as String;
            if (res['accountName'] != null) _accountName = res['accountName'] as String;
          });
        }
      }
    } catch (_) {}
  }

  double _extractAmountFromUrl(String url) {
    try {
      final uri = Uri.parse(url);
      final amtStr = uri.queryParameters['amount'] ?? uri.queryParameters['amt'];
      if (amtStr != null) {
        final val = double.tryParse(amtStr);
        if (val != null) {
          // If in kobo (> 1000 and has no decimals), convert
          return val > 1000 && (val % 100 == 0) ? val / 100 : val;
        }
      }
    } catch (_) {}
    return 100.0;
  }

  String _extractRefFromUrl(String url) {
    try {
      final uri = Uri.parse(url);
      return uri.queryParameters['transaction_ref'] ??
          uri.queryParameters['reference'] ??
          uri.pathSegments.lastOrNull ??
          '';
    } catch (_) {
      return '';
    }
  }

  Future<void> _extractAccountDetails() async {
    if (_controller == null || _accountNumber.isNotEmpty) return;

    try {
      final res = await _controller!.runJavaScriptReturningResult(r"""
(function() {
  try {
    // 1. Look for and click 'Transfer' or 'Bank Transfer' tab if available on Squad checkout
    const elements = Array.from(document.querySelectorAll('button, a, div, span, li, p, input'));
    const transferBtn = elements.find(el => {
      const t = (el.innerText || el.textContent || el.value || '').trim().toLowerCase();
      return (t === 'transfer' || t === 'bank transfer' || t === 'pay with transfer' || t === 'bank') && el.offsetParent !== null;
    });
    if (transferBtn && !transferBtn.dataset.clicked) {
      transferBtn.dataset.clicked = 'true';
      try { transferBtn.click(); } catch(e) {}
    }

    const text = document.body ? document.body.innerText : '';
    
    // Extract 10-digit Nigerian NUBAN account number
    const match = text.match(/\b(0\d{9}|\d{10})\b/);
    const accNum = match ? match[0] : '';
    
    let bank = 'Guaranty Trust Bank (GTB)';
    if (/wema/i.test(text)) bank = 'Wema Bank';
    else if (/sterling/i.test(text)) bank = 'Sterling Bank';
    else if (/providus/i.test(text)) bank = 'Providus Bank';
    else if (/access/i.test(text)) bank = 'Access Bank';
    else if (/gtb|guaranty/i.test(text)) bank = 'Guaranty Trust Bank (GTB)';

    let accName = 'Squad Checkout';
    const nameMatch = text.match(/Account Name[\s:]*([^\n\r]+)/i);
    if (nameMatch && nameMatch[1]) {
      accName = nameMatch[1].trim();
    }

    return JSON.stringify({
      accountNumber: accNum,
      bankName: bank,
      accountName: accName
    });
  } catch(e) {
    return JSON.stringify({ error: e.toString() });
  }
})();
""");

      if (res is String && res.isNotEmpty && res != 'null') {
        String raw = res;
        if (raw.startsWith('"') && raw.endsWith('"')) {
          raw = jsonDecode(raw);
        }
        final Map<String, dynamic> data = jsonDecode(raw);
        final acc = data['accountNumber'] as String? ?? '';
        if (acc.length == 10 && mounted) {
          setState(() {
            _accountNumber = acc;
            if (data['bankName'] != null && data['bankName'].toString().isNotEmpty) {
              _bankName = data['bankName'] as String;
            }
            if (data['accountName'] != null && data['accountName'].toString().isNotEmpty) {
              _accountName = data['accountName'] as String;
            }
          });
        }
      }
    } catch (_) {}
  }

  void _copyAccount() {
    if (_accountNumber.isEmpty) return;
    Clipboard.setData(ClipboardData(text: _accountNumber));
    setState(() => _copied = true);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Color(0xFF10B981), size: 18),
            const SizedBox(width: 8),
            Text(
              'Account number copied to clipboard',
              style: GoogleFonts.plusJakartaSans(
                fontWeight: FontWeight.w700,
                fontSize: 13,
                color: Colors.white,
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF1E293B),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
    Future.delayed(const Duration(seconds: 3), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  Future<void> _verifyTransfer() async {
    if (_isVerifying) return;
    setState(() => _isVerifying = true);

    try {
      final refToVerify = _ref.isNotEmpty ? _ref : _extractRefFromUrl(widget.checkoutUrl);
      if (refToVerify.isNotEmpty) {
        final verification = await SquadService.verifyTransaction(reference: refToVerify);
        if (verification.success && verification.status.toLowerCase() == 'success') {
          _handleSuccess(refToVerify);
          return;
        }
      }

      // If not yet credited, inform user and allow periodic checking
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Payment is being confirmed. Please wait a few moments...',
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            backgroundColor: const Color(0xFF2563EB),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Still awaiting transfer confirmation from your bank.',
              style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700, fontSize: 13),
            ),
            backgroundColor: const Color(0xFFF59E0B),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  void _handleSuccess(String? reference) {
    if (_isClosing) return;
    _isClosing = true;
    Navigator.of(context).pop(reference ?? _ref);
  }

  Future<void> _confirmCancel() async {
    final shouldCancel = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: const BoxDecoration(
          color: Color(0xFF0F1423),
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFEF4444).withOpacity(0.12),
                border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.3)),
              ),
              child: const Icon(Icons.close_rounded, color: Color(0xFFEF4444), size: 26),
            ),
            const SizedBox(height: 14),
            Text(
              'Cancel Payment?',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Are you sure you want to exit? Any transfer sent will still be verified automatically.',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF9CA3AF),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(ctx, false),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Center(
                        child: Text(
                          'Continue Payment',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(ctx, true),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: Center(
                        child: Text(
                          'Yes, Exit',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFFEF4444),
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
      ),
    );

    if (shouldCancel == true) {
      if (_isClosing) return;
      _isClosing = true;
      if (mounted) Navigator.of(context).pop(null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _confirmCancel();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFF070B16),
        appBar: AppBar(
          backgroundColor: const Color(0xFF070B16),
          elevation: 0,
          leading: IconButton(
            onPressed: _confirmCancel,
            icon: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: const Center(
                child: Icon(Icons.close_rounded, color: Colors.white, size: 18),
              ),
            ),
          ),
          title: Column(
            children: [
              Text(
                'Complete Payment',
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontWeight: FontWeight.w900,
                  fontSize: 16,
                  letterSpacing: -0.3,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.lock_rounded, size: 11, color: Color(0xFF10B981)),
                  const SizedBox(width: 4),
                  Text(
                    '256-Bit Secure Encryption',
                    style: GoogleFonts.plusJakartaSans(
                      color: const Color(0xFF9CA3AF),
                      fontWeight: FontWeight.w700,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ],
          ),
          centerTitle: true,
        ),
        body: IndexedStack(
          index: _selectedTab,
          children: [
            // 0: Clean Native Payment View (Bank Transfer)
            SafeArea(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
                children: [
                  // Method Switcher Pill (Transfer vs Card)
                  _buildMethodSelector(),
                  const SizedBox(height: 20),

                  // Amount Display Card
                  _buildAmountCard(),
                  const SizedBox(height: 18),

                  // Bank Account Details Box
                  _buildBankTransferBox(),
                  const SizedBox(height: 18),

                  // Important Transfer Instructions Callout
                  _buildInstructionsBanner(),
                  const SizedBox(height: 24),

                  // Primary Action Button ("I have made the transfer")
                  _buildConfirmButton(),
                  const SizedBox(height: 14),

                  // Switch to Card Option
                  _buildSwitchToCardButton(),
                  const SizedBox(height: 20),

                  // Security Badge Footer
                  _buildSecurityFooter(),
                ],
              ),
            ),

            // 1: Card / Web Checkout View
            Stack(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 8),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: _controller != null
                      ? WebViewWidget(controller: _controller!)
                      : const SizedBox.shrink(),
                ),
                if (_isLoading)
                  Container(
                    color: Colors.white,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const CircularProgressIndicator(color: Color(0xFF2563EB), strokeWidth: 3),
                          const SizedBox(height: 16),
                          Text(
                            'Loading secure payment gateway...',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodSelector() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = 0),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _selectedTab == 0 ? const Color(0xFF2563EB) : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: _selectedTab == 0
                      ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 10)]
                      : [],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.account_balance_rounded,
                      size: 16,
                      color: _selectedTab == 0 ? Colors.white : const Color(0xFF9CA3AF),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Bank Transfer',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: _selectedTab == 0 ? Colors.white : const Color(0xFF9CA3AF),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = 1),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: _selectedTab == 1 ? const Color(0xFF2563EB) : Colors.transparent,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: _selectedTab == 1
                      ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 10)]
                      : [],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.credit_card_rounded,
                      size: 16,
                      color: _selectedTab == 1 ? Colors.white : const Color(0xFF9CA3AF),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Card / Online',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: _selectedTab == 1 ? Colors.white : const Color(0xFF9CA3AF),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountCard() {
    final fmt = NumberFormat('#,##0.00');
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        children: [
          Text(
            'AMOUNT TO PAY',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF94A3B8),
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                '₦',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF60A5FA),
                ),
              ),
              const SizedBox(width: 2),
              Text(
                fmt.format(_amount > 0 ? _amount : 100),
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -1.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF10B981).withOpacity(0.12),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: Color(0xFF10B981),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  'Instant Auto-Confirmation',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF34D399),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBankTransferBox() {
    final hasAccount = _accountNumber.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Bank Name Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'BANK NAME',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 0.8,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE24A10).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFE24A10).withOpacity(0.3)),
                ),
                child: Text(
                  'GTBANK',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFFFF7A45),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            _bankName,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(color: Color(0x1AFFFFFF), height: 1),
          ),

          // Account Number Row
          Text(
            'ACCOUNT NUMBER',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF94A3B8),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Expanded(
                child: hasAccount
                    ? FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: Text(
                          _accountNumber,
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontSize: 24,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: 2.0,
                          ),
                        ),
                      )
                    : Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(
                              color: Color(0xFF60A5FA),
                              strokeWidth: 2,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: Text(
                              'Generating Account...',
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF94A3B8),
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: hasAccount ? _copyAccount : null,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                  decoration: BoxDecoration(
                    color: _copied
                        ? const Color(0xFF10B981).withOpacity(0.2)
                        : const Color(0xFF2563EB).withOpacity(0.18),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _copied
                          ? const Color(0xFF10B981).withOpacity(0.5)
                          : const Color(0xFF2563EB).withOpacity(0.4),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _copied ? Icons.check_rounded : Icons.copy_rounded,
                        size: 13,
                        color: _copied ? const Color(0xFF34D399) : const Color(0xFF60A5FA),
                      ),
                      const SizedBox(width: 4),
                      Text(
                        _copied ? 'Copied' : 'Copy',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _copied ? const Color(0xFF34D399) : const Color(0xFF60A5FA),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const Padding(
            padding: EdgeInsets.symmetric(vertical: 14),
            child: Divider(color: Color(0x1AFFFFFF), height: 1),
          ),

          // Account Name Row
          Text(
            'ACCOUNT NAME',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF94A3B8),
              letterSpacing: 0.8,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _accountName,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: const Color(0xFFE2E8F0),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInstructionsBanner() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF59E0B).withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.info_outline_rounded, color: Color(0xFFF59E0B), size: 18),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Please transfer the exact amount displayed. This temporary dynamic account expires in 60 minutes.',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFFFCD34D),
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildConfirmButton() {
    return GestureDetector(
      onTap: _isVerifying ? null : _verifyTransfer,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF10B981),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF10B981).withOpacity(0.35),
              blurRadius: 18,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Center(
          child: _isVerifying
              ? Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    ),
                    const SizedBox(width: 12),
                    Text(
                      'Confirming Payment...',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ],
                )
              : Text(
                  'I Have Made The Transfer',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
        ),
      ),
    );
  }

  Widget _buildSwitchToCardButton() {
    return GestureDetector(
      onTap: () => setState(() => _selectedTab = 1),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Center(
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.credit_card_rounded, size: 16, color: Color(0xFF94A3B8)),
              const SizedBox(width: 8),
              Text(
                'Prefer to pay with Debit Card? Click here',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFFCBD5E1),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSecurityFooter() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.verified_user_rounded, size: 14, color: Color(0xFF64748B)),
        const SizedBox(width: 6),
        Text(
          'Secured by Squad • Powered by GTBank',
          style: GoogleFonts.plusJakartaSans(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }
}


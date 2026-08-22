import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../services/squad_service.dart';
import '../utils/api_config.dart';

/// A sleek, spacious, and professional full-screen payment window.
/// Provides an unconstrained, high-performance in-app gateway view
/// where users can seamlessly pay via Bank Transfer, Debit Card, or USSD.
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
  double _loadProgress = 0.0;
  bool _isClosing = false;
  double _amount = 0.0;
  String _ref = '';

  @override
  void initState() {
    super.initState();
    _amount = widget.amount ?? _extractAmountFromUrl(widget.checkoutUrl);
    _ref = widget.reference ?? _extractRefFromUrl(widget.checkoutUrl);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _isClosing) return;

      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.white)
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              if (mounted) {
                setState(() {
                  _loadProgress = progress / 100.0;
                  _isLoading = progress < 100;
                });
              }
            },
            onPageStarted: (_) {
              if (mounted) setState(() => _isLoading = true);
            },
            onPageFinished: (_) {
              if (mounted) setState(() => _isLoading = false);
            },
            onNavigationRequest: (request) {
              final uri = Uri.tryParse(request.url);
              if (uri != null) {
                const callbackBase = ApiConfig.squadCallbackUrl;
                final callbackHost = Uri.parse(callbackBase).host;
                if (uri.host == callbackHost ||
                    request.url.contains('success=true') ||
                    request.url.contains('status=success')) {
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
    });
  }

  double _extractAmountFromUrl(String url) {
    try {
      final uri = Uri.parse(url);
      final amtStr = uri.queryParameters['amount'] ?? uri.queryParameters['amt'];
      if (amtStr != null) {
        final val = double.tryParse(amtStr);
        if (val != null) {
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

  Future<void> _handleSuccess(String reference) async {
    if (_isClosing) return;
    _isClosing = true;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => Center(
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 48,
                height: 48,
                child: CircularProgressIndicator(color: Color(0xFF10B981), strokeWidth: 3),
              ),
              const SizedBox(height: 16),
              Text(
                'Confirming Payment...',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Please wait while we update your wallet',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
        ),
      ),
    );

    try {
      final verification = await SquadService.verifyTransaction(reference: reference);
      if (verification.success && verification.status.toLowerCase() == 'success') {
        if (mounted) {
          Navigator.of(context).pop();
          Navigator.of(context).pop(reference);
        }
        return;
      }
    } catch (_) {}

    if (mounted) {
      Navigator.of(context).pop();
      Navigator.of(context).pop(reference);
    }
  }

  Future<void> _confirmCancel() async {
    final shouldCancel = await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFFEF4444).withOpacity(0.12),
              ),
              child: const Icon(Icons.close_rounded, color: Color(0xFFEF4444), size: 24),
            ),
            const SizedBox(height: 14),
            Text(
              'Cancel Payment?',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Your transaction will be cancelled. You can retry at any time.',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF94A3B8),
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
                          'Continue',
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
    final fmt = NumberFormat('#,##0.00');

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
          title: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
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
                  Row(
                    children: [
                      const Icon(Icons.lock_rounded, size: 10, color: Color(0xFF10B981)),
                      const SizedBox(width: 4),
                      Text(
                        '256-Bit Secure Encryption',
                        style: GoogleFonts.plusJakartaSans(
                          color: const Color(0xFF9CA3AF),
                          fontWeight: FontWeight.w700,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          actions: [
            if (_amount > 0)
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.35)),
                    ),
                    child: Text(
                      '₦${fmt.format(_amount)}',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF60A5FA),
                      ),
                    ),
                  ),
                ),
              ),
          ],
          centerTitle: false,
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(2),
            child: _isLoading
                ? LinearProgressIndicator(
                    value: _loadProgress > 0 ? _loadProgress : null,
                    backgroundColor: Colors.transparent,
                    color: const Color(0xFF2563EB),
                    minHeight: 2,
                  )
                : const SizedBox(height: 2),
          ),
        ),
        body: Container(
          color: Colors.white,
          child: Stack(
            children: [
              if (_controller != null)
                WebViewWidget(controller: _controller!),
              if (_isLoading && _loadProgress == 0.0)
                Container(
                  color: const Color(0xFF070B16),
                  child: Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const SizedBox(
                          width: 32,
                          height: 32,
                          child: CircularProgressIndicator(color: Color(0xFF2563EB), strokeWidth: 3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Connecting to Payment Gateway...',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Generating transfer account and card options',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../utils/api_config.dart';

/// A full-screen in-app WebView that loads the Squad checkout URL.
/// When Squad redirects to the configured [ApiConfig.squadCallbackUrl],
/// the reference query parameter is extracted and returned to the caller.
///
/// Returns the transaction reference if payment redirect is detected,
/// or null if the user dismisses the page without completing payment.
class SquadCheckoutSheet extends StatefulWidget {
  final String checkoutUrl;

  const SquadCheckoutSheet({super.key, required this.checkoutUrl});

  /// Push the checkout page as a full-screen route.
  /// Returns the reference string if redirect detected, null if cancelled.
  static Future<String?> show(BuildContext context, {required String checkoutUrl}) {
    return Navigator.of(context).push<String>(
      MaterialPageRoute(
        builder: (_) => SquadCheckoutSheet(checkoutUrl: checkoutUrl),
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

  @override
  void initState() {
    super.initState();

    // Delay controller creation until after first frame to ensure
    // the platform view has valid surface constraints on Android.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _isClosing) return;

      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onPageStarted: (_) {
              if (!_isClosing) setState(() => _isLoading = true);
            },
            onPageFinished: (_) {
              if (!_isClosing) setState(() => _isLoading = false);
            },
            onNavigationRequest: (request) {
              final uri = Uri.tryParse(request.url);
              if (uri != null) {
                const callbackBase = ApiConfig.squadCallbackUrl;
                final callbackHost = Uri.parse(callbackBase).host;
                // Check if this is a redirect to our callback URL
                if (uri.host == callbackHost) {
                  final reference = uri.queryParameters['transaction_ref'] ??
                      uri.queryParameters['reference'];
                  _handleRedirect(reference);
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

  void _handleRedirect(String? reference) {
    if (_isClosing) return;
    _isClosing = true;
    Navigator.of(context).pop(reference);
  }

  void _cancel() {
    if (_isClosing) return;
    _isClosing = true;
    Navigator.of(context).pop(null);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1F),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0F1F),
        elevation: 0,
        leading: IconButton(
          onPressed: _cancel,
          icon: const Icon(Icons.close, color: Colors.white70, size: 22),
        ),
        title: Text(
          'Complete Payment',
          style: GoogleFonts.plusJakartaSans(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 16,
          ),
        ),
        centerTitle: true,
      ),
      body: _controller == null
          ? const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF2563EB),
                strokeWidth: 3,
              ),
            )
          : Stack(
              children: [
                WebViewWidget(controller: _controller!),
                if (_isLoading)
                  const Center(
                    child: CircularProgressIndicator(
                      color: Color(0xFF2563EB),
                      strokeWidth: 3,
                    ),
                  ),
              ],
            ),
    );
  }
}

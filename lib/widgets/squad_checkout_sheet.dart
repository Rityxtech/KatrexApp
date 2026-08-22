import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../utils/api_config.dart';

/// A full-screen in-app payment window that loads the Squad checkout URL.
/// It injects modern responsive CSS & layout fixes to remove scattered borders,
/// fix overlapping text (such as email vs merchant name), and cleanly position
/// action buttons so they never collide or look misaligned.
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
  double _loadingProgress = 0.0;
  bool _isClosing = false;

  static const String _styleAndLayoutFixJs = r"""
(function() {
  const css = `
    /* Global Page Normalization */
    html, body {
      max-width: 100vw !important;
      overflow-x: hidden !important;
      font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Segoe UI", Roboto, sans-serif !important;
      -webkit-font-smoothing: antialiased !important;
      background: #FFFFFF !important;
      margin: 0 !important;
      padding: 0 !important;
    }

    /* Fix Header Layout & Collision (Merchant Name vs Email) */
    header, [class*="header"], [class*="merchant-info"], [class*="top-bar"], div:has(> [class*="merchant"]) {
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-start !important;
      justify-content: flex-start !important;
      gap: 4px !important;
      width: 100% !important;
      box-sizing: border-box !important;
      padding: 14px 18px !important;
      border-bottom: 1px solid #F1F5F9 !important;
      position: relative !important;
    }

    /* Fix Customer Email Overlap */
    [class*="email"], span:contains("@"), p:contains("@"), a:contains("@") {
      position: static !important;
      display: block !important;
      font-size: 13px !important;
      color: #64748B !important;
      font-weight: 500 !important;
      margin-top: 2px !important;
      word-break: break-all !important;
    }

    /* Clean Card & Account Box Styling (Removes retro offset black shadows) */
    [class*="account-details"], [class*="bank-box"], [class*="transfer-card"], [class*="details-box"],
    [class*="account-card"], div[style*="box-shadow"], div[style*="border:"] {
      border-radius: 16px !important;
      border: 1.5px solid #E2E8F0 !important;
      box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05) !important;
      padding: 16px 18px !important;
      margin: 16px 0 !important;
      background: #F8FAFC !important;
    }

    /* Remove jagged retro offset shadows across all elements */
    * {
      box-shadow: none !important;
    }
    div[class*="card"], div[class*="box"], [class*="account"] {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) !important;
    }

    /* Fix "Change Payment Method" floating button overlapping action button */
    [class*="change-payment"], [class*="switch-channel"], button[class*="change"], [class*="change-method"],
    div:has(> svg):has-text("Change payment method"), button:has-text("Change payment method"),
    div[class*="change-method-container"] {
      position: static !important;
      transform: none !important;
      margin: 16px auto 14px auto !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      border-radius: 12px !important;
      border: 1.5px solid #CBD5E1 !important;
      background: #FFFFFF !important;
      color: #334155 !important;
      padding: 10px 18px !important;
      font-weight: 700 !important;
      font-size: 13px !important;
      width: fit-content !important;
      max-width: 90% !important;
      cursor: pointer !important;
    }

    /* Fix Primary Action Buttons ("I have made the transfer", "Pay", etc.) */
    button[type="submit"], [class*="submit-btn"], [class*="pay-btn"], [class*="action-btn"],
    button[class*="primary"], button:has-text("I have made the transfer") {
      position: static !important;
      border-radius: 14px !important;
      font-weight: 800 !important;
      padding: 15px 20px !important;
      font-size: 15px !important;
      letter-spacing: -0.2px !important;
      width: 100% !important;
      margin-top: 14px !important;
      margin-bottom: 8px !important;
      box-sizing: border-box !important;
      background: #2563EB !important;
      color: #FFFFFF !important;
      border: none !important;
      box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25) !important;
      cursor: pointer !important;
    }

    /* Fix Account Number & Details Font */
    [class*="account-number"], [class*="account-no"] {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
      font-size: 18px !important;
      font-weight: 800 !important;
      letter-spacing: 0.5px !important;
      color: #0F172A !important;
    }

    /* Clean spacing for instructions and notes */
    [class*="note"], [class*="alert"], [class*="warning"] {
      font-size: 12px !important;
      line-height: 1.5 !important;
      color: #64748B !important;
      margin: 8px 0 !important;
    }

    /* Footer Logo & Badge */
    footer, [class*="footer"], [class*="secured-by"] {
      margin-top: 24px !important;
      padding-bottom: 24px !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
    }
  `;

  // Inject or update stylesheet
  let styleEl = document.getElementById('katrex-squad-cleanup');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'katrex-squad-cleanup';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;

  // DOM node cleanup
  function cleanDom() {
    // 1. Fix all buttons with overlapping fixed positioning
    const allButtons = document.querySelectorAll('button, div[role="button"], a');
    allButtons.forEach(btn => {
      const text = (btn.textContent || '').trim();
      if (text.includes('Change payment method') || text.includes('Change method')) {
        btn.style.position = 'static';
        btn.style.margin = '16px auto';
        btn.style.display = 'flex';
        btn.style.zIndex = '1';
      }
      if (text.includes('I have made the transfer') || text.includes('Confirm Payment')) {
        btn.style.position = 'static';
        btn.style.marginTop = '14px';
        btn.style.marginBottom = '8px';
      }
    });

    // 2. Fix email text absolute positioning
    const allTexts = document.querySelectorAll('span, p, h1, h2, h3, h4, h5, h6, div');
    allTexts.forEach(el => {
      const style = window.getComputedStyle(el);
      if (style.position === 'absolute' && el.textContent && el.textContent.includes('@')) {
        el.style.position = 'static';
        el.style.display = 'block';
        el.style.marginTop = '4px';
      }
    });
  }

  cleanDom();

  // Run on dynamic mutations
  if (!window._katrexObserver) {
    window._katrexObserver = new MutationObserver(() => {
      cleanDom();
    });
    window._katrexObserver.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    });
  }
})();
""";

  @override
  void initState() {
    super.initState();

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted || _isClosing) return;

      _controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setNavigationDelegate(
          NavigationDelegate(
            onProgress: (progress) {
              if (!mounted || _isClosing) return;
              setState(() {
                _loadingProgress = progress / 100.0;
                if (progress >= 100) _isLoading = false;
              });
              if (progress > 60) {
                _injectCleanStyles();
              }
            },
            onPageStarted: (_) {
              if (!_isClosing && mounted) {
                setState(() => _isLoading = true);
                _injectCleanStyles();
              }
            },
            onPageFinished: (_) {
              if (!_isClosing && mounted) {
                setState(() => _isLoading = false);
                _injectCleanStyles();
              }
            },
            onNavigationRequest: (request) {
              final uri = Uri.tryParse(request.url);
              if (uri != null) {
                const callbackBase = ApiConfig.squadCallbackUrl;
                final callbackHost = Uri.parse(callbackBase).host;
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

  void _injectCleanStyles() {
    try {
      _controller?.runJavaScript(_styleAndLayoutFixJs);
    } catch (_) {}
  }

  void _handleRedirect(String? reference) {
    if (_isClosing) return;
    _isClosing = true;
    Navigator.of(context).pop(reference);
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
                color: const Color(0xFFF59E0B).withOpacity(0.12),
                border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
              ),
              child: const Icon(Icons.help_outline_rounded, color: Color(0xFFF59E0B), size: 24),
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
              'Your transaction is currently in progress. If you exit now, this payment session will be cancelled.',
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
                          'Yes, Cancel',
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
        backgroundColor: const Color(0xFF0A0F1F),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0A0F1F),
          elevation: 0,
          leading: IconButton(
            onPressed: _confirmCancel,
            icon: Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.06),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Center(
                child: Icon(Icons.close_rounded, color: Colors.white70, size: 18),
              ),
            ),
          ),
          title: Column(
            children: [
              Text(
                'Complete Payment',
                style: GoogleFonts.plusJakartaSans(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
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
                    '256-Bit SSL Encrypted',
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
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(2),
            child: _isLoading
                ? LinearProgressIndicator(
                    value: _loadingProgress > 0 ? _loadingProgress : null,
                    backgroundColor: Colors.white10,
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF2563EB)),
                    minHeight: 2,
                  )
                : const SizedBox(height: 2),
          ),
        ),
        body: SafeArea(
          bottom: false,
          child: Container(
            margin: const EdgeInsets.only(top: 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
            ),
            clipBehavior: Clip.antiAlias,
            child: _controller == null
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
                        Container(
                          color: Colors.white,
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const CircularProgressIndicator(
                                  color: Color(0xFF2563EB),
                                  strokeWidth: 3,
                                ),
                                const SizedBox(height: 16),
                                Text(
                                  'Loading secure checkout...',
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
          ),
        ),
      ),
    );
  }
}

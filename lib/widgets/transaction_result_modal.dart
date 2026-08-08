import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';

Future<void> showTransactionResultModal({
  required BuildContext context,
  required bool success,
  required String title,
  required String subtitle,
  required double amount,
  required String recipient,
  required String network,
  required String reference,
  required String paymentMethod,
  String? errorMessage,
}) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: Colors.transparent,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    builder: (ctx) => _TransactionResultSheet(
      success: success,
      title: title,
      subtitle: subtitle,
      amount: amount,
      recipient: recipient,
      network: network,
      reference: reference,
      paymentMethod: paymentMethod,
      errorMessage: errorMessage,
    ),
  );
}

class _TransactionResultSheet extends StatefulWidget {
  final bool success;
  final String title;
  final String subtitle;
  final double amount;
  final String recipient;
  final String network;
  final String reference;
  final String paymentMethod;
  final String? errorMessage;

  const _TransactionResultSheet({
    required this.success,
    required this.title,
    required this.subtitle,
    required this.amount,
    required this.recipient,
    required this.network,
    required this.reference,
    required this.paymentMethod,
    this.errorMessage,
  });

  @override
  State<_TransactionResultSheet> createState() => _TransactionResultSheetState();
}

class _TransactionResultSheetState extends State<_TransactionResultSheet>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _scaleAnim;
  final ScreenshotController _screenshotController = ScreenshotController();
  bool _isSharing = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _scaleAnim = CurvedAnimation(parent: _animController, curve: Curves.elasticOut);
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _shareReceipt() async {
    setState(() => _isSharing = true);
    try {
      final image = await _screenshotController.capture();
      if (image != null) {
        final dir = await getTemporaryDirectory();
        final file = await File('${dir.path}/katrex_receipt.png').writeAsBytes(image);
        await Share.shareXFiles(
          [XFile(file.path)],
          text: 'Katrex Transaction Receipt',
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to share: $e', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSharing = false);
    }
  }

  void _report() {
    Navigator.of(context).pop();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'You can report this issue from the Support tab',
          style: GoogleFonts.plusJakartaSans(),
        ),
        backgroundColor: const Color(0xFF2563EB),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final successColor = const Color(0xFF10B981);
    final errorColor = const Color(0xFFEF4444);
    final accent = widget.success ? successColor : errorColor;
    final fmt = NumberFormat('#,##0');

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0A0F1F),
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // ─── Drag handle ──────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.only(top: 12),
            child: Container(
              width: 48, height: 6,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(3),
              ),
            ),
          ),

          // ─── Screenshot area (receipt) ────────────────────────────
          Screenshot(
            controller: _screenshotController,
            child: Container(
              color: const Color(0xFF0A0F1F),
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // ─── Icon + Title + Subtitle in a row ────────────────
                  Row(
                    children: [
                      ScaleTransition(
                        scale: _scaleAnim,
                        alignment: Alignment.center,
                        child: Container(
                          width: 52, height: 52,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: accent.withOpacity(0.12),
                            border: Border.all(color: accent.withOpacity(0.3), width: 2),
                          ),
                          child: Icon(
                            widget.success ? Icons.check_rounded : Icons.close_rounded,
                            color: accent, size: 28,
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.title,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.subtitle,
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF9CA3AF),
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  if (widget.errorMessage != null && !widget.success) ...[
                    const SizedBox(height: 12),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: errorColor.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: errorColor.withOpacity(0.15)),
                      ),
                      child: Text(
                        widget.errorMessage!,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: errorColor.withOpacity(0.9),
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  // ─── Compact details: 2-column grid ──────────────────
                  _buildCompactDetails(accent, fmt),

                  const SizedBox(height: 14),

                  // ─── Katrex branding ─────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 5, height: 5,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF2563EB),
                        ),
                      ),
                      const SizedBox(width: 5),
                      Text(
                        'Katrex',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF2563EB),
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // ─── Buttons ──────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
            child: widget.success
                ? Row(
                    children: [
                      Expanded(
                        child: _buildButton(
                          label: 'Report',
                          icon: Icons.report_outlined,
                          color: Colors.white.withOpacity(0.06),
                          textColor: const Color(0xFF9CA3AF),
                          onTap: _report,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildButton(
                          label: _isSharing ? 'Sharing...' : 'Share',
                          icon: _isSharing
                              ? Icons.hourglass_top_rounded
                              : Icons.ios_share_rounded,
                          color: accent,
                          textColor: Colors.white,
                          onTap: _isSharing ? null : _shareReceipt,
                        ),
                      ),
                    ],
                  )
                : _buildButton(
                    label: 'Report Issue',
                    icon: Icons.report_outlined,
                    color: errorColor,
                    textColor: Colors.white,
                    onTap: _report,
                    isCentered: true,
                  ),
          ),

          // ─── Close button ──────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 10),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => Navigator.of(context).pop(),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Center(
                  child: Text(
                    'Close',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF9CA3AF),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCompactDetails(Color accent, NumberFormat fmt) {
    final timeFmt = DateFormat('MMM d, h:mm a');
    final now = DateTime.now();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        children: [
          // Amount row — highlighted
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Amount',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, fontWeight: FontWeight.w600,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
              Text(
                '\u20A6${fmt.format(widget.amount)}',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 16, fontWeight: FontWeight.w900,
                  color: const Color(0xFF34D399),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // 2-column grid for the rest
          Row(
            children: [
              Expanded(child: _miniDetail('Recipient', widget.recipient)),
              const SizedBox(width: 12),
              Expanded(child: _miniDetail('Network', widget.network)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _miniDetail('Payment', widget.paymentMethod.capitalize())),
              const SizedBox(width: 12),
              Expanded(child: _miniDetail('Date', timeFmt.format(now))),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: _miniDetail('Ref', widget.reference, isMono: true)),
              const SizedBox(width: 12),
              Expanded(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Status',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11, fontWeight: FontWeight.w600,
                        color: const Color(0xFF9CA3AF),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: accent.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        widget.success ? 'Successful' : 'Failed',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 11, fontWeight: FontWeight.w800,
                          color: accent,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniDetail(String label, String value, {bool isMono = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 11, fontWeight: FontWeight.w600,
            color: const Color(0xFF9CA3AF),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13, fontWeight: FontWeight.w700,
            color: Colors.white,
            letterSpacing: isMono ? 0.3 : 0,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }

  Widget _buildButton({
    required String label,
    required IconData icon,
    required Color color,
    required Color textColor,
    required VoidCallback? onTap,
    bool isCentered = false,
  }) {
    final btn = GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: textColor, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13, fontWeight: FontWeight.w800,
                color: textColor,
              ),
            ),
          ],
        ),
      ),
    );

    if (isCentered) {
      return Center(
        child: FractionallySizedBox(
          widthFactor: 0.6,
          child: btn,
        ),
      );
    }

    return btn;
  }
}

extension on String {
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1)}';
  }
}

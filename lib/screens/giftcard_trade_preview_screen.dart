import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../widgets/app_background.dart';

class GiftcardTradePreviewScreen extends StatefulWidget {
  final String? tradeId;
  final String? brandName;
  final double? cardValue;
  final String? currency;
  final double? rateApplied;
  final double? payoutAmount;
  final String? cardType;
  final List<String>? cardImageUrls;
  final String? ecode;
  final String? status;
  final DateTime? createdAt;

  const GiftcardTradePreviewScreen({
    super.key,
    this.tradeId,
    this.brandName,
    this.cardValue,
    this.currency,
    this.rateApplied,
    this.payoutAmount,
    this.cardType,
    this.cardImageUrls,
    this.ecode,
    this.status,
    this.createdAt,
  });

  @override
  State<GiftcardTradePreviewScreen> createState() => _GiftcardTradePreviewScreenState();
}

class _GiftcardTradePreviewScreenState extends State<GiftcardTradePreviewScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _slideCtrl;
  late final Animation<Offset> _slideAnim;
  bool _showToast = false;

  @override
  void initState() {
    super.initState();
    _slideCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(1, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _slideCtrl,
      curve: const Cubic(0.16, 1, 0.3, 1),
    ));
    _slideCtrl.forward();
  }

  @override
  void dispose() {
    _slideCtrl.dispose();
    super.dispose();
  }

  String get _displayTradeId {
    if (widget.tradeId != null && widget.tradeId!.isNotEmpty) {
      return widget.tradeId!.length > 10
          ? 'KTRX-${widget.tradeId!.substring(0, 8).toUpperCase()}'
          : 'KTRX-${widget.tradeId!.toUpperCase()}';
    }
    return 'KTRX-99482';
  }

  void _copyId() {
    Clipboard.setData(ClipboardData(text: _displayTradeId));
    setState(() => _showToast = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _showToast = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          AnimatedBuilder(
            animation: _slideAnim,
            builder: (context, child) {
              return SlideTransition(
                position: _slideAnim,
                child: child,
              );
            },
            child: SafeArea(
              child: Column(
                children: [
                  _buildHeader(),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.fromLTRB(16, 4, 16, 120),
                      children: [
                        _buildStatusCard(),
                        const SizedBox(height: 12),
                        _buildSummaryReceipt(),
                        const SizedBox(height: 12),
                        _buildUploadedAssets(),
                        const SizedBox(height: 12),
                        _buildInfoText(),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          _buildBottomActions(),
          _buildCopyToast(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: const Center(
                    child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18),
                  ),
                ),
              ),
            ),
          ),
          Text(
            'Trade #$_displayTradeId',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: Colors.white,
              letterSpacing: -0.2,
            ),
          ),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                  child: const Center(
                    child: Icon(Icons.close_rounded, color: Colors.white, size: 16),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusCard() {
    final payout = widget.payoutAmount ?? 125000.0;
    
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF09090B), Color(0xFF18181B)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF27272A)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2563EB).withOpacity(0.2),
            blurRadius: 25,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildPulseDot(),
                    const SizedBox(width: 4),
                    Text(
                      'UNDER REVIEW',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFFF59E0B),
                        letterSpacing: 1,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                'Est. 2 - 5 mins',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 8,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Expected Payout',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF9CA3AF),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '₦${NumberFormat('#,##0').format(payout)}',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 28,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF34D399),
              letterSpacing: -0.5,
              height: 1,
            ),
          ),
          const SizedBox(height: 16),
          _buildProgressTracker(),
        ],
      ),
    );
  }

  Widget _buildPulseDot() {
    return Container(
      width: 6,
      height: 6,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
        color: Color(0xFFF59E0B),
      ),
    );
  }

  Widget _buildProgressTracker() {
    return Row(
      children: [
        Container(
          width: 16,
          height: 16,
          decoration: const BoxDecoration(
            shape: BoxShape.circle,
            color: Color(0xFF10B981),
          ),
          child: const Center(
            child: Icon(Icons.check_rounded, color: Colors.white, size: 8),
          ),
        ),
        Expanded(
          child: Container(height: 2, color: const Color(0xFF10B981)),
        ),
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFFF59E0B),
            border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3), width: 2),
          ),
          child: const Center(
            child: Icon(Icons.refresh_rounded, color: Colors.white, size: 8),
          ),
        ),
        Expanded(
          child: Container(height: 2, color: const Color(0xFF27272A)),
        ),
        Container(
          width: 16,
          height: 16,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: const Color(0xFF27272A),
            border: Border.all(color: const Color(0xFF52525B)),
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryReceipt() {
    final brand = widget.brandName ?? 'Apple';
    final cardVal = widget.cardValue ?? 100.0;
    final curr = widget.currency ?? 'USD';
    final sym = curr == 'USD' ? '\$' : curr == 'GBP' ? '£' : '€';
    final rate = widget.rateApplied ?? 1250.0;
    final typeStr = widget.cardType == 'ecode' ? 'E-Code / Digital PIN' : 'Physical Card';
    final dateStr = DateFormat('MMM d, hh:mm a').format(widget.createdAt ?? DateTime.now());

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            'TRADE SUMMARY',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF9CA3AF),
              letterSpacing: 1.5,
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.95),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F172A).withOpacity(0.04),
                blurRadius: 15,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              _buildReceiptRow(
                label: 'Asset Type',
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$brand ($sym${cardVal.toStringAsFixed(0)})',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF09090B),
                      ),
                    ),
                  ],
                ),
              ),
              _buildReceiptRow(
                label: 'Card Format',
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    typeStr,
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF09090B),
                    ),
                  ),
                ),
              ),
              _buildReceiptRow(
                label: 'Exchange Rate',
                child: Text(
                  '₦${NumberFormat('#,##0').format(rate)} / $sym1',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF2563EB),
                  ),
                ),
              ),
              GestureDetector(
                onTap: _copyId,
                child: _buildReceiptRow(
                  label: 'Trade ID',
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _displayTradeId,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF09090B),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.copy_rounded, color: Color(0xFF09090B), size: 10),
                    ],
                  ),
                ),
              ),
              _buildReceiptRow(
                label: 'Submitted',
                child: Text(
                  dateStr,
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF09090B),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReceiptRow({required String label, required Widget child}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: const BoxDecoration(
        border: Border(
          bottom: BorderSide(color: Color(0xFFCBD5E1), width: 0.5, style: BorderStyle.solid),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 9.5,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF64748B),
            ),
          ),
          child,
        ],
      ),
    );
  }

  Widget _buildUploadedAssets() {
    final images = widget.cardImageUrls ?? [];
    final ecode = widget.ecode;

    if (widget.cardType == 'ecode' || (ecode != null && ecode.isNotEmpty)) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: 6),
            child: Text(
              'SUBMITTED E-CODE PIN',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                color: const Color(0xFF9CA3AF),
                letterSpacing: 1.5,
              ),
            ),
          ),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white.withOpacity(0.1)),
            ),
            child: Text(
              ecode ?? 'No code provided',
              style: GoogleFonts.robotoMono(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF34D399),
                letterSpacing: 1,
              ),
            ),
          ),
        ],
      );
    }

    if (images.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 6),
          child: Text(
            'UPLOADED ASSETS (${images.length})',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF9CA3AF),
              letterSpacing: 1.5,
            ),
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: images.map((url) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _buildAssetThumb(url),
            )).toList(),
          ),
        ),
      ],
    );
  }

  Widget _buildAssetThumb(String imageUrl) {
    return Container(
      width: 72,
      height: 54,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.3)),
        image: DecorationImage(
          image: NetworkImage(imageUrl),
          fit: BoxFit.cover,
          colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.2), BlendMode.darken),
        ),
      ),
      child: Center(
        child: Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: ClipOval(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 4, sigmaY: 4),
              child: const Center(
                child: Icon(Icons.zoom_in_rounded, color: Colors.white, size: 10),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInfoText() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Text(
        'You will be notified via push once an admin reviews this trade. Please do not submit this card anywhere else.',
        textAlign: TextAlign.center,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 8.5,
          fontWeight: FontWeight.w700,
          color: const Color(0xFF94A3B8),
          height: 1.5,
        ),
      ),
    );
  }

  Widget _buildBottomActions() {
    return Positioned(
      left: 0,
      right: 0,
      bottom: 0,
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.bottomCenter,
            end: Alignment.topCenter,
            colors: [
              const Color(0xFF0A1128),
              const Color(0xFF0A1128).withOpacity(0.9),
              Colors.transparent,
            ],
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            GestureDetector(
              onTap: () => Navigator.of(context).popUntil((route) => route.isFirst),
              child: Container(
                width: double.infinity,
                height: 46,
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.4),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.home_rounded, color: Colors.white, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      'Return to Dashboard',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCopyToast() {
    return AnimatedPositioned(
      duration: const Duration(milliseconds: 300),
      top: _showToast ? 56 : 40,
      left: 0,
      right: 0,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 300),
        opacity: _showToast ? 1 : 0,
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF09090B),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_rounded, color: Color(0xFF34D399), size: 12),
                const SizedBox(width: 4),
                Text(
                  'Copied ID!',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
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

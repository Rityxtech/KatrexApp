import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../widgets/app_background.dart';
import 'giftcard_trade_preview_screen.dart';
import 'sell_giftcard_screen.dart';

class GiftcardTradesHistoryScreen extends StatefulWidget {
  const GiftcardTradesHistoryScreen({super.key});

  @override
  State<GiftcardTradesHistoryScreen> createState() => _GiftcardTradesHistoryScreenState();
}

class _GiftcardTradesHistoryScreenState extends State<GiftcardTradesHistoryScreen> {
  int _selectedFilterIndex = 0; // 0: All, 1: Pending, 2: Approved, 3: Rejected
  final List<String> _filterTabs = ['All', 'Pending', 'Approved', 'Rejected'];

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final uid = authProvider.firebaseUser?.uid;

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(context),
                _buildFilterChips(),
                const SizedBox(height: 12),
                Expanded(
                  child: uid == null
                      ? _buildNotLoggedInState()
                      : _buildTradesList(uid),
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
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      child: Row(
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
                    child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 20),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'My Giftcard Trades',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.2,
                ),
              ),
              Text(
                'Track live statuses & payouts',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChips() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.4),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.05)),
        ),
        child: Row(
          children: List.generate(_filterTabs.length, (index) {
            final isSelected = _selectedFilterIndex == index;
            return Expanded(
              child: GestureDetector(
                onTap: () => setState(() => _selectedFilterIndex = index),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: isSelected ? const Color(0xFF2563EB).withOpacity(0.25) : Colors.transparent,
                    borderRadius: BorderRadius.circular(10),
                    border: isSelected ? Border.all(color: const Color(0xFF2563EB).withOpacity(0.5)) : null,
                  ),
                  child: Center(
                    child: Text(
                      _filterTabs[index],
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: isSelected ? FontWeight.w900 : FontWeight.w700,
                        color: isSelected ? const Color(0xFF60A5FA) : const Color(0xFF9CA3AF),
                      ),
                    ),
                  ),
                ),
              ),
            );
          }),
        ),
      ),
    );
  }

  Widget _buildTradesList(String uid) {
    return StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
      stream: FirebaseFirestore.instance
          .collection('giftcard_trades')
          .where('uid', isEqualTo: uid)
          .snapshots(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting && !snapshot.hasData) {
          return Center(
            child: CircularProgressIndicator(color: const Color(0xFF2563EB).withOpacity(0.8)),
          );
        }

        if (snapshot.hasError) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Text(
                'Could not load trades: ${snapshot.error}',
                style: GoogleFonts.plusJakartaSans(color: Colors.white60, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ),
          );
        }

        final docs = snapshot.data?.docs ?? [];
        
        // Client-side sort by createdAt descending
        final sortedDocs = List<QueryDocumentSnapshot<Map<String, dynamic>>>.from(docs);
        sortedDocs.sort((a, b) {
          final tA = a.data()['createdAt'];
          final tB = b.data()['createdAt'];
          final dateA = tA is Timestamp ? tA.toDate() : DateTime(1970);
          final dateB = tB is Timestamp ? tB.toDate() : DateTime(1970);
          return dateB.compareTo(dateA);
        });

        // Filter by selected tab
        final filteredDocs = sortedDocs.where((doc) {
          final data = doc.data();
          final status = (data['status'] as String? ?? 'pending').toLowerCase();
          if (_selectedFilterIndex == 1) return status == 'pending';
          if (_selectedFilterIndex == 2) return status == 'approved';
          if (_selectedFilterIndex == 3) return status == 'rejected';
          return true;
        }).toList();

        if (filteredDocs.isEmpty) {
          return _buildEmptyState();
        }

        return ListView.separated(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
          itemCount: filteredDocs.length,
          separatorBuilder: (_, __) => const SizedBox(height: 12),
          itemBuilder: (context, index) {
            final doc = filteredDocs[index];
            final tradeId = doc.id;
            final data = doc.data();
            return _buildTradeCard(context, tradeId, data);
          },
        );
      },
    );
  }

  Widget _buildTradeCard(BuildContext context, String tradeId, Map<String, dynamic> data) {
    final status = (data['status'] as String? ?? 'pending').toLowerCase();
    final brandName = data['brandName'] as String? ?? 'Giftcard';
    final cardType = (data['cardType'] as String? ?? 'physical').toLowerCase();
    final cardValue = (data['cardValue'] as num?)?.toDouble() ?? 0.0;
    final currency = data['currency'] as String? ?? 'USD';
    final payoutAmount = (data['payoutAmount'] as num?)?.toDouble() ?? 0.0;
    final rateApplied = (data['rateApplied'] as num?)?.toDouble() ?? 0.0;
    final cardValueAdjusted = data['cardValueAdjusted'] == true;
    final payoutAdjusted = data['payoutAdjusted'] == true;
    final rejectionReason = data['rejectionReason'] as String? ?? data['adminComment'] as String?;

    DateTime? createdAt;
    if (data['createdAt'] is Timestamp) {
      createdAt = (data['createdAt'] as Timestamp).toDate();
    }

    Color statusColor;
    Color statusBg;
    String statusLabel;
    IconData statusIcon;

    if (status == 'approved') {
      statusColor = const Color(0xFF10B981);
      statusBg = const Color(0xFF10B981).withOpacity(0.15);
      statusLabel = 'APPROVED / PAID';
      statusIcon = Icons.check_circle_rounded;
    } else if (status == 'rejected') {
      statusColor = const Color(0xFFEF4444);
      statusBg = const Color(0xFFEF4444).withOpacity(0.15);
      statusLabel = 'REJECTED';
      statusIcon = Icons.cancel_rounded;
    } else {
      statusColor = const Color(0xFFF59E0B);
      statusBg = const Color(0xFFF59E0B).withOpacity(0.15);
      statusLabel = 'IN REVIEW';
      statusIcon = Icons.hourglass_top_rounded;
    }

    final currencySymbol = currency == 'GBP' ? '£' : (currency == 'EUR' ? '€' : '\$');

    return GestureDetector(
      onTap: () {
        final List<String> imageUrls = [];
        if (data['cardImageUrls'] is List) {
          imageUrls.addAll((data['cardImageUrls'] as List).map((e) => e.toString()));
        }

        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => GiftcardTradePreviewScreen(
              tradeId: tradeId,
              brandName: brandName,
              cardValue: cardValue,
              currency: currency,
              rateApplied: rateApplied,
              payoutAmount: payoutAmount,
              cardType: cardType,
              cardImageUrls: imageUrls,
              ecode: data['ecode'] as String?,
              status: status,
              createdAt: createdAt,
            ),
          ),
        );
      },
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Row: Brand, Type & Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF2563EB).withOpacity(0.15),
                        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                      ),
                      child: const Center(
                        child: Icon(Icons.card_giftcard_rounded, size: 18, color: Color(0xFF60A5FA)),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          brandName,
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                        Text(
                          cardType == 'ecode' ? 'Digital E-Code' : 'Physical Card',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF9CA3AF),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      Icon(statusIcon, color: statusColor, size: 12),
                      const SizedBox(width: 4),
                      Text(
                        statusLabel,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: statusColor,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Mid Row: Face Value, Payout & Adjustment Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.04)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Face Value',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF9CA3AF),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$currencySymbol${NumberFormat('#,##0.00').format(cardValue)} $currency',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Row(
                        children: [
                          if (cardValueAdjusted || payoutAdjusted)
                            Container(
                              margin: const EdgeInsets.only(right: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF59E0B).withOpacity(0.2),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                'ADJUSTED',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 8,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFFF59E0B),
                                ),
                              ),
                            ),
                          Text(
                            'Estimated Payout',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '₦${NumberFormat('#,##0').format(payoutAmount)}',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF60A5FA),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Rejection / Note banner if present
            if (rejectionReason != null && rejectionReason.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: (status == 'rejected' ? const Color(0xFFEF4444) : const Color(0xFFF59E0B)).withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: (status == 'rejected' ? const Color(0xFFEF4444) : const Color(0xFFF59E0B)).withOpacity(0.2)),
                ),
                child: Text(
                  'Admin Note: $rejectionReason',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: status == 'rejected' ? const Color(0xFFFCA5A5) : const Color(0xFFFDE68A),
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],

            const SizedBox(height: 8),
            // Bottom Row: Trade Reference & Date
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'ID: KTRX-${tradeId.length > 8 ? tradeId.substring(0, 8).toUpperCase() : tradeId.toUpperCase()}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF6B7280),
                  ),
                ),
                if (createdAt != null)
                  Text(
                    DateFormat('MMM d, yyyy · hh:mm a').format(createdAt),
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF6B7280),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: const Center(
                child: Icon(Icons.receipt_long_rounded, size: 28, color: Color(0xFF9CA3AF)),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'No trades found',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'You haven\'t submitted any giftcard trades in this category yet.',
              textAlign: TextAlign.center,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF9CA3AF),
              ),
            ),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const SellGiftcardScreen()),
                );
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Sell a Giftcard',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotLoggedInState() {
    return Center(
      child: Text(
        'Please sign in to view your trades.',
        style: GoogleFonts.plusJakartaSans(color: Colors.white60, fontSize: 13),
      ),
    );
  }
}

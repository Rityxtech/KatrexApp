import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../providers/auth_provider.dart';
import '../providers/referral_provider.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/shared_bottom_nav.dart';

class ReferralScreen extends StatefulWidget {
  final ValueChanged<int>? onTabSwitch;
  const ReferralScreen({super.key, this.onTabSwitch});

  @override
  State<ReferralScreen> createState() => _ReferralScreenState();
}

class _ReferralScreenState extends State<ReferralScreen> {
  bool _copyToastVisible = false;
  
  String get _referralCode => context.read<AuthProvider>().userModel?.referralCode ?? 'KAT-XXX';

  void _copyCode() {
    Clipboard.setData(ClipboardData(text: _referralCode));
    setState(() => _copyToastVisible = true);
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copyToastVisible = false);
    });
  }

  void _showClaimSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => _buildClaimSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ReferralProvider>();
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
                Expanded(
                  child: provider.isLoading
                      ? const Center(child: CircularProgressIndicator(color: Colors.white))
                      : ListView(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                          children: [
                            _buildHeroCard(provider),
                            const SizedBox(height: 20),
                            _buildShareLinkSection(),
                            const SizedBox(height: 20),
                            _buildAnalyticsGrid(provider),
                            const SizedBox(height: 20),
                            _buildHowItWorks(),
                            const SizedBox(height: 20),
                            _buildReferralHistory(provider),
                          ],
                        ),
                ),
              ],
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 10,
            child: SharedBottomNav(
              selectedIndex: 0,
              onTap: (index) {
                if (widget.onTabSwitch != null) {
                  widget.onTabSwitch!(index);
                }
                Navigator.pop(context);
              },
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
                  child: const Center(
                    child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18),
                  ),
                ),
              ),
            ),
          ),
          Text(
            'Refer & Earn',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5),
          ),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildHeroCard(ReferralProvider provider) {
    final claimable = provider.claimableBalance;
    final total = provider.totalEarned;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            const Color(0xFF10B981).withOpacity(0.1),
            const Color(0xFFEAB308).withOpacity(0.05)
          ],
        ),
        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
        boxShadow: [
          BoxShadow(
              color: const Color(0xFF10B981).withOpacity(0.15),
              blurRadius: 28,
              offset: const Offset(0, 7))
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Stack(
          children: [
            Positioned(
              top: -14,
              right: -14,
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF10B981).withOpacity(0.2),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.card_giftcard_rounded, size: 14, color: Color(0xFF34D399)),
                      const SizedBox(width: 6),
                      Text(
                        'CLAIMABLE BALANCE',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF34D399),
                            letterSpacing: 1.5),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '₦' + NumberFormat('#,##0').format(claimable),
                    style: GoogleFonts.plusJakartaSans(
                        fontSize: 36,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -1,
                        height: 1.0),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.only(top: 12),
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: const Color(0xFF10B981).withOpacity(0.2))),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'TOTAL EARNED LIFETIME',
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF9CA3AF),
                                  letterSpacing: 1.0),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '₦' + NumberFormat('#,##0').format(total),
                              style: GoogleFonts.plusJakartaSans(
                                  fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                            ),
                          ],
                        ),
                        GestureDetector(
                          onTap: claimable > 0 ? _showClaimSheet : null,
                          child: Opacity(
                            opacity: claimable > 0 ? 1.0 : 0.5,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981),
                                borderRadius: BorderRadius.circular(12),
                                boxShadow: claimable > 0
                                    ? [
                                        BoxShadow(
                                            color: const Color(0xFF10B981).withOpacity(0.3),
                                            blurRadius: 15,
                                            offset: const Offset(0, 4))
                                      ]
                                    : [],
                              ),
                              child: Text(
                                'Claim Rewards',
                                style: GoogleFonts.plusJakartaSans(
                                    fontSize: 14, fontWeight: FontWeight.w900, color: Colors.black),
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
      ),
    );
  }

  Widget _buildShareLinkSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'YOUR INVITE CODE',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5),
          ),
        ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 8, 8, 8),
          decoration: BoxDecoration(
            color: const Color(0xFF0A0F1F).withOpacity(0.6),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      _referralCode,
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 3.0),
                    ),
                  ),
                  GestureDetector(
                    onTap: _copyCode,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                      child: const Center(
                        child: Icon(Icons.copy_rounded, size: 14, color: Color(0xFFD1D5DB)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: () {
                      Share.share(
                        'Join me on Katrex and trade crypto instantly! Use my referral code: $_referralCode',
                      );
                    },
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB),
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                              color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 10)
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.share_rounded, size: 14, color: Colors.white),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        AnimatedOpacity(
          opacity: _copyToastVisible ? 1.0 : 0.0,
          duration: const Duration(milliseconds: 200),
          child: Padding(
            padding: const EdgeInsets.only(left: 4, top: 4),
            child: Text(
              'Copied to clipboard!',
              style: GoogleFonts.plusJakartaSans(
                  fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF34D399)),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAnalyticsGrid(ReferralProvider provider) {
    final total = provider.totalReferrals;
    final qualified = provider.qualifiedCount;
    final pending = provider.pendingCount;
    final rate = total > 0 ? (qualified / total * 100).toStringAsFixed(1) + '%' : '0.0%';

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 2.3,
      children: [
        _analyticsCard('$total', 'Total Invited', Icons.people_rounded, Colors.white, Colors.white, null),
        _analyticsCard('$qualified', 'Qualified (Paid)', Icons.verified_user_rounded, Colors.white, const Color(0xFF34D399), const Color(0xFF10B981).withOpacity(0.2)),
        _analyticsCard('$pending', 'Pending Actions', Icons.hourglass_top_rounded, Colors.white, Colors.white, null),
        _analyticsCard(rate, 'Conversion Rate', Icons.trending_up_rounded, Colors.white, Colors.white, null),
      ],
    );
  }

  Widget _analyticsCard(
      String value, String label, IconData? icon, Color? iconColor, Color valueColor, Color? borderColor) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: borderColor ?? Colors.white.withOpacity(0.08)),
      ),
      child: Stack(
        children: [
          if (icon != null)
            Positioned(
              top: 0,
              right: 0,
              child: Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: (iconColor ?? Colors.white).withOpacity(0.1),
                ),
                child: Center(
                  child: Icon(icon, size: 12, color: iconColor ?? Colors.white),
                ),
              ),
            ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                value,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 20, fontWeight: FontWeight.w900, color: valueColor),
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHowItWorks() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'HOW TO UNLOCK ₦1,500',
            style: GoogleFonts.plusJakartaSans(
                fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: Column(
            children: [
              _buildStepRow(1, 'Share Your Link', 'Friend signs up using your invite code.', true, false),
              const SizedBox(height: 16),
              _buildStepRow(2, 'Friend Completes First Trade', 'Friend must verify KYC and make a transaction of ₦1,000 or more to unlock your reward.', false, true),
              const SizedBox(height: 16),
              _buildStepRow(3, 'Claim Your Bonus', 'Tap claim to credit the bonus to your wallet.', false, false),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildStepRow(int step, String title, String desc, bool done, bool active) {
    Color circleColor;
    Widget circleChild;
    if (done) {
      circleColor = const Color(0xFF10B981);
      circleChild = const Icon(Icons.check, size: 8, color: Colors.black);
    } else if (active) {
      circleColor = const Color(0xFF2563EB).withOpacity(0.2);
      circleChild = Text(
        '$step',
        style: GoogleFonts.plusJakartaSans(
            fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA)),
      );
    } else {
      circleColor = Colors.white.withOpacity(0.05);
      circleChild = Text(
        '$step',
        style: GoogleFonts.plusJakartaSans(
            fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280)),
      );
    }
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 20,
          height: 20,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: circleColor,
            border: active
                ? Border.all(color: const Color(0xFF2563EB))
                : Border.all(color: done ? Colors.transparent : Colors.white.withOpacity(0.2)),
          ),
          child: Center(child: circleChild),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white),
              ),
              const SizedBox(height: 2),
              Text(
                desc,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildReferralHistory(ReferralProvider provider) {
    final list = provider.referrals;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'REFERRAL HISTORY',
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5),
              ),
              if (list.isNotEmpty)
                Text(
                  '${list.length} Invites',
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA)),
                ),
            ],
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.03),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.08)),
          ),
          child: list.isEmpty
              ? Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Center(
                    child: Text(
                      'No referrals yet',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
                    ),
                  ),
                )
              : Column(
                  children: list.map((r) => _buildReferralItem(r, list)).toList(),
                ),
        ),
      ],
    );
  }

  Widget _buildReferralItem(Map<String, dynamic> r, List<Map<String, dynamic>> list) {
    final isLast = list.last == r;
    final status = r['status'] as String? ?? 'pending';
    
    // Fallback display name / username / email
    final name = r['referredDisplayName'] as String? ?? r['referredEmail'] as String? ?? 'Referred User';
    
    final date = r['createdAt'] != null
        ? DateFormat('MMM d, yyyy').format((r['createdAt'] as Timestamp).toDate())
        : '';

    Color statusColor;
    String statusText;
    String amountText;
    IconData icon;
    Color iconBg;

    if (status == 'claimed') {
      statusColor = const Color(0xFF6B7280);
      statusText = 'Reward Claimed';
      amountText = '₦' + NumberFormat('#,##0').format((r['bonusAmount'] as num?)?.toDouble() ?? 1500);
      icon = Icons.done_all_rounded;
      iconBg = const Color(0xFF6B7280);
    } else if (status == 'qualified') {
      statusColor = const Color(0xFF10B981);
      statusText = 'Qualified';
      amountText = '+₦' + NumberFormat('#,##0').format((r['bonusAmount'] as num?)?.toDouble() ?? 1500);
      icon = Icons.verified_user_rounded;
      iconBg = const Color(0xFF10B981);
    } else {
      statusColor = const Color(0xFFF97316);
      statusText = 'Awaiting Deposit';
      amountText = '₦0';
      icon = Icons.hourglass_top_rounded;
      iconBg = const Color(0xFFF97316);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
          border: isLast ? null : Border(bottom: BorderSide(color: Colors.white.withOpacity(0.05)))),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: iconBg.withOpacity(0.1),
              border: Border.all(color: iconBg.withOpacity(0.2)),
            ),
            child: Center(child: Icon(icon, size: 12, color: statusColor)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: GoogleFonts.plusJakartaSans(
                      fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(shape: BoxShape.circle, color: statusColor),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      statusText,
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                          letterSpacing: 0.5),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                amountText,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 14, fontWeight: FontWeight.w900, color: statusColor),
              ),
              const SizedBox(height: 2),
              Text(
                date,
                style: GoogleFonts.plusJakartaSans(
                    fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildClaimSheet() {
    final provider = context.read<ReferralProvider>();
    final claimable = provider.claimableBalance;
    final count = provider.qualifiedCount;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: MediaQuery.of(context).size.height * 0.65,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1423).withOpacity(0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: Column(
            children: [
              const SizedBox(height: 12),
              Container(
                  width: 48,
                  height: 6,
                  decoration:
                      BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(3))),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Claim Rewards',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5),
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle),
                        child: const Center(
                          child: Icon(Icons.close_rounded, color: Color(0xFF9CA3AF), size: 14),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                      ),
                      child: Column(
                        children: [
                          Text(
                            'AVAILABLE TO CLAIM',
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 13,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF34D399),
                                letterSpacing: 1.5),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '₦' + NumberFormat('#,##0').format(claimable),
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'From $count qualified referrals',
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'MINIMUM THRESHOLD (₦5,000)',
                          style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF9CA3AF),
                              letterSpacing: 1.0),
                        ),
                        if (claimable >= 5000)
                          const Icon(Icons.check_circle_rounded, size: 12, color: Color(0xFF34D399)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (claimable / 5000).clamp(0.0, 1.0),
                        minHeight: 8,
                        backgroundColor: Colors.white.withOpacity(0.1),
                        valueColor: const AlwaysStoppedAnimation(Color(0xFF10B981)),
                      ),
                    ),
                    const SizedBox(height: 6),
                    if (claimable >= 5000)
                      Text(
                        'You have reached the minimum threshold to withdraw.',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF34D399)),
                      )
                    else
                      Text(
                        'You need at least ₦5,000 to withdraw.',
                        style: GoogleFonts.plusJakartaSans(
                            fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFFF59E0B)),
                      ),
                    const SizedBox(height: 20),
                    Text(
                      'CREDIT TO',
                      style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF6B7280),
                          letterSpacing: 1.5),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withOpacity(0.05),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                                shape: BoxShape.circle, color: const Color(0xFF2563EB).withOpacity(0.2)),
                            child: const Center(
                              child: Icon(Icons.account_balance_wallet_rounded, size: 13, color: Color(0xFF60A5FA)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Fiat Wallet (NGN)',
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Instant transfer',
                                  style: GoogleFonts.plusJakartaSans(
                                      fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: const Color(0xFF2563EB), width: 2),
                            ),
                            child: Center(
                              child: Container(
                                width: 8,
                                height: 8,
                                decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF2563EB)),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                child: GestureDetector(
                  onTap: claimable >= 5000
                      ? () async {
                          final provider = context.read<ReferralProvider>();
                          final claimed = await provider.claimRewards();
                          if (!context.mounted) return;
                          Navigator.pop(context);
                          if (claimed != null && claimed > 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Successfully claimed ₦' + NumberFormat('#,##0').format(claimed) + ' to your NGN balance!'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('No rewards currently available to claim or claim failed.'),
                                backgroundColor: Color(0xFF3B82F6),
                              ),
                            );
                          }
                        }
                      : null,
                  child: Opacity(
                    opacity: claimable >= 5000 ? 1.0 : 0.5,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981),
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: claimable >= 5000
                            ? [
                                BoxShadow(
                                    color: const Color(0xFF10B981).withOpacity(0.3),
                                    blurRadius: 25,
                                    offset: const Offset(0, 4))
                              ]
                            : [],
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            'Claim Rewards',
                            style: GoogleFonts.plusJakartaSans(
                                fontSize: 16, fontWeight: FontWeight.w900, color: Colors.black),
                          ),
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_rounded, color: Colors.black, size: 16),
                        ],
                      ),
                    ),
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

class _FaqItem {
  const _FaqItem({required this.question, required this.answer});
  final String question;
  final String answer;
}

class Share {
  static void share(String text) {
    // A stub for package:share_plus. We can use Clipboard as fallback in web/headless or print it.
    Clipboard.setData(ClipboardData(text: text));
    // Since we don't have package:share_plus imported, copying to clipboard is a great UX fallback!
  }
}

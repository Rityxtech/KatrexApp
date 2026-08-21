import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/transaction_provider.dart';
import '../widgets/notification_icon.dart';
import '../providers/wallet_provider.dart';
import '../widgets/app_background.dart';
import '../widgets/header_profile_avatar.dart';
import 'buy_airtime_screen.dart';
import 'buy_data_screen.dart';
import 'deposit_screen.dart';
import 'marketplace_screen.dart';
import 'sell_giftcard_screen.dart';
import 'trade_screen.dart';
import 'withdraw_screen.dart';
import '../widgets/deposit_methods_modal.dart';

class WalletScreen extends StatefulWidget {
  final ValueChanged<int>? onTabSwitch;
  const WalletScreen({super.key, this.onTabSwitch});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          widget.onTabSwitch?.call(0);
        }
      },
      child: Scaffold(
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
                    padding: const EdgeInsets.only(top: 8, bottom: 100),
                    children: [
                      _buildWalletSummary(),
                      const SizedBox(height: 16),
                      _buildQuickActionsGrid(),
                      const SizedBox(height: 16),
                      _buildRecentTransactions(),
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

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => widget.onTabSwitch?.call(0),
            child: const HeaderProfileAvatar(),
          ),
          Text('My Wallet', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
          const NotificationIcon(),
        ],
      ),
    );
  }

  String _formatNairaValue(double value) {
    if (value >= 1000000000) return '${(value / 1000000000).toStringAsFixed(2)}B';
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(2)}M';
    final n = value.toInt();
    final s = n.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return s.replaceAllMapped(reg, (m) => '${m[1]},');
  }

  String _formatNaira(double v) => _formatNairaValue(v);

  Widget _buildQuickActionsGrid() {
    final actions = [
      {'label': 'Add Money', 'icon': Icons.add_circle_rounded, 'color': const Color(0xFF10B981), 'onTap': () => showDepositMethodsModal(context: context)},
      {'label': 'Withdraw', 'icon': Icons.arrow_upward_rounded, 'color': const Color(0xFFEF4444), 'onTap': () => Navigator.push(context, MaterialPageRoute(builder: (_) => const WithdrawScreen()))},
      {'label': 'Trade', 'icon': Icons.swap_horiz_rounded, 'color': const Color(0xFF8B5CF6), 'onTap': () {
        if (widget.onTabSwitch != null) {
          widget.onTabSwitch!(2);
        } else {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const TradeScreen()));
        }
      }},
      {'label': 'Airtime', 'icon': Icons.phone_iphone_rounded, 'color': const Color(0xFF2563EB), 'onTap': () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyAirtimeScreen()))},
      {'label': 'Data', 'icon': Icons.wifi_rounded, 'color': const Color(0xFF06B6D4), 'onTap': () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BuyDataScreen()))},
      {'label': 'Giftcards', 'icon': Icons.card_giftcard_rounded, 'color': const Color(0xFFF59E0B), 'onTap': () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SellGiftcardScreen()))},
      {'label': 'Trade Accounts', 'icon': Icons.people_rounded, 'color': const Color(0xFFEC4899), 'onTap': () => Navigator.push(context, MaterialPageRoute(builder: (_) => const MarketplaceScreen()))},
      {'label': 'Send', 'icon': Icons.send_rounded, 'color': const Color(0xFF34D399), 'onTap': () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TradeScreen(initialMode: 'send')))},
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quick Actions', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 10),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 4,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 0.88,
            children: actions.map((a) {
              return GestureDetector(
                onTap: a['onTap'] as VoidCallback,
                behavior: HitTestBehavior.opaque,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 48, height: 48,
                      decoration: BoxDecoration(
                        color: (a['color'] as Color).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: (a['color'] as Color).withOpacity(0.2)),
                      ),
                      child: Icon(a['icon'] as IconData, size: 22, color: a['color'] as Color),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      a['label'] as String,
                      textAlign: TextAlign.center,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          GestureDetector(
            onTap: () => _showAddCardModal(context),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withOpacity(0.08),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.credit_card_rounded, size: 16, color: Color(0xFF60A5FA)),
                  const SizedBox(width: 8),
                  Text('Link a card for faster deposits', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA))),
                  const SizedBox(width: 4),
                  const Icon(Icons.arrow_forward_ios_rounded, size: 10, color: Color(0xFF60A5FA)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWalletSummary() {
    final wallet = context.watch<WalletProvider>();
    final ngnBal = wallet.nairaBalance;
    // Assuming totalValueNaira holds the total portfolio value or at least use ngnBal if it's 0
    final totalValue = wallet.totalValueNaira > 0 ? wallet.totalValueNaira : ngnBal;
    final cryptoValue = totalValue > ngnBal ? totalValue - ngnBal : 0.0;
    
    final ngnPercent = totalValue > 0 ? (ngnBal / totalValue) : 0.0;
    final cryptoPercent = totalValue > 0 ? (cryptoValue / totalValue) : 0.0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Colors.white.withOpacity(0.7),
              Colors.white.withOpacity(0.05),
              Colors.white.withOpacity(0.05),
              Colors.white.withOpacity(0.4),
            ],
            stops: const [0.0, 0.4, 0.6, 1.0],
          ),
          boxShadow: [
            BoxShadow(color: const Color(0xFF0A192F).withOpacity(0.5), blurRadius: 24, offset: const Offset(0, 10)),
          ],
        ),
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0A192F),
            borderRadius: BorderRadius.circular(23),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(23),
            child: Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: _WalletMeshPainter(meshColor: Colors.white.withOpacity(0.06)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total Portfolio Value', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8))),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text('+2.4% Today', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF34D399))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Builder(builder: (context) {
                        final wallet = context.watch<WalletProvider>();
                        if (wallet.isLoading && wallet.totalValueNaira == 0) {
                          return Container(
                            height: 32, width: 200,
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.08),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const _ShimmerPulse(),
                          );
                        }
                        return Text(
                          '\u20A6${_formatNaira(totalValue)}',
                          style: GoogleFonts.plusJakartaSans(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1),
                        );
                      }),
                      const SizedBox(height: 12),
                      if (wallet.isLoading && wallet.totalValueNaira == 0)
                        const SizedBox(height: 8)
                      else ...[
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: SizedBox(
                            height: 8,
                            child: Row(
                              children: [
                                if (ngnPercent > 0 || totalValue == 0)
                                  Expanded(
                                    flex: totalValue == 0 ? 100 : (ngnPercent * 100).toInt(),
                                    child: Container(color: const Color(0xFF10B981)),
                                  ),
                                if (cryptoPercent > 0)
                                  Expanded(
                                    flex: (cryptoPercent * 100).toInt(),
                                    child: Container(color: const Color(0xFFF59E0B)),
                                  ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            _buildLegendItem('NGN Fiat', const Color(0xFF10B981), ngnBal, totalValue == 0 ? 100 : ngnPercent * 100),
                            _buildLegendItem('Crypto Assets', const Color(0xFFF59E0B), cryptoValue, cryptoPercent * 100),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLegendItem(String label, Color color, double value, double percent) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
            const SizedBox(width: 6),
            Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF94A3B8))),
          ],
        ),
        const SizedBox(height: 4),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text('\u20A6${_formatNaira(value)}', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
            const SizedBox(width: 4),
            Text('${percent.toStringAsFixed(1)}%', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B))),
          ],
        ),
      ],
    );
  }

  Widget _buildRecentTransactions() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text('Recent Transactions', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
              GestureDetector(
                onTap: () => widget.onTabSwitch?.call(3),
                child: Text('View all', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
                child: _buildRecentTxList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentTxList() {
    final txProvider = context.watch<TransactionProvider>();
    final recent = txProvider.recentTransactions.take(3).toList();

    if (recent.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Center(
          child: Text('No transactions yet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
        ),
      );
    }

    return Column(
      children: List.generate(recent.length, (index) {
        final tx = recent[index];
        final isLast = index == recent.length - 1;
        final isPositive = tx.type == TransactionType.deposit ||
            tx.type == TransactionType.receive ||
            tx.type == TransactionType.sell ||
            tx.type == TransactionType.referralBonus;
        final icon = _txIconForType(tx.type);
        final iconColor = _txColorForType(tx.type);
        final amountColor = isPositive ? const Color(0xFF34D399) : Colors.white;
        final amount = '${isPositive ? '+' : '-'}\u20A6${NumberFormat('#,##0').format(tx.amountNaira)}';
        final time = DateFormat('MMM d, h:mm a').format(tx.createdAt);
        return _txItem(tx.type.label, time, amount, icon, iconColor, amountColor, isLast: isLast);
      }),
    );
  }

  IconData _txIconForType(TransactionType type) {
    switch (type) {
      case TransactionType.deposit: return Icons.account_balance_rounded;
      case TransactionType.withdrawal: return Icons.account_balance_rounded;
      case TransactionType.buy: return Icons.currency_bitcoin_rounded;
      case TransactionType.sell: return Icons.currency_bitcoin_rounded;
      case TransactionType.swap: return Icons.swap_horiz_rounded;
      case TransactionType.send: return Icons.arrow_upward_rounded;
      case TransactionType.receive: return Icons.arrow_downward_rounded;
      case TransactionType.airtime: return Icons.phone_rounded;
      case TransactionType.data: return Icons.wifi_rounded;
      case TransactionType.giftcard: return Icons.card_giftcard_rounded;
      case TransactionType.referralBonus: return Icons.person_add_rounded;
    }
  }

  Color _txColorForType(TransactionType type) {
    switch (type) {
      case TransactionType.deposit: return const Color(0xFF10B981);
      case TransactionType.withdrawal: return const Color(0xFFEF4444);
      case TransactionType.buy: return const Color(0xFFF7931A);
      case TransactionType.sell: return const Color(0xFF3B82F6);
      case TransactionType.swap: return const Color(0xFFA855F7);
      case TransactionType.send: return const Color(0xFFEF4444);
      case TransactionType.receive: return const Color(0xFF10B981);
      case TransactionType.airtime: return const Color(0xFF10B981);
      case TransactionType.data: return const Color(0xFF10B981);
      case TransactionType.giftcard: return const Color(0xFF3B82F6);
      case TransactionType.referralBonus: return const Color(0xFFA855F7);
    }
  }

  Widget _txItem(String title, String subtitle, String amount, IconData icon, Color iconColor, Color amountColor, {bool isLast = false}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: Border(bottom: isLast ? BorderSide.none : BorderSide(color: Colors.white.withOpacity(0.05))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(shape: BoxShape.circle, color: iconColor.withOpacity(0.1), border: Border.all(color: iconColor.withOpacity(0.2))),
                child: Center(child: Icon(icon, size: 16, color: iconColor)),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                  const SizedBox(height: 2),
                  Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.grey.shade400)),
                ],
              ),
            ],
          ),
          Text(amount, style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: amountColor)),
        ],
      ),
    );
  }

  // Modals

  void _showAddCardModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: Container(
              padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
              decoration: BoxDecoration(
                color: const Color(0xFF0A0F1F).withOpacity(0.95),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
              ),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Link New Card', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                        GestureDetector(
                          onTap: () => Navigator.pop(context),
                          child: Container(
                            width: 32, height: 32,
                            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle),
                            child: const Icon(Icons.close_rounded, color: Colors.grey, size: 16),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildInputLabel('Card Number'),
                    _buildTextInput(icon: Icons.credit_card_rounded, hint: '0000 0000 0000 0000', suffixIcon: FontAwesomeIcons.ccVisa),
                    const SizedBox(height: 16),
                    _buildInputLabel('Cardholder Name'),
                    _buildTextInput(icon: Icons.person_outline_rounded, hint: 'JOHN DOE'),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildInputLabel('Expiry Date'),
                              _buildTextInput(hint: 'MM/YY', textAlign: TextAlign.center),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildInputLabel('CVV'),
                              _buildTextInput(hint: '•••', textAlign: TextAlign.center, suffixIcon: Icons.help_outline_rounded, obscure: true),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.lock_rounded, size: 10, color: Colors.grey),
                        const SizedBox(width: 6),
                        Text('Your card details are protected by bank-grade encryption.', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: Colors.grey)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade600,
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [BoxShadow(color: Colors.blue.shade600.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 4))],
                        ),
                        child: Center(
                          child: Text('Link Card Securely', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildInputLabel(String label) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 6),
      child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.grey.shade400, letterSpacing: 1.0)),
    );
  }

  Widget _buildTextInput({IconData? icon, required String hint, dynamic suffixIcon, TextAlign textAlign = TextAlign.left, bool obscure = false}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: TextField(
        obscureText: obscure,
        textAlign: textAlign,
        style: GoogleFonts.robotoMono(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white, letterSpacing: 2),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.robotoMono(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade600, letterSpacing: 2),
          border: InputBorder.none,
          prefixIcon: icon != null ? Icon(icon, color: Colors.grey.shade400, size: 18) : null,
          suffixIcon: suffixIcon != null
              ? (suffixIcon is FaIconData
                  ? FaIcon(suffixIcon, color: suffixIcon == FontAwesomeIcons.ccVisa ? Colors.blue : Colors.grey.shade500, size: suffixIcon == FontAwesomeIcons.ccVisa ? 20 : 14)
                  : Icon(suffixIcon as IconData, color: Colors.grey.shade500, size: 14))
              : null,
          contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        ),
      ),
    );
  }
}

class _WalletMeshPainter extends CustomPainter {
  final Color meshColor;

  _WalletMeshPainter({this.meshColor = const Color(0x0FFFFFFF)});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = meshColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    final path = Path();

    for (int i = 0; i <= 5; i++) {
      double yOffset = i * 24.0;
      path.moveTo(0, size.height * 0.2 + yOffset);
      path.cubicTo(
        size.width * 0.3, size.height * 0.05 + yOffset * 1.2,
        size.width * 0.7, size.height * 0.8 - yOffset * 0.5,
        size.width, size.height * 0.3 + yOffset,
      );
    }

    for (int i = 0; i <= 6; i++) {
      double xOffset = i * 35.0;
      path.moveTo(size.width * 0.1 + xOffset, 0);
      path.cubicTo(
        size.width * 0.3 + xOffset, size.height * 0.4,
        size.width * 0.05 + xOffset, size.height * 0.7,
        size.width * 0.4 + xOffset, size.height,
      );
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _ShimmerPulse extends StatefulWidget {
  const _ShimmerPulse();

  @override
  State<_ShimmerPulse> createState() => _ShimmerPulseState();
}

class _ShimmerPulseState extends State<_ShimmerPulse> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1200),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.3, end: 0.7).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          width: double.infinity,
          height: double.infinity,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(_animation.value),
            borderRadius: BorderRadius.circular(8),
          ),
        );
      },
    );
  }
}

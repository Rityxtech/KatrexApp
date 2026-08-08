import 'dart:async';
import 'dart:math';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/transaction_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/market_data_service.dart';
import '../widgets/app_background.dart';
import 'profile_screen.dart';
import 'buy_airtime_screen.dart';
import 'buy_data_screen.dart';
import 'sell_giftcard_screen.dart';
import 'marketplace_screen.dart';
import 'referral_screen.dart';
import 'trade_screen.dart';
import 'customer_support_screen.dart';
import 'withdraw_screen.dart';
import 'deposit_screen.dart';
import 'live_rates_screen.dart';
import 'coin_preview_screen.dart';
import 'notifications_screen.dart';

class DashboardScreen extends StatefulWidget {
  final ValueChanged<int>? onTabSwitch;
  const DashboardScreen({super.key, this.onTabSwitch});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _balanceVisible = true;
  int _currentAdIndex = 0;
  String _currency = 'NGN'; // Added currency state

  Map<String, CoinMarketData> _marketDataMap = {};
  StreamSubscription<List<CoinMarketData>>? _marketSub;

  @override
  void initState() {
    super.initState();
    _marketSub = MarketDataService.watchAllCoins().listen((coins) {
      if (mounted) {
        setState(() {
          _marketDataMap = {for (final c in coins) c.symbol.toUpperCase(): c};
        });
      }
    });
  }

  @override
  void dispose() {
    _marketSub?.cancel();
    super.dispose();
  }

  Widget _buildBody() {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: _buildHeader(),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildWalletCard(),
                  const SizedBox(height: 16),
                  _buildUtilities(),
                  const SizedBox(height: 16),
                  _buildPortfolio(),
                  const SizedBox(height: 16),
                  _buildActivities(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const ProfileScreen()),
            );
          },
          child: Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withOpacity(0.1),
                  border: Border.all(color: Colors.white.withOpacity(0.2)),
                ),
                child: const Icon(Icons.person, size: 16, color: Colors.white70),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Hello,', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  Builder(builder: (context) {
                    final user = context.watch<AuthProvider>().userModel;
                    String firstName = (user?.fullName.split(' ').first ?? 'User');
                    if (firstName.length > 12) {
                      firstName = '${firstName.substring(0, 12)}...';
                    }
                    return Text('$firstName 👋', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white));
                  }),
                ],
              ),
            ],
          ),
        ),
        Row(
          children: [
            _buildCurrencySwitcher(),
            const SizedBox(width: 8),
            _iconBtn(Icons.notifications_outlined, () => Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationsScreen())), badgeCount: context.watch<NotificationProvider>().unreadCount),
          ],
        ),
      ],
    );
  }

  Widget _iconBtn(IconData icon, VoidCallback onTap, {int badgeCount = 0}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 28, height: 28,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: Colors.white.withOpacity(0.1),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Icon(icon, size: 18, color: Colors.white),
            if (badgeCount > 0)
              Positioned(
                top: 0, right: 0,
                child: Container(
                  constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                  padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEF4444),
                    borderRadius: BorderRadius.circular(7),
                    border: Border.all(color: const Color(0xFF000000), width: 1.5),
                  ),
                  child: Center(
                    child: Text(
                      badgeCount > 9 ? '9+' : '$badgeCount',
                      style: GoogleFonts.plusJakartaSans(fontSize: 8, fontWeight: FontWeight.w800, color: Colors.white),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrencySwitcher() {
    final isNgn = _currency == 'NGN';
    return GestureDetector(
      onTap: () => setState(() => _currency = isNgn ? 'USD' : 'NGN'),
      child: Container(
        height: 28,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.08),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.white.withOpacity(0.15)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 20, height: 20,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: isNgn ? const Color(0xFF10B981) : const Color(0xFF3B82F6),
              ),
              child: Center(
                child: Text(
                  isNgn ? '₦' : '\$',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Text(
              _currency,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: Colors.white,
              ),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.swap_vert_rounded, color: Colors.white54, size: 14),
          ],
        ),
      ),
    );
  }

  String _formatNairaValue(double value) {
    if (value >= 1e9) return '${(value / 1e9).toStringAsFixed(2)}B';
    if (value >= 1e6) return '${(value / 1e6).toStringAsFixed(2)}M';
    final n = value.toInt();
    final s = n.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return s.replaceAllMapped(reg, (m) => '${m[1]},');
  }

  List<double> _normalizeSparkline(List<double> sparkline) {
    if (sparkline.isEmpty) return const [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
    final minVal = sparkline.reduce((a, b) => a < b ? a : b);
    final maxVal = sparkline.reduce((a, b) => a > b ? a : b);
    final range = maxVal - minVal;
    if (range == 0) return List.filled(sparkline.length, 0.5);
    return sparkline.map((v) => (v - minVal) / range).toList();
  }

  Widget _glassCard({required Widget child}) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 32, offset: const Offset(0, 8))],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Padding(padding: const EdgeInsets.all(8), child: child),
        ),
      ),
    );
  }

  Widget _buildWalletCard() {
    return Container(
      padding: const EdgeInsets.all(1.5), // Gradient border thickness
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
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
          color: const Color(0xFF0A192F), // Navy Blue
          borderRadius: BorderRadius.circular(14.5),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(14.5),
        child: Stack(
          children: [
            // Artistic Topographic Mesh Overlay (White)
            Positioned.fill(
              child: CustomPaint(
                painter: _WalletMeshPainter(meshColor: Colors.white.withOpacity(0.06)),
              ),
            ),
            
            // Card Content
            Padding(
              padding: const EdgeInsets.all(8), // Strict 8.0 padding rule preserved
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                            child: const Icon(Icons.account_balance_wallet_rounded, size: 12, color: Colors.white),
                          ),
                          const SizedBox(width: 6),
                          Text('TOTAL BALANCE', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white70, letterSpacing: 1.5)),
                        ],
                      ),
                      GestureDetector(
                        onTap: () => setState(() => _balanceVisible = !_balanceVisible),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.white.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                          child: Row(
                            children: [
                              Text(_balanceVisible ? 'Hide' : 'Show', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: Colors.white)),
                              const SizedBox(width: 4),
                              Icon(_balanceVisible ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 10, color: Colors.white),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Flexible(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Flexible(
                              child: Text(
                                _balanceVisible
                                    ? (_currency == 'NGN'
                                        ? '\u20A6${NumberFormat('#,##0').format(context.watch<WalletProvider>().nairaBalance)}'
                                        : '\$${NumberFormat('#,##0.00').format(context.watch<WalletProvider>().totalValueNaira / 1500)}')
                                    : '********',
                                style: GoogleFonts.plusJakartaSans(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white, height: 1),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                            ),
                            if (_balanceVisible)
                              Text('.00', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white70)),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                        decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.2), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3))),
                        child: Row(
                          children: [
                            const Icon(Icons.trending_up_rounded, size: 12, color: Color(0xFF34D399)),
                            const SizedBox(width: 2),
                            Text('+3.2%', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF34D399))),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(child: _walletActionBtn(icon: Icons.add_circle_rounded, label: 'Add Money', btnColor: const Color(0xFF10B981), onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => const DepositScreen()));
                      })),
                      const SizedBox(width: 8),
                      Expanded(child: _walletActionBtn(icon: Icons.send_rounded, label: 'Withdraw', btnColor: const Color(0xFFEF4444), onTap: () {
                        Navigator.push(context, MaterialPageRoute(builder: (context) => const WithdrawScreen()));
                      })),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  Widget _walletActionBtn({required IconData icon, required String label, required Color btnColor, VoidCallback? onTap}) {
    return _BounceWrapper(
      onTap: onTap ?? () {},
      child: Container(
        decoration: BoxDecoration(
          color: btnColor,
          borderRadius: BorderRadius.circular(10),
          boxShadow: [BoxShadow(color: btnColor.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 14, color: Colors.white),
              const SizedBox(width: 6),
              Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUtilities() {
    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _quickActionIcon(
              title: 'Airtime',
              icon: Icons.phone_android,
              color: const Color(0xFF10B981),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const BuyAirtimeScreen()),
                );
              },
            )),
            Expanded(child: _quickActionIcon(
              title: 'Data',
              icon: Icons.wifi,
              color: const Color(0xFFF59E0B),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const BuyDataScreen()),
                );
              },
            )),
            Expanded(child: _quickActionIcon(
              title: 'Sell Giftcards',
              icon: Icons.card_giftcard,
              color: const Color(0xFF0EA5E9),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const SellGiftcardScreen()),
                );
              },
            )),
            Expanded(child: _quickActionIcon(
              title: 'Trade Crypto',
              icon: Icons.swap_horiz,
              color: const Color(0xFF8B5CF6),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => TradeScreen(onTabSwitch: widget.onTabSwitch)),
                );
              },
            )),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(child: _quickActionIcon(
              title: 'Trade Accounts',
              icon: Icons.shopping_cart_rounded,
              color: const Color(0xFFEC4899),
              iconWidget: const _AnimatedRainbowCartIcon(),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const MarketplaceScreen()),
                );
              },
            )),
            Expanded(child: _quickActionIcon(
              title: 'Referral',
              icon: Icons.card_giftcard_rounded,
              color: const Color(0xFF10B981),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => ReferralScreen(onTabSwitch: widget.onTabSwitch)),
                );
              },
            )),
            Expanded(child: _quickActionIcon(
              title: 'Rates',
              icon: Icons.calculate_rounded,
              color: const Color(0xFFF59E0B),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => const LiveRatesScreen()),
                );
              },
            )),
            Expanded(child: _quickActionIcon(
              title: 'Help',
              icon: Icons.headset_mic_rounded,
              color: const Color(0xFF0EA5E9),
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (context) => CustomerSupportScreen(onTabSwitch: widget.onTabSwitch)),
                );
              },
            )),
          ],
        ),
        const SizedBox(height: 16),
        _buildDiscoverHub(),
      ],
    );
  }

  Widget _buildDiscoverHub() {
    return _buildPromoCarousel();
  }

  Widget _quickActionIcon({
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    Widget? iconWidget,
  }) {
    return _BounceWrapper(
      onTap: onTap,
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
        children: [
          iconWidget ?? Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(color: color.withOpacity(0.3), width: 1.5),
            ),
            child: Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withOpacity(0.95),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 24, color: color),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 11,
              height: 1.2,
              fontWeight: FontWeight.w700,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildPromoCarousel() {
    final List<Map<String, String>> ads = [
      {
        'title': 'Trade Gift Cards at Best Rates',
        'subtitle': 'Sell your unused gift cards for instant cash today.',
        'badge': 'HOT DEALS',
        'btn': 'Trade Now',
        'image': 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=600&auto=format&fit=crop',
      },
      {
        'title': 'Zero Fees on First Trade!',
        'subtitle': 'Buy, sell, and swap top cryptocurrencies instantly.',
        'badge': 'PROMO',
        'btn': 'Buy Crypto',
        'image': 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=600&auto=format&fit=crop',
      },
      {
        'title': 'Invite & Earn ₦1,500',
        'subtitle': 'Share your referral code with friends and earn rewards.',
        'badge': 'REFERRAL',
        'btn': 'Share Code',
        'image': 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop',
      },
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 10),
      child: Column(
        children: [
          CarouselSlider(
            options: CarouselOptions(
              height: 96.0,
              viewportFraction: 1.0,
              autoPlay: true,
              autoPlayInterval: const Duration(seconds: 4),
              autoPlayAnimationDuration: const Duration(milliseconds: 800),
              autoPlayCurve: Curves.fastOutSlowIn,
              onPageChanged: (index, reason) {
                setState(() {
                  _currentAdIndex = index;
                });
              },
            ),
            items: ads.map((ad) {
              return Builder(
                builder: (BuildContext context) {
                  return _carouselAdCard(
                    title: ad['title']!,
                    subtitle: ad['subtitle']!,
                    badge: ad['badge']!,
                    btnText: ad['btn']!,
                    imageUrl: ad['image']!,
                    index: ads.indexOf(ad),
                  );
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: ads.asMap().entries.map((entry) {
              return Container(
                width: _currentAdIndex == entry.key ? 24.0 : 8.0,
                height: 4.0,
                margin: const EdgeInsets.symmetric(horizontal: 3.0),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(4),
                  color: _currentAdIndex == entry.key ? const Color(0xFF10B981) : Colors.white.withOpacity(0.2),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _carouselAdCard({
    required String title,
    required String subtitle,
    required String badge,
    required String btnText,
    required String imageUrl,
    required int index,
  }) {
    List<Color> gradientColors = [const Color(0xFF1E293B), const Color(0xFF0F172A)];
    Color badgeColor = const Color(0xFF10B981);
    
    // Assign different premium gradients based on the ad index
    if (index == 0) {
      gradientColors = [const Color(0xFF0EA5E9).withOpacity(0.8), const Color(0xFF2563EB).withOpacity(0.8)];
      badgeColor = const Color(0xFF38BDF8);
    } else if (index == 1) {
      gradientColors = [const Color(0xFF8B5CF6).withOpacity(0.8), const Color(0xFF4F46E5).withOpacity(0.8)];
      badgeColor = const Color(0xFFA78BFA);
    } else if (index == 2) {
      gradientColors = [const Color(0xFFF59E0B).withOpacity(0.8), const Color(0xFFD97706).withOpacity(0.8)];
      badgeColor = const Color(0xFFFBBF24);
    }

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradientColors,
        ),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 12, offset: const Offset(0, 6)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          children: [
            Positioned.fill(
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => const SizedBox(),
              ),
            ),
            Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.white.withOpacity(0.15), width: 1),
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.2),
                    Colors.black.withOpacity(0.8),
                  ],
                ),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: badgeColor, borderRadius: BorderRadius.circular(20)),
              child: Text(badge, style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5)),
            ),
            Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Flexible(
                        child: Text(
                          title, 
                          style: GoogleFonts.spaceGrotesk(
                            fontSize: 15, 
                            height: 1.1, 
                            fontWeight: FontWeight.w900, 
                            color: Colors.white, 
                            letterSpacing: -0.5, 
                            shadows: [Shadow(color: Colors.black.withOpacity(0.5), blurRadius: 6, offset: const Offset(0, 2))],
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Flexible(
                        child: Text(
                          subtitle, 
                          maxLines: 1, 
                          overflow: TextOverflow.ellipsis, 
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10, 
                            fontWeight: FontWeight.w600, 
                            color: Colors.white.withOpacity(0.9),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(btnText, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black)),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward_ios_rounded, size: 10, color: Colors.black),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
              ),
            ],
          ),
        ),
    );
  }

  static const Map<String, Map<String, dynamic>> _supportedCoins = {
    'BTC': {'name': 'Bitcoin', 'iconUrl': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', 'color': Color(0xFFF7931A)},
    'ETH': {'name': 'Ethereum', 'iconUrl': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', 'color': Color(0xFF627EEA)},
    'USDT': {'name': 'Tether', 'iconUrl': 'https://assets.coingecko.com/coins/images/325/large/Tether.png', 'color': Color(0xFF26A17B)},
    'SOL': {'name': 'Solana', 'iconUrl': 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 'color': Color(0xFF14F195)},
    'BNB': {'name': 'BNB', 'iconUrl': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', 'color': Color(0xFFF3BA2F)},
    'DOGE': {'name': 'Dogecoin', 'iconUrl': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png', 'color': Color(0xFFC2A633)},
    'XRP': {'name': 'Ripple', 'iconUrl': 'https://cryptologos.cc/logos/xrp-xrp-logo.png', 'color': Color(0xFF23292F)},
    'ADA': {'name': 'Cardano', 'iconUrl': 'https://assets.coingecko.com/coins/images/975/large/cardano.png', 'color': Color(0xFF0033AD)},
    'MATIC': {'name': 'Polygon', 'iconUrl': 'https://assets.coingecko.com/coins/images/4713/large/polygon.png', 'color': Color(0xFF8247E5)},
    'TRX': {'name': 'TRON', 'iconUrl': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png', 'color': Color(0xFFEF0027)},
    'TON': {'name': 'Toncoin', 'iconUrl': 'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png', 'color': Color(0xFF0098EA)},
  };

  Widget _buildPortfolio() {
    final wallet = context.watch<WalletProvider>();
    final cryptoBalances = wallet.cryptoBalances;
    final visibleCoins = wallet.visibleCoins;

    // Default to all supported coins if user hasn't set preferences yet
    final coinsToShow = visibleCoins.isEmpty
        ? _supportedCoins.keys.toList()
        : visibleCoins;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('My Portfolio', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
            GestureDetector(
              onTap: () => widget.onTabSwitch?.call(1),
              child: Text('View all', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ),
          ],
        ),
        const SizedBox(height: 6),
        if (coinsToShow.isEmpty)
          _glassCard(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text('No crypto assets visible', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ),
            ),
          )
        else
          _glassCard(
            child: Column(
              children: List.generate(coinsToShow.length, (index) {
                final ticker = coinsToShow[index];
                final balance = cryptoBalances[ticker] ?? 0;
                final meta = _supportedCoins[ticker] ?? {'name': ticker, 'iconUrl': '', 'color': const Color(0xFF9CA3AF)};
                final isLast = index == coinsToShow.length - 1;
                final md = _marketDataMap[ticker.toUpperCase()];

                final nairaValue = md != null ? balance * md.priceNaira : 0.0;
                final valueStr = md != null
                    ? '\u20A6${_formatNairaValue(nairaValue)}'
                    : '${balance.toStringAsFixed(4)} $ticker';
                final priceStr = md != null
                    ? '\u20A6${_formatNairaValue(md.priceNaira)}'
                    : '';
                final changeStr = md != null
                    ? '${md.change24h >= 0 ? '+' : ''}${md.change24h.toStringAsFixed(2)}%'
                    : '';
                final changeColor = md != null
                    ? (md.isUp ? const Color(0xFF34D399) : const Color(0xFFEF4444))
                    : Colors.transparent;
                final chartColor = md != null
                    ? (md.isUp ? const Color(0xFF10B981) : const Color(0xFFEF4444))
                    : const Color(0xFF10B981);
                final chartPoints = md != null && md.sparkline.length > 1
                    ? _normalizeSparkline(md.sparkline)
                    : const [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];

                return Column(
                  children: [
                    _portfolioItem(
                      name: meta['name'] as String,
                      ticker: ticker,
                      value: valueStr,
                      price: priceStr,
                      change: changeStr,
                      changeColor: changeColor,
                      iconColor: meta['color'] as Color,
                      iconBg: (meta['color'] as Color).withOpacity(0.2),
                      chartColor: chartColor,
                      chartPoints: chartPoints,
                      iconData: null,
                      customIconWidget: meta['iconUrl'] != null && meta['iconUrl'].toString().isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: meta['iconUrl'],
                              width: 20,
                              height: 20,
                              errorWidget: (context, url, error) => Icon(Icons.token_rounded, size: 20, color: meta['color']),
                            )
                          : null,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CoinPreviewScreen(
                        coinName: meta['name'] as String,
                        coinSymbol: ticker,
                        coinIcon: meta['icon'] as IconData? ?? Icons.token_rounded,
                        coinColor: meta['color'] as Color,
                        balanceNaira: md != null ? _formatNairaValue(nairaValue) : '0',
                        balanceCoin: '${balance.toStringAsFixed(6)} $ticker',
                        livePrice: md != null ? _formatNairaValue(md.priceNaira) : '0',
                        priceChange: md != null ? '${md.change24h.toStringAsFixed(2)}%' : '0%',
                        isUp: md?.isUp ?? true,
                        currencyCode: {'BTC': 'btc', 'ETH': 'eth', 'USDT': 'usdttrc20', 'TRX': 'trx'}[ticker] ?? ticker.toLowerCase(),
                      ))),
                    ),
                    if (!isLast) const Divider(color: Color(0x0DFFFFFF), height: 16),
                  ],
                );
              }),
            ),
          ),
      ],
    );
  }

  Widget _portfolioItem({required String name, required String ticker, required String value, required String price, required String change, required Color changeColor, required Color iconColor, required Color iconBg, required Color chartColor, required List<double> chartPoints, IconData? iconData, Widget? customIconWidget, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
      padding: EdgeInsets.zero,
      child: Row(
        children: [
          Expanded(
            flex: 35,
            child: Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(shape: BoxShape.circle, color: iconBg),
                  child: Center(
                    child: customIconWidget ?? (iconData != null ? Icon(iconData, size: 16, color: iconColor) : Text(ticker[0], style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: iconColor))),
                  ),
                ),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                    Text(ticker, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            flex: 20,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                SizedBox(
                  height: 20,
                  child: CustomPaint(
                    size: const Size(50, 20),
                    painter: _MiniChartPainter(upColor: const Color(0xFF10B981), downColor: const Color(0xFFEF4444), points: chartPoints),
                  ),
                ),
                if (change.isNotEmpty)
                  Text(change, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: changeColor)),
              ],
            ),
          ),
          Expanded(
            flex: 35,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
                if (price.isNotEmpty)
                  Text(price, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ],
            ),
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildActivities() {
    final txProvider = context.watch<TransactionProvider>();
    final recent = txProvider.recentTransactions;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Recent Activities', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
            GestureDetector(
              onTap: () => widget.onTabSwitch?.call(3),
              child: Text('View all', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ),
          ],
        ),
        const SizedBox(height: 6),
        if (recent.isEmpty)
          _glassCard(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text('No transactions yet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ),
            ),
          )
        else
          _glassCard(
            child: Column(
              children: List.generate(recent.length, (index) {
                final tx = recent[index];
                final isPositive = tx.type == TransactionType.deposit ||
                    tx.type == TransactionType.receive ||
                    tx.type == TransactionType.sell ||
                    tx.type == TransactionType.referralBonus;
                final isOutgoing = tx.type == TransactionType.withdrawal ||
                    tx.type == TransactionType.send ||
                    tx.type == TransactionType.buy ||
                    tx.type == TransactionType.airtime ||
                    tx.type == TransactionType.data;
                final iconData = isOutgoing ? Icons.arrow_upward_rounded : Icons.arrow_downward_rounded;
                final color = isPositive ? const Color(0xFF10B981) : const Color(0xFFEF4444);
                final amount = '${isPositive ? '+' : '-'}\u20A6${NumberFormat('#,##0').format(tx.amountNaira)}';
                final time = DateFormat('MMM d, h:mm a').format(tx.createdAt);
                return Column(
                  children: [
                    if (index > 0) const Divider(color: Color(0x0DFFFFFF), height: 16),
                    _activityItem(
                      icon: iconData,
                      iconBg: color.withOpacity(0.15),
                      iconColor: color,
                      title: tx.type.label,
                      time: time,
                      amount: amount,
                      amountColor: color,
                    ),
                  ],
                );
              }),
            ),
          ),
      ],
    );
  }

  Widget _activityItem({required IconData icon, required Color iconBg, required Color iconColor, required String title, required String time, required String amount, required Color amountColor}) {
    return Padding(
      padding: EdgeInsets.zero,
      child: Row(
        children: [
          Container(
            width: 28, height: 28,
            decoration: BoxDecoration(shape: BoxShape.circle, color: iconBg),
            child: Icon(icon, size: 9, color: iconColor),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                Text(time, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ],
            ),
          ),
          Text(amount, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: amountColor)),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.onTabSwitch != null) return _buildBody();

    final size = MediaQuery.of(context).size;
    final maxWidth = min(430.0, size.width);

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(statusBarColor: Colors.transparent),
      child: Scaffold(
        backgroundColor: const Color(0xFF000000),
        body: AppBackground(
          child: Center(
            child: SizedBox(
              width: maxWidth,
              child: _buildBody(),
            ),
          ),
        ),
      ),
    );
  }
}

class _MiniChartPainter extends CustomPainter {
  final Color upColor;
  final Color downColor;
  final List<double> points;

  _MiniChartPainter({required this.upColor, required this.downColor, required this.points});

  @override
  void paint(Canvas canvas, Size size) {
    final stepX = size.width / (points.length - 1);
    for (int i = 1; i < points.length; i++) {
      final isUp = points[i] >= points[i - 1];
      final paint = Paint()
        ..color = isUp ? upColor : downColor
        ..strokeWidth = 1.5
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.round;
      final x1 = (i - 1) * stepX;
      final y1 = size.height - points[i - 1] * size.height;
      final x2 = i * stepX;
      final y2 = size.height - points[i] * size.height;
      canvas.drawLine(Offset(x1, y1), Offset(x2, y2), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
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
    
    // Horizontal-ish topographic waves
    for (int i = 0; i <= 5; i++) {
      double yOffset = i * 24.0;
      path.moveTo(0, size.height * 0.2 + yOffset);
      path.cubicTo(
        size.width * 0.3, size.height * 0.05 + yOffset * 1.2,
        size.width * 0.7, size.height * 0.8 - yOffset * 0.5,
        size.width, size.height * 0.3 + yOffset,
      );
    }
    
    // Vertical-ish topographic waves
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

class _BounceWrapper extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;

  const _BounceWrapper({required this.child, this.onTap});

  @override
  State<_BounceWrapper> createState() => _BounceWrapperState();
}

class _BounceWrapperState extends State<_BounceWrapper> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 100),
      reverseDuration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(
        parent: _controller, 
        curve: Curves.easeOutCubic,
        reverseCurve: Curves.elasticOut, // Gives it a physical spring-back effect
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) {
        if (widget.onTap != null) _controller.forward();
      },
      onTapUp: (_) {
        if (widget.onTap != null) {
          Future.delayed(const Duration(milliseconds: 50), () {
            if (mounted) _controller.reverse();
          });
          // Small delay before triggering the actual tap action so the user feels the click first
          Future.delayed(const Duration(milliseconds: 100), () {
            if (mounted) widget.onTap!();
          });
        }
      },
      onTapCancel: () {
        if (widget.onTap != null) _controller.reverse();
      },
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: widget.child,
      ),
    );
  }
}

class _AnimatedRainbowCartIcon extends StatefulWidget {
  const _AnimatedRainbowCartIcon();

  @override
  State<_AnimatedRainbowCartIcon> createState() => _AnimatedRainbowCartIconState();
}

class _AnimatedRainbowCartIconState extends State<_AnimatedRainbowCartIcon> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 56,
      height: 56,
      alignment: Alignment.center,
      child: Stack(
        alignment: Alignment.center,
        children: [
          AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              return Transform.rotate(
                angle: _controller.value * 2 * pi,
                child: child,
              );
            },
            child: Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                gradient: SweepGradient(
                  colors: [
                    Color(0xFFFF0000),
                    Color(0xFFFF7F00),
                    Color(0xFFFFFF00),
                    Color(0xFF00FF00),
                    Color(0xFF0000FF),
                    Color(0xFF4B0082),
                    Color(0xFF9400D3),
                    Color(0xFFFF0000),
                  ],
                ),
              ),
            ),
          ),
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A).withOpacity(0.95),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.shopping_cart_rounded,
              size: 24,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

class _AnimatedVisitIndicator extends StatefulWidget {
  const _AnimatedVisitIndicator();

  @override
  State<_AnimatedVisitIndicator> createState() => _AnimatedVisitIndicatorState();
}

class _AnimatedVisitIndicatorState extends State<_AnimatedVisitIndicator> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0, end: 4).animate(
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
        return Transform.translate(
          offset: Offset(_animation.value, 0),
          child: child,
        );
      },
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Visit',
            style: GoogleFonts.plusJakartaSans(
              fontSize: 10,
              fontWeight: FontWeight.w700,
              color: Colors.white54,
            ),
          ),
          const SizedBox(width: 2),
          const Icon(
            Icons.chevron_right_rounded,
            color: Colors.white54,
            size: 18,
          ),
        ],
      ),
    );
  }
}

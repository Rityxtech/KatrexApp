import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../services/firestore_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import 'giftcard_trade_preview_screen.dart';

class SellGiftcardScreen extends StatefulWidget {
  const SellGiftcardScreen({super.key});

  @override
  State<SellGiftcardScreen> createState() => _SellGiftcardScreenState();
}

class _SellGiftcardScreenState extends State<SellGiftcardScreen> {
  int _currentPromoIndex = 0;
  
  final List<Map<String, dynamic>> _promos = [
    {
      'image': 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=800&auto=format&fit=crop',
      'tag': '🔥 Trending Rate',
      'tagColor': const Color(0xFFF97316),
      'title': 'Steam Wallet UK',
      'subtitle': 'Trade up to ₦1,450/£',
    },
    {
      'image': 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800&auto=format&fit=crop',
      'tag': 'Exclusive',
      'tagColor': const Color(0xFF3B82F6),
      'title': 'Apple iTunes',
      'subtitle': 'Highest rates guaranteed',
    },
    {
      'image': 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?q=80&w=800&auto=format&fit=crop',
      'tag': 'Instant Cash',
      'tagColor': const Color(0xFF10B981),
      'title': 'Amazon E-Codes',
      'subtitle': 'Fast & secure payouts',
    },
  ];

  final List<Map<String, dynamic>> _brands = [
    {'name': 'Apple', 'icon': Icons.apple, 'color': Colors.white, 'rate': 'Up to ₦1,250/\$', 'image': 'https://images.unsplash.com/photo-1621768216002-5ac171876607?q=80&w=400'},
    {'name': 'Steam', 'icon': Icons.gamepad_rounded, 'color': const Color(0xFF9CA3AF), 'rate': 'Up to ₦1,450/£', 'image': 'https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?q=80&w=400'},
    {'name': 'Amazon', 'icon': Icons.shopping_cart_rounded, 'color': const Color(0xFFF59E0B), 'rate': 'Up to ₦1,050/\$', 'image': 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?q=80&w=400'},
    {'name': 'Razer Gold', 'icon': Icons.sports_esports_rounded, 'color': const Color(0xFF10B981), 'rate': 'Up to ₦1,180/\$', 'image': 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=400'},
    {'name': 'Google Play', 'icon': Icons.play_arrow_rounded, 'color': const Color(0xFF3B82F6), 'rate': 'Up to ₦980/\$', 'image': 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?q=80&w=400'},
    {'name': 'Vanilla Visa', 'icon': Icons.credit_card_rounded, 'color': const Color(0xFF1D4ED8), 'rate': 'Up to ₦1,100/\$', 'image': 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?q=80&w=400'},
    {'name': 'Netflix', 'icon': Icons.movie_rounded, 'color': const Color(0xFFE50914), 'rate': 'Up to ₦900/\$', 'image': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400'},
    {'name': 'Spotify', 'icon': Icons.music_note_rounded, 'color': const Color(0xFF1DB954), 'rate': 'Up to ₦850/\$', 'image': 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=400'},
    {'name': 'Sephora', 'icon': Icons.spa_rounded, 'color': const Color(0xFFEC4899), 'rate': 'Up to ₦1,000/\$', 'image': 'https://images.unsplash.com/photo-1596462502278-27bfdd403348?q=80&w=400'},
    {'name': 'Xbox', 'icon': Icons.videogame_asset_rounded, 'color': const Color(0xFF10B981), 'rate': 'Up to ₦1,200/\$', 'image': 'https://images.unsplash.com/photo-1605901309584-818e25960a8f?q=80&w=400'},
    {'name': 'PlayStation', 'icon': Icons.games_rounded, 'color': const Color(0xFF2563EB), 'rate': 'Up to ₦1,150/\$', 'image': 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=400'},
    {'name': 'Walmart', 'icon': Icons.store_rounded, 'color': const Color(0xFFF59E0B), 'rate': 'Up to ₦950/\$', 'image': 'https://images.unsplash.com/photo-1534723452862-763ed04871a9?q=80&w=400'},
  ];

  @override
  Widget build(BuildContext context) {
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
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 40),
                    children: [
                      _buildPromoSlider(),
                      const SizedBox(height: 16),
                      _buildSearchPanel(),
                      const SizedBox(height: 16),
                      _buildQuickAccess(),
                      const SizedBox(height: 16),
                      _buildBrandGrid(),
                    ],
                  ),
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
                  child: const Center(child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18)),
                ),
              ),
            ),
          ),
          Text('Sell Gift Cards', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildPromoSlider() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Stack(
        alignment: Alignment.bottomCenter,
        children: [
          CarouselSlider(
            options: CarouselOptions(
              height: 102,
              viewportFraction: 1.0,
              autoPlay: true,
              autoPlayInterval: const Duration(seconds: 4),
              onPageChanged: (index, reason) {
                setState(() => _currentPromoIndex = index);
              },
            ),
            items: _promos.map((promo) {
              return Container(
                width: double.infinity,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  color: Colors.black,
                  image: DecorationImage(
                    image: NetworkImage(promo['image']),
                    fit: BoxFit.cover,
                    colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.5), BlendMode.darken),
                  ),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    gradient: LinearGradient(
                      colors: [Colors.black.withOpacity(0.8), Colors.transparent],
                      begin: Alignment.centerLeft,
                      end: Alignment.centerRight,
                    ),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: (promo['tagColor'] as Color).withOpacity(0.2),
                          border: Border.all(color: (promo['tagColor'] as Color).withOpacity(0.3)),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          promo['tag'],
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: promo['tagColor'],
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(promo['title'], style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1)),
                      const SizedBox(height: 4),
                      Text(promo['subtitle'], style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white70)),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          Positioned(
            bottom: 12,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: _promos.asMap().entries.map((entry) {
                return Container(
                  width: _currentPromoIndex == entry.key ? 16.0 : 6.0,
                  height: 6.0,
                  margin: const EdgeInsets.symmetric(horizontal: 2.0),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(3),
                    color: _currentPromoIndex == entry.key ? Colors.white : Colors.white.withOpacity(0.3),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchPanel() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.search_rounded, color: Colors.white54, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          style: GoogleFonts.plusJakartaSans(fontSize: 15, color: Colors.white, fontWeight: FontWeight.w600),
                          decoration: InputDecoration(
                            hintText: 'Search brands (e.g. Apple, Steam)...',
                            hintStyle: GoogleFonts.plusJakartaSans(fontSize: 13, color: Colors.white30, fontWeight: FontWeight.w600),
                            border: InputBorder.none,
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 8),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Container(height: 1, color: Colors.white.withOpacity(0.05)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'AVAILABLE BRANDS',
                      style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5),
                    ),
                    Row(
                      children: [
                        GestureDetector(
                          onTap: () {},
                          child: Row(
                            children: [
                              Text('Sort', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white70)),
                              const SizedBox(width: 4),
                              const Icon(Icons.sort_rounded, color: Colors.white54, size: 14),
                            ],
                          ),
                        ),
                        Container(width: 1, height: 12, color: Colors.white.withOpacity(0.1), margin: const EdgeInsets.symmetric(horizontal: 10)),
                        GestureDetector(
                          onTap: () {},
                          child: Row(
                            children: [
                              const Icon(Icons.tune_rounded, color: Color(0xFF60A5FA), size: 14),
                              const SizedBox(width: 4),
                              Text('Filter', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ],
            ),
      ),
    );
  }

  Widget _buildQuickAccess() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: _brands.map((brand) {
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: GestureDetector(
              onTap: () => _showTradeBottomSheet(brand),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 20, height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: (brand['color'] as Color).withOpacity(0.2),
                      ),
                      child: Center(child: Icon(brand['icon'], size: 10, color: brand['color'])),
                    ),
                    const SizedBox(width: 6),
                    Text(brand['name'], style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildBrandGrid() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 1.3,
        ),
        itemCount: _brands.length,
        itemBuilder: (context, index) {
          final brand = _brands[index];
          return GestureDetector(
            onTap: () => _showTradeBottomSheet(brand),
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                image: DecorationImage(
                  image: NetworkImage(brand['image']),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(Colors.black.withOpacity(0.4), BlendMode.darken),
                ),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [Colors.black.withOpacity(0.2), Colors.black.withOpacity(0.8)],
                  ),
                ),
                padding: const EdgeInsets.all(8),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 28, height: 28,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withOpacity(0.1),
                        border: Border.all(color: Colors.white.withOpacity(0.2)),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 8, sigmaY: 8),
                          child: Center(child: Icon(brand['icon'], size: 14, color: Colors.white)),
                        ),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(brand['name'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(brand['rate'], style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF34D399)), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showTradeBottomSheet(Map<String, dynamic> brand) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) {
        return _TradeBottomSheet(brand: brand);
      },
    );
  }
}

class _TradeBottomSheet extends StatefulWidget {
  final Map<String, dynamic> brand;
  const _TradeBottomSheet({required this.brand});

  @override
  State<_TradeBottomSheet> createState() => _TradeBottomSheetState();
}

class _TradeBottomSheetState extends State<_TradeBottomSheet> {
  int _currencyIndex = 0; // 0: USD, 1: GBP, 2: EUR
  int _typeIndex = 0; // 0: Physical, 1: E-Code
  final TextEditingController _cardValueController = TextEditingController();
  bool _isProcessing = false;

  static const _rates = [1550.0, 1750.0, 1680.0]; // NGN per unit for USD, GBP, EUR
  static const _currencySymbols = ['\$', '£', '€'];

  double get _cardValue => double.tryParse(_cardValueController.text.replaceAll(',', '')) ?? 0;
  double get _nairaAmount => _cardValue * _rates[_currencyIndex];

  @override
  void dispose() {
    _cardValueController.dispose();
    super.dispose();
  }

  Future<void> _submitTrade() async {
    if (_cardValue <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Enter a card value', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
      );
      return;
    }

    setState(() => _isProcessing = true);

    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final tx = TransactionModel(
        id: '',
        uid: uid,
        type: TransactionType.giftcard,
        status: TransactionStatus.pending,
        amountNaira: _nairaAmount,
        description: 'Sell ${widget.brand['name']} - ${_currencySymbols[_currencyIndex]}${_cardValue.toStringAsFixed(0)}',
        reference: 'GC-${DateTime.now().millisecondsSinceEpoch}',
        createdAt: DateTime.now(),
        cardBrand: widget.brand['name'] as String?,
      );

      await FirestoreService().createTransaction(tx);
      if (mounted) {
        Navigator.pop(context);
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => const GiftcardTradePreviewScreen()),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Trade failed: $e', style: GoogleFonts.plusJakartaSans()), backgroundColor: const Color(0xFFEF4444)),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          padding: EdgeInsets.only(bottom: bottomInset),
          decoration: BoxDecoration(
            color: const Color(0xFF0F1423).withOpacity(0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1))),
          ),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 48, height: 6, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(3))),
                const SizedBox(height: 20),
                
                // Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 32, height: 32,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: (widget.brand['color'] as Color).withOpacity(0.2),
                          ),
                          child: Center(child: Icon(widget.brand['icon'], size: 16, color: widget.brand['color'])),
                        ),
                        const SizedBox(width: 12),
                        Text('Sell ${widget.brand['name']}', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                      ],
                    ),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        width: 32, height: 32,
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle),
                        child: const Icon(Icons.close_rounded, color: Color(0xFF9CA3AF), size: 16),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Currency Toggle
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.4),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: Row(
                    children: [
                      _currencyTab(0, 'USD (\$)'),
                      _currencyTab(1, 'GBP (£)'),
                      _currencyTab(2, 'EUR (€)'),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Type Toggle
                Row(
                  children: [
                    Expanded(child: _typeTab(0, Icons.credit_card_rounded, 'Physical')),
                    const SizedBox(width: 12),
                    Expanded(child: _typeTab(1, Icons.qr_code_rounded, 'E-Code')),
                  ],
                ),
                const SizedBox(height: 24),

                // Amount Input
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Card Value', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.03),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withOpacity(0.1)),
                      ),
                      child: Row(
                        children: [
                          Text('\$', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _cardValueController,
                              keyboardType: TextInputType.number,
                              style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                              decoration: InputDecoration(
                                hintText: '100',
                                hintStyle: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white30),
                                border: InputBorder.none,
                                isDense: true,
                                contentPadding: const EdgeInsets.symmetric(vertical: 16),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Image Upload Box
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.02),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.1), style: BorderStyle.solid), // In a real app we could draw a dashed border, using solid for now
                  ),
                  child: Column(
                    children: [
                      Container(
                        width: 40, height: 40,
                        decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), shape: BoxShape.circle),
                        child: const Center(child: Icon(Icons.cloud_upload_rounded, color: Color(0xFF60A5FA), size: 18)),
                      ),
                      const SizedBox(height: 8),
                      Text('Tap to upload card images', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Calculator Result
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('You will receive', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
                      Builder(builder: (_) => Text(
                        '\u20A6${NumberFormat('#,##0').format(_nairaAmount)}',
                        style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA)),
                      )),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Submit Button
                GestureDetector(
                  onTap: _isProcessing ? null : _submitTrade,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 4))],
                    ),
                    child: Center(
                      child: _isProcessing
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Submit Trade', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 14),
                              ],
                            ),
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

  Widget _currencyTab(int index, String label) {
    final isActive = _currencyIndex == index;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _currencyIndex = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isActive ? Colors.white.withOpacity(0.1) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            boxShadow: isActive ? [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 4)] : [],
          ),
          child: Center(
            child: Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: isActive ? FontWeight.w900 : FontWeight.w700,
                color: isActive ? Colors.white : const Color(0xFF9CA3AF),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _typeTab(int index, IconData icon, String label) {
    final isActive = _typeIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _typeIndex = index),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF2563EB).withOpacity(0.1) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: isActive ? const Color(0xFF2563EB).withOpacity(0.5) : Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 14, color: isActive ? const Color(0xFF60A5FA) : const Color(0xFF9CA3AF)),
            const SizedBox(width: 8),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: isActive ? const Color(0xFF60A5FA) : const Color(0xFF9CA3AF),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

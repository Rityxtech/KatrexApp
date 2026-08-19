import 'dart:io';
import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../services/firestore_service.dart';
import '../services/storage_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import 'giftcard_trade_preview_screen.dart';
import 'giftcard_trades_history_screen.dart';
import 'live_rates_screen.dart';

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
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
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
                    'Sell Giftcards',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: -0.2,
                    ),
                  ),
                  Text(
                    'Best rates guaranteed',
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
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildPromoSlider() {
    return Column(
      children: [
        CarouselSlider.builder(
          itemCount: _promos.length,
          options: CarouselOptions(
            height: 112,
            viewportFraction: 0.92,
            enlargeCenterPage: true,
            autoPlay: true,
            autoPlayInterval: const Duration(seconds: 4),
            autoPlayAnimationDuration: const Duration(milliseconds: 800),
            autoPlayCurve: Curves.fastOutSlowIn,
            onPageChanged: (index, reason) {
              setState(() {
                _currentPromoIndex = index;
              });
            },
          ),
          itemBuilder: (context, index, realIndex) {
            final promo = _promos[index];
            return Container(
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                image: DecorationImage(
                  image: NetworkImage(promo['image']),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(
                    Colors.black.withOpacity(0.45),
                    BlendMode.darken,
                  ),
                ),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Stack(
                children: [
                  Positioned(
                    top: 10,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: (promo['tagColor'] as Color).withOpacity(0.9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        promo['tag'],
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 8.5,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 10,
                    left: 12,
                    right: 12,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              promo['title'],
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              promo['subtitle'],
                              style: GoogleFonts.plusJakartaSans(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFD1D5DB),
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.white.withOpacity(0.3)),
                          ),
                          child: Row(
                            children: [
                              Text(
                                'Trade',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                              const SizedBox(width: 3),
                              const Icon(Icons.arrow_forward_rounded, color: Colors.white, size: 10),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: _promos.asMap().entries.map((entry) {
            final isSelected = _currentPromoIndex == entry.key;
            return Container(
              width: isSelected ? 14 : 4,
              height: 3.5,
              margin: const EdgeInsets.symmetric(horizontal: 2),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(2),
                color: isSelected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.2),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildSearchPanel() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded, color: Color(0xFF9CA3AF), size: 18),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Search 50+ gift card brands...',
                  hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF6B7280)),
                  border: InputBorder.none,
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAccess() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Row(
        children: [
          Expanded(
            child: GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const GiftcardTradesHistoryScreen()),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [const Color(0xFF3B82F6).withOpacity(0.15), const Color(0xFF1D4ED8).withOpacity(0.05)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(color: const Color(0xFF3B82F6).withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                      child: const Center(child: Icon(Icons.receipt_long_rounded, color: Color(0xFF60A5FA), size: 18)),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('My Trades', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
                        Text('View active & past', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: GestureDetector(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LiveRatesScreen(initialIsGiftcardTab: true)),
                );
              },
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [const Color(0xFF10B981).withOpacity(0.15), const Color(0xFF047857).withOpacity(0.05)],
                  ),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32, height: 32,
                      decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.2), borderRadius: BorderRadius.circular(8)),
                      child: const Center(child: Icon(Icons.calculate_rounded, color: Color(0xFF34D399), size: 18)),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Rate Calculator', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
                        Text('Live unit values', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBrandGrid() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 3,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 0.92,
        ),
        itemCount: _brands.length,
        itemBuilder: (context, index) {
          final brand = _brands[index];
          return GestureDetector(
            onTap: () => _showTradeBottomSheet(brand),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: (brand['color'] as Color).withOpacity(0.1),
                        border: Border.all(color: (brand['color'] as Color).withOpacity(0.2)),
                      ),
                      child: Center(
                        child: Icon(brand['icon'], size: 20, color: brand['color']),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(brand['name'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white), textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
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
  final TextEditingController _ecodeController = TextEditingController();
  final List<File> _selectedImageFiles = [];
  final ImagePicker _imagePicker = ImagePicker();
  bool _isProcessing = false;
  String _uploadStatusText = '';

  static const _rates = [1550.0, 1750.0, 1680.0]; // NGN per unit for USD, GBP, EUR
  static const _currencySymbols = ['\$', '£', '€'];
  static const _currencyCodes = ['USD', 'GBP', 'EUR'];
  static const double _minTransactionAmount = 25.0;

  double get _cardValue => double.tryParse(_cardValueController.text.replaceAll(',', '').trim()) ?? 0;
  double get _nairaAmount => _cardValue * _rates[_currencyIndex];

  @override
  void initState() {
    super.initState();
    _cardValueController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _cardValueController.dispose();
    _ecodeController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    try {
      final List<XFile> picked = await _imagePicker.pickMultiImage(
        imageQuality: 85,
        maxWidth: 1600,
      );
      if (picked.isNotEmpty) {
        setState(() {
          for (final x in picked) {
            _selectedImageFiles.add(File(x.path));
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open image picker: $e', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _selectedImageFiles.removeAt(index);
    });
  }

  Future<void> _submitTrade() async {
    final currencySymbol = _currencySymbols[_currencyIndex];
    
    // 1. Minimum Amount Validation ($25 equivalent)
    if (_cardValue < _minTransactionAmount) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Minimum trade amount is ${currencySymbol}${_minTransactionAmount.toStringAsFixed(0)}',
            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
          ),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
      return;
    }

    // 2. Physical Card Image Upload Validation
    if (_typeIndex == 0 && _selectedImageFiles.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please tap and upload at least one image of your gift card proof or receipt.',
            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
          ),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
      return;
    }

    // 3. E-Code / PIN Validation
    if (_typeIndex == 1 && _ecodeController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Please enter your gift card e-code PIN or voucher code.',
            style: GoogleFonts.plusJakartaSans(fontWeight: FontWeight.w700),
          ),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
      return;
    }

    setState(() {
      _isProcessing = true;
      _uploadStatusText = _typeIndex == 0 ? 'Uploading card proof...' : 'Submitting trade...';
    });

    try {
      final authProvider = context.read<AuthProvider>();
      final uid = authProvider.firebaseUser!.uid;
      final userName = authProvider.userModel?.fullName ?? authProvider.firebaseUser?.displayName ?? 'App User';
      final userEmail = authProvider.userModel?.email ?? authProvider.firebaseUser?.email ?? '';

      // Upload images if physical
      final List<String> uploadedUrls = [];
      if (_typeIndex == 0 && _selectedImageFiles.isNotEmpty) {
        for (int i = 0; i < _selectedImageFiles.length; i++) {
          final file = _selectedImageFiles[i];
          final ext = file.path.split('.').last;
          final fileName = 'gift_${DateTime.now().millisecondsSinceEpoch}_$i.$ext';
          
          setState(() {
            _uploadStatusText = 'Uploading image ${i + 1}/${_selectedImageFiles.length}...';
          });

          final url = await StorageService().uploadGiftcardImage(
            uid: uid,
            filePath: file.path,
            fileName: fileName,
          );
          uploadedUrls.add(url);
        }
      }

      setState(() {
        _uploadStatusText = 'Finalizing trade ticket...';
      });

      final cardTypeStr = _typeIndex == 0 ? 'physical' : 'ecode';
      final currencyCode = _currencyCodes[_currencyIndex];
      final brandName = widget.brand['name'] as String? ?? 'Giftcard';
      final rate = _rates[_currencyIndex];
      final ecodeText = _typeIndex == 1 ? _ecodeController.text.trim() : null;

      // Create Firestore trade doc
      final tradeData = {
        'uid': uid,
        'userName': userName,
        'userEmail': userEmail,
        'brandName': brandName,
        'brandId': (widget.brand['id'] ?? brandName).toString().toLowerCase(),
        'currency': currencyCode,
        'cardType': cardTypeStr,
        'cardValue': _cardValue,
        'rateApplied': rate,
        'payoutAmount': _nairaAmount,
        'cardImageUrls': uploadedUrls,
        'ecode': ecodeText,
        'comment': null,
        'status': 'pending',
        'createdAt': FieldValue.serverTimestamp(),
      };

      final tradeId = await FirestoreService().createGiftcardTrade(tradeData);

      // Create transaction history record
      final tx = TransactionModel(
        id: '',
        uid: uid,
        type: TransactionType.giftcard,
        status: TransactionStatus.pending,
        amountNaira: _nairaAmount,
        description: 'Sell $brandName - ${currencySymbol}${_cardValue.toStringAsFixed(0)} ($cardTypeStr)',
        reference: 'GC-$tradeId',
        createdAt: DateTime.now(),
        cardBrand: brandName,
      );
      await FirestoreService().createTransaction(tx);

      if (mounted) {
        Navigator.pop(context);
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => GiftcardTradePreviewScreen(
              tradeId: tradeId,
              brandName: brandName,
              cardValue: _cardValue,
              currency: currencyCode,
              rateApplied: rate,
              payoutAmount: _nairaAmount,
              cardType: cardTypeStr,
              cardImageUrls: uploadedUrls,
              ecode: ecodeText,
              status: 'pending',
              createdAt: DateTime.now(),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Trade submission failed: $e', style: GoogleFonts.plusJakartaSans()),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final currencySymbol = _currencySymbols[_currencyIndex];
    
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
                    Expanded(child: _typeTab(0, Icons.credit_card_rounded, 'Physical Card')),
                    const SizedBox(width: 12),
                    Expanded(child: _typeTab(1, Icons.qr_code_rounded, 'E-Code / PIN')),
                  ],
                ),
                const SizedBox(height: 24),

                // Amount Input with Min $25 indication
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Card Face Value', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2563EB).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            'Min. ${currencySymbol}25',
                            style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF60A5FA)),
                          ),
                        ),
                      ],
                    ),
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
                          Text(currencySymbol, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextField(
                              controller: _cardValueController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                              decoration: InputDecoration(
                                hintText: 'Min. ${currencySymbol}25 (e.g. 100)',
                                hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white30),
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
                const SizedBox(height: 20),

                // Physical: Interactive Upload Box with Multi-Image Support
                if (_typeIndex == 0) ...[
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Card Images & Proof', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
                          if (_selectedImageFiles.isNotEmpty)
                            Text(
                              '${_selectedImageFiles.length} photo(s) selected',
                              style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF34D399)),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      if (_selectedImageFiles.isEmpty)
                        GestureDetector(
                          onTap: _pickImages,
                          child: Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(vertical: 22),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.02),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
                            ),
                            child: Column(
                              children: [
                                Container(
                                  width: 44, height: 44,
                                  decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.15), shape: BoxShape.circle),
                                  child: const Center(child: Icon(Icons.cloud_upload_rounded, color: Color(0xFF60A5FA), size: 22)),
                                ),
                                const SizedBox(height: 10),
                                Text('Tap to upload card images & receipt', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                                const SizedBox(height: 2),
                                Text('Select front, back, or purchase slip', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
                              ],
                            ),
                          ),
                        )
                      else ...[
                        // Horizontal scrollable preview strip of selected files
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.02),
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.white.withOpacity(0.1)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SingleChildScrollView(
                                scrollDirection: Axis.horizontal,
                                child: Row(
                                  children: [
                                    ...List.generate(_selectedImageFiles.length, (index) {
                                      final file = _selectedImageFiles[index];
                                      return Container(
                                        width: 80,
                                        height: 64,
                                        margin: const EdgeInsets.only(right: 8),
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                                          image: DecorationImage(
                                            image: FileImage(file),
                                            fit: BoxFit.cover,
                                          ),
                                        ),
                                        child: Stack(
                                          children: [
                                            Positioned(
                                              top: 2,
                                              right: 2,
                                              child: GestureDetector(
                                                onTap: () => _removeImage(index),
                                                child: Container(
                                                  padding: const EdgeInsets.all(2),
                                                  decoration: const BoxDecoration(
                                                    color: Colors.black87,
                                                    shape: BoxShape.circle,
                                                  ),
                                                  child: const Icon(Icons.close_rounded, size: 12, color: Colors.white),
                                                ),
                                              ),
                                            ),
                                            Positioned(
                                              bottom: 2,
                                              left: 2,
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: Colors.black.withOpacity(0.7),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text(
                                                  '#${index + 1}',
                                                  style: GoogleFonts.plusJakartaSans(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.white),
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      );
                                    }),
                                    GestureDetector(
                                      onTap: _pickImages,
                                      child: Container(
                                        width: 64,
                                        height: 64,
                                        decoration: BoxDecoration(
                                          color: Colors.white.withOpacity(0.05),
                                          borderRadius: BorderRadius.circular(10),
                                          border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.4)),
                                        ),
                                        child: const Column(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Icon(Icons.add_photo_alternate_rounded, color: Color(0xFF60A5FA), size: 20),
                                            SizedBox(height: 2),
                                            Text('+ Add', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: Color(0xFF60A5FA))),
                                          ],
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
                    ],
                  ),
                ] else ...[
                  // E-Code: Compact Textarea (No Image Upload)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('E-Code / PIN / Voucher Digits', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withOpacity(0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              'DIGITAL CODE',
                              style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: const Color(0xFF34D399)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.03),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.1)),
                        ),
                        child: TextField(
                          controller: _ecodeController,
                          maxLines: 3,
                          minLines: 2,
                          style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white),
                          decoration: InputDecoration(
                            hintText: 'Enter gift card e-code, PIN, or digital redemption voucher digits...',
                            hintStyle: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white30),
                            border: InputBorder.none,
                            isDense: true,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
                const SizedBox(height: 20),

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
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('You will receive', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
                          Text('Rate: ₦${NumberFormat('#,##0').format(_rates[_currencyIndex])}/$currencySymbol', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                        ],
                      ),
                      Builder(builder: (_) => Text(
                        '\u20A6${NumberFormat('#,##0').format(_nairaAmount)}',
                        style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA)),
                      )),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

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
                          ? Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)),
                                const SizedBox(width: 10),
                                Text(
                                  _uploadStatusText.isNotEmpty ? _uploadStatusText : 'Submitting Trade...',
                                  style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white),
                                ),
                              ],
                            )
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
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _typeIndex = index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF2563EB).withOpacity(0.15) : Colors.white.withOpacity(0.04),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: isActive ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.08)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 15, color: isActive ? const Color(0xFF60A5FA) : const Color(0xFF9CA3AF)),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: isActive ? const Color(0xFF60A5FA) : const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

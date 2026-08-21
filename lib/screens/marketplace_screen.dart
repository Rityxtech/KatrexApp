import 'dart:ui';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/p2p_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/pin_input_sheet.dart';
import '../widgets/universal_icon.dart';
import 'order_screen.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  int _tabIndex = 0; // 0: Buy, 1: My Listings, 2: My Orders
  String _selectedPlatform = 'All';

  final List<String> _platforms = ['All', 'Instagram', 'TikTok', 'YouTube', 'X', 'WhatsApp'];
  final List<dynamic> _platformIcons = [
    FontAwesomeIcons.layerGroup,
    FontAwesomeIcons.instagram,
    FontAwesomeIcons.tiktok,
    FontAwesomeIcons.youtube,
    FontAwesomeIcons.xTwitter,
    FontAwesomeIcons.whatsapp,
  ];
  final List<Color> _platformColors = [
    Colors.white,
    const Color(0xFFE1306C),
    Colors.white,
    const Color(0xFFFF0000),
    Colors.white,
    const Color(0xFF25D366),
  ];

  // Pagination for My Listings
  final ScrollController _myListingsScrollController = ScrollController();
  final List<DocumentSnapshot<Map<String, dynamic>>> _myListingDocs = [];
  bool _isLoadingInitialMyListings = false;
  bool _isLoadingMoreMyListings = false;
  bool _hasMoreMyListings = true;
  DocumentSnapshot? _lastMyListingDoc;

  // Pagination for My Orders
  final ScrollController _myOrdersScrollController = ScrollController();
  final List<DocumentSnapshot<Map<String, dynamic>>> _myOrderDocs = [];
  bool _isLoadingInitialMyOrders = false;
  bool _isLoadingMoreMyOrders = false;
  bool _hasMoreMyOrders = true;
  DocumentSnapshot? _lastMyOrderDoc;

  static const int _pageSize = 10;

  @override
  void initState() {
    super.initState();
    _myListingsScrollController.addListener(_onMyListingsScroll);
    _myOrdersScrollController.addListener(_onMyOrdersScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchInitialMyListings();
      _fetchInitialMyOrders();
    });
  }

  @override
  void dispose() {
    _myListingsScrollController.removeListener(_onMyListingsScroll);
    _myOrdersScrollController.removeListener(_onMyOrdersScroll);
    _myListingsScrollController.dispose();
    _myOrdersScrollController.dispose();
    super.dispose();
  }

  void _onMyListingsScroll() {
    if (_myListingsScrollController.position.pixels >=
        _myListingsScrollController.position.maxScrollExtent - 200) {
      _fetchMoreMyListings();
    }
  }

  void _onMyOrdersScroll() {
    if (_myOrdersScrollController.position.pixels >=
        _myOrdersScrollController.position.maxScrollExtent - 200) {
      _fetchMoreMyOrders();
    }
  }

  Future<void> _fetchInitialMyListings() async {
    final uid = context.read<AuthProvider>().firebaseUser?.uid ?? '';
    if (uid.isEmpty) return;
    if (_isLoadingInitialMyListings) return;

    setState(() {
      _isLoadingInitialMyListings = true;
      _myListingDocs.clear();
      _lastMyListingDoc = null;
      _hasMoreMyListings = true;
    });

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('p2p_listings')
          .where('sellerUid', isEqualTo: uid)
          .limit(_pageSize)
          .get();

      if (!mounted) return;
      setState(() {
        _myListingDocs.addAll(snapshot.docs);
        if (snapshot.docs.isNotEmpty) {
          _lastMyListingDoc = snapshot.docs.last;
        }
        _hasMoreMyListings = snapshot.docs.length >= _pageSize;
        _isLoadingInitialMyListings = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingInitialMyListings = false);
    }
  }

  Future<void> _fetchMoreMyListings() async {
    final uid = context.read<AuthProvider>().firebaseUser?.uid ?? '';
    if (uid.isEmpty || !_hasMoreMyListings || _isLoadingMoreMyListings || _isLoadingInitialMyListings || _lastMyListingDoc == null) {
      return;
    }

    setState(() => _isLoadingMoreMyListings = true);

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('p2p_listings')
          .where('sellerUid', isEqualTo: uid)
          .startAfterDocument(_lastMyListingDoc!)
          .limit(_pageSize)
          .get();

      if (!mounted) return;
      setState(() {
        _myListingDocs.addAll(snapshot.docs);
        if (snapshot.docs.isNotEmpty) {
          _lastMyListingDoc = snapshot.docs.last;
        }
        _hasMoreMyListings = snapshot.docs.length >= _pageSize;
        _isLoadingMoreMyListings = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingMoreMyListings = false);
    }
  }

  Future<void> _fetchInitialMyOrders() async {
    final uid = context.read<AuthProvider>().firebaseUser?.uid ?? '';
    if (uid.isEmpty) return;
    if (_isLoadingInitialMyOrders) return;

    setState(() {
      _isLoadingInitialMyOrders = true;
      _myOrderDocs.clear();
      _lastMyOrderDoc = null;
      _hasMoreMyOrders = true;
    });

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('p2p_trades')
          .where('participants', arrayContains: uid)
          .limit(_pageSize)
          .get();

      if (!mounted) return;
      setState(() {
        _myOrderDocs.addAll(snapshot.docs);
        if (snapshot.docs.isNotEmpty) {
          _lastMyOrderDoc = snapshot.docs.last;
        }
        _hasMoreMyOrders = snapshot.docs.length >= _pageSize;
        _isLoadingInitialMyOrders = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingInitialMyOrders = false);
    }
  }

  Future<void> _fetchMoreMyOrders() async {
    final uid = context.read<AuthProvider>().firebaseUser?.uid ?? '';
    if (uid.isEmpty || !_hasMoreMyOrders || _isLoadingMoreMyOrders || _isLoadingInitialMyOrders || _lastMyOrderDoc == null) {
      return;
    }

    setState(() => _isLoadingMoreMyOrders = true);

    try {
      final snapshot = await FirebaseFirestore.instance
          .collection('p2p_trades')
          .where('participants', arrayContains: uid)
          .startAfterDocument(_lastMyOrderDoc!)
          .limit(_pageSize)
          .get();

      if (!mounted) return;
      setState(() {
        _myOrderDocs.addAll(snapshot.docs);
        if (snapshot.docs.isNotEmpty) {
          _lastMyOrderDoc = snapshot.docs.last;
        }
        _hasMoreMyOrders = snapshot.docs.length >= _pageSize;
        _isLoadingMoreMyOrders = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingMoreMyOrders = false);
    }
  }

  void _openFilterSheet() => _showBottomSheet(const _FilterSheet());
  void _openCheckoutSheet(Map<String, dynamic> item) => _showBottomSheet(_CheckoutSheet(item: item));
  void _openCreateListingSheet() => _showBottomSheet(_CreateListingSheet(onCreated: _fetchInitialMyListings));

  void _showBottomSheet(Widget child) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => child,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _headerBtn(Icons.arrow_back_rounded, () => Navigator.maybePop(context)),
                      Text(
                        'P2P Marketplace',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                      const NotificationIcon(),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildTabs(),
                  const SizedBox(height: 16),
                  Expanded(
                    child: _tabIndex == 0
                        ? _buildBuyView()
                        : _tabIndex == 1
                            ? _buildMyListingsView()
                            : _buildMyOrdersView(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _headerBtn(IconData icon, VoidCallback onTap) => GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.06),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Icon(icon, color: Colors.white, size: 18),
        ),
      );

  Widget _buildTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          _tabButton('Buy Accounts', Icons.shopping_cart_rounded, _tabIndex == 0, () {
            setState(() => _tabIndex = 0);
          }),
          _tabButton('My Listings', Icons.store_rounded, _tabIndex == 1, () {
            setState(() => _tabIndex = 1);
            if (_myListingDocs.isEmpty && !_isLoadingInitialMyListings) {
              _fetchInitialMyListings();
            }
          }),
          _tabButton('My Orders', Icons.receipt_long_rounded, _tabIndex == 2, () {
            setState(() => _tabIndex = 2);
            if (_myOrderDocs.isEmpty && !_isLoadingInitialMyOrders) {
              _fetchInitialMyOrders();
            }
          }),
        ],
      ),
    );
  }

  Widget _tabButton(String label, IconData icon, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(vertical: 9),
          decoration: BoxDecoration(
            color: active ? const Color(0xFF2563EB) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: const Color(0xFF2563EB).withOpacity(0.35),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    )
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 13, color: active ? Colors.white : const Color(0xFF9CA3AF)),
              const SizedBox(width: 4),
              Text(
                label,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: active ? Colors.white : const Color(0xFF9CA3AF),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ─── BUY VIEW ─────────────────────────────────────────────────────────────

  Widget _buildBuyView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFF10B981).withOpacity(0.1),
                borderRadius: BorderRadius.circular(6),
                border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.shield_rounded, size: 12, color: Color(0xFF34D399)),
                  const SizedBox(width: 4),
                  Text(
                    '100% ESCROW PROTECTED',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF34D399),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: _openFilterSheet,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white.withOpacity(0.1)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.tune_rounded, size: 13, color: Colors.white70),
                    const SizedBox(width: 4),
                    Text(
                      'Filter',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white70,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 38,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _platforms.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final platform = _platforms[index];
              final isSelected = _selectedPlatform == platform;
              return GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => setState(() => _selectedPlatform = platform),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.white : Colors.white.withOpacity(0.06),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSelected ? Colors.white : Colors.white.withOpacity(0.1),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      UniversalIcon(
                        _platformIcons[index],
                        size: 13,
                        color: isSelected ? Colors.black : _platformColors[index],
                      ),
                      const SizedBox(width: 6),
                      Text(
                        platform,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                          color: isSelected ? Colors.black : Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: StreamBuilder<QuerySnapshot<Map<String, dynamic>>>(
            stream: FirebaseFirestore.instance
                .collection('p2p_listings')
                .where('status', isEqualTo: 'live')
                .snapshots(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)));
              }

              List<Map<String, dynamic>> items = [];

              if (snapshot.hasData && snapshot.data!.docs.isNotEmpty) {
                items = snapshot.data!.docs.map((doc) {
                  final data = doc.data();
                  data['id'] = doc.id;
                  if (data['price'] == null && data['priceNaira'] != null) {
                    data['price'] = '₦${NumberFormat('#,##0').format(data['priceNaira'])}';
                  }
                  return data;
                }).toList();
              }

              if (_selectedPlatform != 'All') {
                items = items.where((i) => (i['platform'] ?? '').toString().toLowerCase() == _selectedPlatform.toLowerCase()).toList();
              }

              if (items.isEmpty) {
                return Center(
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: const Color(0xFF2563EB).withOpacity(0.12),
                            border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.25)),
                          ),
                          child: const Center(
                            child: Icon(Icons.storefront_outlined, size: 32, color: Color(0xFF60A5FA)),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Text(
                          'No Live Listings Available',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 28),
                          child: Text(
                            _selectedPlatform == 'All'
                                ? 'Submitted listings require admin approval before going live. Check back shortly or post an account to sell!'
                                : 'No verified $_selectedPlatform accounts currently listed. Try another category or list yours!',
                            textAlign: TextAlign.center,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white54,
                              height: 1.4,
                            ),
                          ),
                        ),
                        const SizedBox(height: 18),
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () => _openCreateListingSheet(),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF2563EB),
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF2563EB).withOpacity(0.35),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                                const SizedBox(width: 6),
                                Text(
                                  'Post Account to Sell',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
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

              return ListView.builder(
                padding: const EdgeInsets.only(bottom: 40),
                itemCount: items.length,
                itemBuilder: (context, index) => _buildListingCard(items[index]),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildListingCard(Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF131B2E).withOpacity(0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () => _openCheckoutSheet(item),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildPlatformIcon(item),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Flexible(
                                child: Text(
                                  item['title'] ?? 'Social Account',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              if (item['verified'] == true) ...[
                                const SizedBox(width: 4),
                                const Icon(Icons.verified_rounded, size: 14, color: Color(0xFF3B82F6)),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item['handle'] ?? '@account',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          item['price'] ?? (item['priceNaira'] != null ? '₦${NumberFormat('#,##0').format(item['priceNaira'])}' : '₦0'),
                          style: GoogleFonts.robotoMono(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF34D399),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          item['priceType'] ?? 'Fixed Price',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF6B7280),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const Divider(color: Color(0x0DFFFFFF), height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        _buildMetric('Followers', '${item['followers'] ?? '1k'}'),
                        const SizedBox(width: 20),
                        _buildMetric('Niche', item['niche'] ?? 'General'),
                      ],
                    ),
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => _openCheckoutSheet(item),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB),
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF2563EB).withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Text(
                          'Buy Now',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPlatformIcon(Map<String, dynamic> item) {
    final platform = item['platform'] as String? ?? 'Instagram';
    final iconData = _iconForPlatform(platform);
    final gradient = item['bgGradient'] as LinearGradient?;
    final bgColor = item['bgColor'] as Color? ?? _colorForPlatform(platform);

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        gradient: gradient,
        color: gradient == null ? bgColor : null,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: UniversalIcon(iconData, size: 20, color: Colors.white),
      ),
    );
  }

  Object _iconForPlatform(String platform) {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return FontAwesomeIcons.instagram;
      case 'tiktok':
        return FontAwesomeIcons.tiktok;
      case 'youtube':
        return FontAwesomeIcons.youtube;
      case 'x':
      case 'twitter':
        return FontAwesomeIcons.xTwitter;
      case 'whatsapp':
        return FontAwesomeIcons.whatsapp;
      default:
        return Icons.store_rounded;
    }
  }

  Color _colorForPlatform(String platform) {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return const Color(0xFFE1306C);
      case 'tiktok':
        return Colors.black;
      case 'youtube':
        return const Color(0xFFFF0000);
      case 'x':
      case 'twitter':
        return Colors.black;
      case 'whatsapp':
        return const Color(0xFF25D366);
      default:
        return const Color(0xFF2563EB);
    }
  }

  Widget _buildMetric(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            color: const Color(0xFF6B7280),
            letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: FontWeight.w900,
            color: Colors.white,
          ),
        ),
      ],
    );
  }

  // ─── MY LISTINGS VIEW ─────────────────────────────────────────────────────

  Widget _buildMyListingsView() {
    final uid = context.read<AuthProvider>().firebaseUser?.uid ?? '';
    return Column(
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: _openCreateListingSheet,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 18),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB).withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3)),
            ),
            child: Column(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: Color(0xFF2563EB),
                    shape: BoxShape.circle,
                    boxShadow: [BoxShadow(color: Color(0x402563EB), blurRadius: 15, offset: Offset(0, 4))],
                  ),
                  child: const Icon(Icons.add_rounded, color: Colors.white, size: 24),
                ),
                const SizedBox(height: 8),
                Text(
                  'Post New Account',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Earn safely with guaranteed escrow payout',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF60A5FA),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _fetchInitialMyListings,
            color: const Color(0xFF2563EB),
            backgroundColor: const Color(0xFF131B2E),
            child: _isLoadingInitialMyListings
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
                : _myListingDocs.isEmpty
                    ? ListView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        children: [
                          SizedBox(height: MediaQuery.sizeOf(context).height * 0.15),
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.storefront_outlined, size: 48, color: Colors.white24),
                                const SizedBox(height: 12),
                                Text(
                                  'You have not posted any accounts yet',
                                  style: GoogleFonts.plusJakartaSans(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        controller: _myListingsScrollController,
                        physics: const AlwaysScrollableScrollPhysics(),
                        padding: const EdgeInsets.only(bottom: 40),
                        itemCount: _myListingDocs.length + (_hasMoreMyListings ? 1 : 0),
                        itemBuilder: (context, i) {
                          if (i == _myListingDocs.length) {
                            return const Padding(
                              padding: EdgeInsets.symmetric(vertical: 20),
                              child: Center(
                                child: SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.5,
                                    color: Color(0xFF2563EB),
                                  ),
                                ),
                              ),
                            );
                          }
                          final data = _myListingDocs[i].data() ?? {};
                          data['id'] = _myListingDocs[i].id;
                          return _buildMyListingCard(data);
                        },
                      ),
          ),
        ),
      ],
    );
  }

  Widget _buildMyListingCard(Map<String, dynamic> item) {
    final status = (item['status'] as String? ?? 'pending').toLowerCase();
    Color statusColor;
    String statusLabel;
    IconData statusIcon;

    switch (status) {
      case 'live':
      case 'active':
        statusColor = const Color(0xFF10B981);
        statusLabel = 'LIVE IN MARKET';
        statusIcon = Icons.check_circle_rounded;
        break;
      case 'in_trade':
      case 'escrow_locked':
        statusColor = const Color(0xFF3B82F6);
        statusLabel = 'IN ACTIVE ESCROW';
        statusIcon = Icons.lock_clock_rounded;
        break;
      case 'sold':
      case 'completed':
        statusColor = const Color(0xFF6B7280);
        statusLabel = 'SOLD';
        statusIcon = Icons.task_alt_rounded;
        break;
      case 'rejected':
        statusColor = const Color(0xFFEF4444);
        statusLabel = 'REJECTED';
        statusIcon = Icons.cancel_rounded;
        break;
      case 'pending':
      case 'pending_review':
      default:
        statusColor = const Color(0xFFF59E0B);
        statusLabel = 'PENDING ADMIN APPROVAL';
        statusIcon = Icons.hourglass_top_rounded;
    }

    final price = item['price'] ??
        (item['priceNaira'] != null
            ? '₦${NumberFormat('#,##0').format(item['priceNaira'])}'
            : '₦0');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF131B2E).withOpacity(0.7),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: statusColor.withOpacity(0.25)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: statusColor.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(statusIcon, size: 12, color: statusColor),
                      const SizedBox(width: 5),
                      Text(
                        statusLabel,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: statusColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  price,
                  style: GoogleFonts.robotoMono(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF34D399),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _buildPlatformIcon(item),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['title'] ?? 'Social Account',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        item['handle'] ?? '@account',
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF9CA3AF),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(color: Color(0x0DFFFFFF), height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildMetric('Followers', '${item['followers'] ?? '1k'}'),
                _buildMetric('Niche', item['niche'] ?? 'General'),
                _buildMetric('Type', item['priceType'] ?? 'Fixed'),
              ],
            ),
            if (status == 'rejected' && item['rejectionReason'] != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFEF4444).withOpacity(0.2)),
                ),
                child: Text(
                  'Admin Note: ${item['rejectionReason']}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFFFCA5A5),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ─── MY ORDERS VIEW ───────────────────────────────────────────────────────

  Widget _buildMyOrdersView() {
    return RefreshIndicator(
      onRefresh: _fetchInitialMyOrders,
      color: const Color(0xFF2563EB),
      backgroundColor: const Color(0xFF131B2E),
      child: _isLoadingInitialMyOrders
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)))
          : _myOrderDocs.isEmpty
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    SizedBox(height: MediaQuery.sizeOf(context).height * 0.2),
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.receipt_long_outlined, size: 52, color: Colors.white24),
                          const SizedBox(height: 12),
                          Text(
                            'No orders yet',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Browse "Buy Accounts" to place your first trade',
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF9CA3AF),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : ListView.builder(
                  controller: _myOrdersScrollController,
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.only(bottom: 40),
                  itemCount: _myOrderDocs.length + (_hasMoreMyOrders ? 1 : 0),
                  itemBuilder: (context, index) {
                    if (index == _myOrderDocs.length) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: 20),
                        child: Center(
                          child: SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Color(0xFF2563EB),
                            ),
                          ),
                        ),
                      );
                    }
                    final trade = _myOrderDocs[index].data() ?? {};
                    trade['id'] = _myOrderDocs[index].id;
                    return _buildOrderCard(trade);
                  },
                ),
    );
  }

  Widget _buildOrderCard(Map<String, dynamic> trade) {
    final uid = context.read<AuthProvider>().firebaseUser?.uid ?? '';
    final isBuyer = (trade['buyerUid'] == uid) || (trade['buyerId'] == uid);
    final isSeller = (trade['sellerUid'] == uid) || (trade['sellerId'] == uid);

    final roleColor = isBuyer ? const Color(0xFF10B981) : const Color(0xFF8B5CF6);
    final roleLabel = isBuyer ? 'BUY' : (isSeller ? 'SELL' : 'TRADE');
    final roleIcon = isBuyer ? Icons.shopping_bag_outlined : Icons.sell_outlined;

    final status = (trade['status'] as String? ?? 'escrow_locked').toLowerCase();
    Color statusColor;
    String statusLabel;

    switch (status) {
      case 'completed':
        statusColor = const Color(0xFF10B981);
        statusLabel = 'COMPLETED';
        break;
      case 'credentials_sent':
        statusColor = const Color(0xFF3B82F6);
        statusLabel = 'CREDENTIALS SENT';
        break;
      case 'disputed':
        statusColor = const Color(0xFFEF4444);
        statusLabel = 'DISPUTED';
        break;
      case 'cancelled':
        statusColor = const Color(0xFF6B7280);
        statusLabel = 'CANCELLED';
        break;
      default:
        statusColor = const Color(0xFFF59E0B);
        statusLabel = 'ESCROW LOCKED';
    }

    final price = trade['priceNaira'] != null
        ? '₦${NumberFormat('#,##0').format(trade['priceNaira'])}'
        : '₦0';

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => OrderScreen(item: trade)),
        );
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: roleColor.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: roleColor.withOpacity(0.4)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(roleIcon, size: 11, color: roleColor),
                          const SizedBox(width: 4),
                          Text(
                            roleLabel,
                            style: GoogleFonts.plusJakartaSans(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: roleColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: statusColor.withOpacity(0.3)),
                      ),
                      child: Text(
                        statusLabel,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: statusColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  price,
                  style: GoogleFonts.robotoMono(
                    fontSize: 15,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF34D399),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              trade['listingTitle'] ?? trade['title'] ?? 'P2P Order #${trade['id'].toString().substring(0, 6)}',
              style: GoogleFonts.plusJakartaSans(
                fontSize: 15,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order ID: #${trade['id'].toString().substring(0, 8)}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF9CA3AF),
                  ),
                ),
                Row(
                  children: [
                    Text(
                      'View Order',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF60A5FA),
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Icon(Icons.arrow_forward_ios_rounded, size: 10, color: Color(0xFF60A5FA)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ─── BOTTOM SHEETS ──────────────────────────────────────────────────────────

class _BottomSheetWrapper extends StatelessWidget {
  final Widget child;
  const _BottomSheetWrapper({required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top + 60),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.75),
        decoration: const BoxDecoration(
          color: Color(0xFF0F1423),
          borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          border: Border(top: BorderSide(color: Color(0x14FFFFFF))),
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                child: child,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SheetHeader extends StatelessWidget {
  final String title;
  const _SheetHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Center(
          child: Container(
            width: 48,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
        ),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 18,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => Navigator.pop(context),
              child: Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.close_rounded, color: Color(0xFF9CA3AF), size: 18),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet();
  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  String _selectedNiche = 'All Categories';
  final List<String> _niches = ['All Categories', 'Fashion', 'Comedy', 'Gaming', 'Technology', 'Lifestyle'];

  @override
  Widget build(BuildContext context) {
    return _BottomSheetWrapper(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SheetHeader(title: 'Filter Listings'),
          Flexible(
            child: ListView(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              children: [
                _sectionTitle('Category / Niche'),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _niches
                      .map((n) => _filterChip(n, _selectedNiche == n, () => setState(() => _selectedNiche = n)))
                      .toList(),
                ),
                const SizedBox(height: 24),
                _sectionTitle('Price Range (₦)'),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _rangeInput('Min:', '0'),
                    const SizedBox(width: 12),
                    Text('-', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                    const SizedBox(width: 12),
                    _rangeInput('Max:', 'Any'),
                  ],
                ),
                const SizedBox(height: 24),
                _sectionTitle('Followers Range'),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _rangeInput('Min:', '1k'),
                    const SizedBox(width: 12),
                    Text('-', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                    const SizedBox(width: 12),
                    _rangeInput('Max:', 'Any'),
                  ],
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Center(
                      child: Text(
                        'Reset',
                        style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                flex: 2,
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF2563EB),
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withOpacity(0.4),
                          blurRadius: 15,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Center(
                      child: Text(
                        'Apply Filters',
                        style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => Text(
        text,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF9CA3AF),
          letterSpacing: 1.5,
        ),
      );

  Widget _filterChip(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.1)),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.3),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: 13,
            fontWeight: FontWeight.w800,
            color: selected ? Colors.white : const Color(0xFF9CA3AF),
          ),
        ),
      ),
    );
  }

  Widget _rangeInput(String label, String hint) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
            const SizedBox(width: 8),
            Text(hint, style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
          ],
        ),
      ),
    );
  }
}

class _CheckoutSheet extends StatelessWidget {
  final Map<String, dynamic> item;
  const _CheckoutSheet({required this.item});

  @override
  Widget build(BuildContext context) {
    final platform = item['platform'] as String? ?? 'Instagram';
    final priceStr = item['price'] ?? '₦0';

    return _BottomSheetWrapper(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SheetHeader(title: 'Checkout'),
          Flexible(
            child: ListView(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.03),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white.withOpacity(0.08)),
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(0xFF2563EB),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: UniversalIcon(
                            _iconForPlatform(platform),
                            size: 20,
                            color: Colors.white,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              item['title'] ?? 'Social Account',
                              style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item['handle'] ?? '@account',
                              style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
                            ),
                          ],
                        ),
                      ),
                      Text(
                        priceStr,
                        style: GoogleFonts.robotoMono(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF34D399)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _detailRow('Account Price', priceStr),
                const SizedBox(height: 10),
                _detailRow('Escrow Fee', '₦0.00'),
                const SizedBox(height: 10),
                _detailRow('Total', priceStr, isTotal: true),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.shield_rounded, size: 18, color: Color(0xFF34D399)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Funds are held securely in escrow until you confirm account transfer.',
                          style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF34D399)),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () async {
              final pinPassed = await PinInputSheet.ensurePinRequired(context);
              if (!pinPassed) return;

              final listingId = item['id'] as String?;
              if (listingId != null && listingId.isNotEmpty && !listingId.startsWith('seed_')) {
                try {
                  final tradeId = await P2PService.buyListing(listingId: listingId);
                  final orderItem = Map<String, dynamic>.from(item);
                  orderItem['tradeId'] = tradeId;
                  if (context.mounted) {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (context) => OrderScreen(item: orderItem)));
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Error buying listing: $e'), backgroundColor: const Color(0xFFEF4444)),
                    );
                  }
                }
              } else {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (context) => OrderScreen(item: item)));
              }
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.4),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: Text(
                  'Confirm & Pay',
                  style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Object _iconForPlatform(String platform) {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return FontAwesomeIcons.instagram;
      case 'tiktok':
        return FontAwesomeIcons.tiktok;
      case 'youtube':
        return FontAwesomeIcons.youtube;
      case 'x':
      case 'twitter':
        return FontAwesomeIcons.xTwitter;
      case 'whatsapp':
        return FontAwesomeIcons.whatsapp;
      default:
        return Icons.store_rounded;
    }
  }

  Widget _detailRow(String label, String value, {bool isTotal = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.plusJakartaSans(
            fontSize: isTotal ? 16 : 14,
            fontWeight: isTotal ? FontWeight.w900 : FontWeight.w700,
            color: isTotal ? Colors.white : const Color(0xFF9CA3AF),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.robotoMono(
            fontSize: isTotal ? 18 : 14,
            fontWeight: FontWeight.w900,
            color: isTotal ? const Color(0xFF34D399) : Colors.white,
          ),
        ),
      ],
    );
  }
}

class _CreateListingSheet extends StatefulWidget {
  final VoidCallback? onCreated;
  const _CreateListingSheet({this.onCreated});
  @override
  State<_CreateListingSheet> createState() => _CreateListingSheetState();
}

class _CreateListingSheetState extends State<_CreateListingSheet> {
  String _selectedPlatform = 'Instagram';
  final List<String> _platforms = ['Instagram', 'TikTok', 'YouTube', 'X', 'WhatsApp'];
  final List<dynamic> _icons = [
    FontAwesomeIcons.instagram,
    FontAwesomeIcons.tiktok,
    FontAwesomeIcons.youtube,
    FontAwesomeIcons.xTwitter,
    FontAwesomeIcons.whatsapp,
  ];

  final _handleController = TextEditingController();
  final _followersController = TextEditingController();
  final _nicheController = TextEditingController();
  final _priceController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _handleController.dispose();
    _followersController.dispose();
    _nicheController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  Future<void> _submitListing() async {
    if (_isSubmitting) return;

    final handle = _handleController.text.trim();
    final followersText = _followersController.text.trim();
    final niche = _nicheController.text.trim();
    final priceText = _priceController.text.trim();

    if (handle.isEmpty || priceText.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter account handle and price')),
      );
      return;
    }

    final priceNaira = double.tryParse(priceText.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
    int followersCount = int.tryParse(followersText.replaceAll(RegExp(r'[^0-9]'), '')) ?? 1000;

    setState(() => _isSubmitting = true);

    try {
      await P2PService.createListing(
        platform: _selectedPlatform,
        handle: handle.startsWith('@') ? handle : '@$handle',
        title: '$_selectedPlatform Account ($handle)',
        niche: niche.isNotEmpty ? niche : 'General',
        followers: followersCount,
        verified: false,
        priceNaira: priceNaira,
        priceType: 'fixed',
      );

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      Navigator.pop(context);
      widget.onCreated?.call();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Listing submitted! Once approved by admin, it will go live.'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to submit listing: $e'),
          backgroundColor: const Color(0xFFEF4444),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return _BottomSheetWrapper(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SheetHeader(title: 'Sell Account'),
          Flexible(
            child: ListView(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              children: [
                _sectionTitle('Platform'),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: List.generate(
                    _platforms.length,
                    (i) => _platformChip(
                      _platforms[i],
                      _icons[i],
                      _selectedPlatform == _platforms[i],
                      () => setState(() => _selectedPlatform = _platforms[i]),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                _sectionTitle('Account Handle'),
                const SizedBox(height: 8),
                _inputField('@username', _handleController),
                const SizedBox(height: 20),
                _sectionTitle('Followers Count'),
                const SizedBox(height: 8),
                _inputField('e.g. 50000', _followersController, TextInputType.number),
                const SizedBox(height: 20),
                _sectionTitle('Niche / Category'),
                const SizedBox(height: 8),
                _inputField('e.g. Fashion, Comedy, Gaming', _nicheController),
                const SizedBox(height: 20),
                _sectionTitle('Price (₦)'),
                const SizedBox(height: 8),
                _inputField('e.g. 150000', _priceController, TextInputType.number),
                const SizedBox(height: 24),
              ],
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: _submitListing,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.4),
                    blurRadius: 15,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Center(
                child: _isSubmitting
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(
                        'Submit Listing',
                        style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
                      ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => Text(
        text,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 12,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF9CA3AF),
          letterSpacing: 1.5,
        ),
      );

  Widget _platformChip(String label, dynamic icon, bool selected, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            UniversalIcon(icon, size: 12, color: selected ? Colors.white : const Color(0xFF9CA3AF)),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: selected ? Colors.white : const Color(0xFF9CA3AF),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _inputField(String hint, [TextEditingController? controller, TextInputType keyboardType = TextInputType.text]) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280)),
          border: InputBorder.none,
        ),
      ),
    );
  }
}

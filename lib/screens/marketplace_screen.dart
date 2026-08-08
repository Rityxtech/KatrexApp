import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import 'order_screen.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  bool _isBuyTab = true;
  String _selectedPlatform = 'All';

  final List<Map<String, dynamic>> _listings = [
    {
      'platform': 'Instagram',
      'icon': FontAwesomeIcons.instagram,
      'bgGradient': const LinearGradient(
        colors: [Color(0xFFF09433), Color(0xFFE6683C), Color(0xFFDC2743), Color(0xFFBC1888)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
      'title': 'Fashion & Lifestyle',
      'handle': '@style_****',
      'verified': true,
      'price': '₦85,000',
      'priceType': 'Fixed Price',
      'followers': '12.5k',
      'niche': 'Fashion',
    },
    {
      'platform': 'TikTok',
      'icon': FontAwesomeIcons.tiktok,
      'bgColor': Colors.black,
      'borderColor': const Color(0xFF25F4EE),
      'shadowColor': const Color(0xFFFE2C55),
      'title': 'Comedy Skits',
      'handle': '@funny_****',
      'verified': true,
      'price': '₦350,000',
      'priceType': 'Negotiable',
      'followers': '105k',
      'niche': 'Comedy',
    },
    {
      'platform': 'YouTube',
      'icon': FontAwesomeIcons.youtube,
      'bgColor': const Color(0xFFFF0000),
      'title': 'Tech Reviews',
      'handle': '@tech_****',
      'verified': false,
      'price': '₦1,200,000',
      'priceType': 'Fixed Price',
      'followers': '450k',
      'niche': 'Technology',
    },
  ];

  final List<String> _platforms = ['All', 'Instagram', 'TikTok', 'YouTube'];
  final List<IconData> _platformIcons = [FontAwesomeIcons.layerGroup, FontAwesomeIcons.instagram, FontAwesomeIcons.tiktok, FontAwesomeIcons.youtube];
  final List<Color> _platformColors = [Colors.white, const Color(0xFFE1306C), Colors.white, const Color(0xFFFF0000)];

  void _openFilterSheet() => _showBottomSheet(const _FilterSheet());
  void _openCheckoutSheet(Map<String, dynamic> item) => _showBottomSheet(_CheckoutSheet(item: item));
  void _openCreateListingSheet() => _showBottomSheet(const _CreateListingSheet());

  void _showBottomSheet(Widget child) {
    showModalBottomSheet(context: context, backgroundColor: Colors.transparent, isScrollControlled: true, builder: (_) => child);
  }

  List<Map<String, dynamic>> get _filteredListings {
    if (_selectedPlatform == 'All') return _listings;
    return _listings.where((l) => l['platform'] == _selectedPlatform).toList();
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
                      _headerBtn(Icons.arrow_back_rounded, () => Navigator.pop(context)),
                      Text('Marketplace', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                      const NotificationIcon(),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildTabs(),
                  const SizedBox(height: 16),
                  Expanded(child: ListView(padding: const EdgeInsets.only(bottom: 40), children: [if (_isBuyTab) _buildBuyView() else _buildSellView()])),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _headerBtn(IconData icon, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))), child: Icon(icon, color: Colors.white, size: 18)),
  );

  Widget _buildTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.1))),
      child: Row(
        children: [
          _tabButton('Buy Accounts', Icons.shopping_cart_rounded, _isBuyTab, () => setState(() => _isBuyTab = true)),
          _tabButton('My Listings', Icons.store_rounded, !_isBuyTab, () => setState(() => _isBuyTab = false)),
        ],
      ),
    );
  }

  Widget _tabButton(String label, IconData icon, bool active, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(color: active ? const Color(0xFF2563EB) : Colors.transparent, borderRadius: BorderRadius.circular(12), boxShadow: active ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))] : null),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [Icon(icon, size: 14, color: active ? Colors.white : const Color(0xFF9CA3AF)), const SizedBox(width: 6), Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: active ? Colors.white : const Color(0xFF9CA3AF)))]),
        ),
      ),
    );
  }

  Widget _buildBuyView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.1), borderRadius: BorderRadius.circular(6), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2))),
              child: Row(children: [const Icon(Icons.shield_rounded, size: 12, color: Color(0xFF34D399)), const SizedBox(width: 4), Text('100% ESCROW PROTECTED', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF34D399), letterSpacing: 0.5))]),
            ),
            GestureDetector(
              onTap: _openFilterSheet,
              child: Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5), decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.white.withOpacity(0.1))), child: Row(children: [Text('Filter', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)), const SizedBox(width: 4), const Icon(Icons.tune_rounded, size: 12, color: Color(0xFF9CA3AF))])),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 34,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _platforms.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (context, index) {
              final isSelected = _selectedPlatform == _platforms[index];
              return GestureDetector(
                onTap: () => setState(() => _selectedPlatform = _platforms[index]),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(color: isSelected ? Colors.white : Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.1))),
                  child: Row(children: [Icon(_platformIcons[index], size: 12, color: isSelected ? Colors.black : _platformColors[index]), const SizedBox(width: 6), Text(_platforms[index], style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: isSelected ? Colors.black : Colors.white))]),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 16),
        ..._filteredListings.map((item) => _buildListingCard(item)),
      ],
    );
  }
  Widget _buildListingCard(Map<String, dynamic> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.08)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 32, offset: const Offset(0, 8))]),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(children: [
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                _buildPlatformIcon(item),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(children: [Text(item['title'], style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)), if (item['verified'] == true) ...[const SizedBox(width: 4), const Icon(Icons.verified_rounded, size: 14, color: Color(0xFF3B82F6))]]),
                    const SizedBox(height: 2),
                    Text(item['handle'], style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ]),
                ),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(item['price'], style: GoogleFonts.robotoMono(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                  const SizedBox(height: 2),
                  Text(item['priceType'], style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
                ]),
              ]),
              const Divider(color: Color(0x0DFFFFFF), height: 24),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Row(children: [_buildMetric('Followers', item['followers']), const SizedBox(width: 20), _buildMetric('Niche', item['niche'])]),
                GestureDetector(
                  onTap: () => _openCheckoutSheet(item),
                  child: Container(padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6), decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(8), boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))]), child: Text('Buy Now', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white))),
                ),
              ]),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _buildPlatformIcon(Map<String, dynamic> item) {
    final gradient = item['bgGradient'] as LinearGradient?;
    final bgColor = item['bgColor'] as Color?;
    final borderColor = item['borderColor'] as Color?;
    final shadowColor = item['shadowColor'] as Color?;
    return Container(
      width: 44, height: 44,
      decoration: BoxDecoration(gradient: gradient, color: gradient == null ? bgColor : null, borderRadius: BorderRadius.circular(12), border: borderColor != null ? Border.all(color: borderColor) : null, boxShadow: shadowColor != null ? [BoxShadow(color: shadowColor.withOpacity(0.4), blurRadius: 8, offset: const Offset(-2, 2))] : null),
      child: Center(child: FaIcon(item['icon'], size: 20, color: Colors.white)),
    );
  }

  Widget _buildMetric(String label, String value) {
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 0.5)),
      const SizedBox(height: 2),
      Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
    ]);
  }

  Widget _buildSellView() {
    return GestureDetector(
      onTap: _openCreateListingSheet,
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), borderRadius: BorderRadius.circular(20), border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.3))),
        child: Column(children: [
          Container(width: 48, height: 48, decoration: const BoxDecoration(color: Color(0xFF2563EB), shape: BoxShape.circle, boxShadow: [BoxShadow(color: Color(0x402563EB), blurRadius: 15, offset: Offset(0, 4))]), child: const Icon(Icons.add_rounded, color: Colors.white, size: 24)),
          const SizedBox(height: 12),
          Text('Post New Account', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
          const SizedBox(height: 4),
          Text('Admin approval takes ~2 hours', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF60A5FA))),
        ]),
      ),
    );
  }
}

class _BottomSheetWrapper extends StatelessWidget {
  final Widget child;
  const _BottomSheetWrapper({required this.child});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top + 60),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.75),
        decoration: const BoxDecoration(color: Color(0xFF0F1423), borderRadius: BorderRadius.vertical(top: Radius.circular(32)), border: Border(top: BorderSide(color: Color(0x14FFFFFF)))),
        child: ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
            child: SafeArea(
              top: false,
              child: Padding(padding: const EdgeInsets.fromLTRB(20, 16, 20, 24), child: child),
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
    return Column(children: [
      Center(child: Container(width: 48, height: 4, decoration: BoxDecoration(color: Colors.white.withOpacity(0.2), borderRadius: BorderRadius.circular(2)))),
      const SizedBox(height: 16),
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(width: 32, height: 32, decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle), child: const Icon(Icons.close_rounded, color: Color(0xFF9CA3AF), size: 18)),
        ),
      ]),
      const SizedBox(height: 8),
    ]);
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
                Wrap(spacing: 8, runSpacing: 8, children: _niches.map((n) => _filterChip(n, _selectedNiche == n, () => setState(() => _selectedNiche = n))).toList()),
                const SizedBox(height: 24),
                _sectionTitle('Price Range (₦)'),
                const SizedBox(height: 10),
                Row(children: [_rangeInput('Min:', '0'), const SizedBox(width: 12), Text('-', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))), const SizedBox(width: 12), _rangeInput('Max:', 'Any')]),
                const SizedBox(height: 24),
                _sectionTitle('Followers Range'),
                const SizedBox(height: 10),
                Row(children: [_rangeInput('Min:', '1k'), const SizedBox(width: 12), Text('-', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))), const SizedBox(width: 12), _rangeInput('Max:', 'Any')]),
                const SizedBox(height: 20),
              ],
            ),
          ),
          Row(children: [
            Expanded(
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(padding: const EdgeInsets.symmetric(vertical: 14), decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))), child: Center(child: Text('Reset', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)))),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(padding: const EdgeInsets.symmetric(vertical: 14), decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(12), boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 15, offset: const Offset(0, 4))]), child: Center(child: Text('Apply Filters', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)))),
              ),
            ),
          ]),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5));

  Widget _filterChip(String label, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.1)), boxShadow: selected ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 4))] : null),
        child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: selected ? Colors.white : const Color(0xFF9CA3AF))),
      ),
    );
  }

  Widget _rangeInput(String label, String hint) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
        child: Row(children: [Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))), const SizedBox(width: 8), Text(hint, style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white))]),
      ),
    );
  }
}

class _CheckoutSheet extends StatelessWidget {
  final Map<String, dynamic> item;
  const _CheckoutSheet({required this.item});

  @override
  Widget build(BuildContext context) {
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
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.08))),
                  child: Row(children: [
                    Container(
                      width: 44, height: 44,
                      decoration: BoxDecoration(color: (item['bgColor'] as Color?) ?? const Color(0xFF2563EB), borderRadius: BorderRadius.circular(12)),
                      child: Center(child: FaIcon(item['icon'], size: 20, color: Colors.white)),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(item['title'], style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white)),
                      const SizedBox(height: 2),
                      Text(item['handle'], style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                    ])),
                    Text(item['price'], style: GoogleFonts.robotoMono(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                  ]),
                ),
                const SizedBox(height: 20),
                _detailRow('Account Price', item['price']),
                const SizedBox(height: 10),
                _detailRow('Escrow Fee', '₦0.00'),
                const SizedBox(height: 10),
                _detailRow('Total', item['price'], isTotal: true),
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2))),
                  child: Row(children: [const Icon(Icons.shield_rounded, size: 18, color: Color(0xFF34D399)), const SizedBox(width: 10), Expanded(child: Text('Funds are held securely in escrow until you confirm account transfer.', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF34D399))))]),
                ),
                const SizedBox(height: 10),
              ],
            ),
          ),
          GestureDetector(
            onTap: () {
              Navigator.pop(context);
              Navigator.push(context, MaterialPageRoute(builder: (context) => OrderScreen(item: item)));
            },
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 15, offset: const Offset(0, 4))]),
              child: Center(child: Text('Confirm & Pay', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white))),
            ),
          ),
        ],
      ),
    );
  }

  Widget _detailRow(String label, String value, {bool isTotal = false}) {
    return Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF))),
      Text(value, style: GoogleFonts.robotoMono(fontSize: isTotal ? 16 : 14, fontWeight: FontWeight.w900, color: isTotal ? const Color(0xFF34D399) : Colors.white)),
    ]);
  }
}

class _CreateListingSheet extends StatefulWidget {
  const _CreateListingSheet();
  @override
  State<_CreateListingSheet> createState() => _CreateListingSheetState();
}

class _CreateListingSheetState extends State<_CreateListingSheet> {
  String _selectedPlatform = 'Instagram';
  final List<String> _platforms = ['Instagram', 'TikTok', 'YouTube', 'X', 'WhatsApp'];
  final List<IconData> _icons = [FontAwesomeIcons.instagram, FontAwesomeIcons.tiktok, FontAwesomeIcons.youtube, FontAwesomeIcons.xTwitter, FontAwesomeIcons.whatsapp];

  @override
  Widget build(BuildContext context) {
    return _BottomSheetWrapper(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SheetHeader(title: 'Post New Account'),
          Flexible(
            child: ListView(
              shrinkWrap: true,
              padding: EdgeInsets.zero,
              children: [
                _sectionTitle('Platform'),
                const SizedBox(height: 10),
                Wrap(spacing: 8, runSpacing: 8, children: List.generate(_platforms.length, (i) => _platformChip(_platforms[i], _icons[i], _selectedPlatform == _platforms[i], () => setState(() => _selectedPlatform = _platforms[i])))),
                const SizedBox(height: 20),
                _sectionTitle('Account Handle'),
                const SizedBox(height: 10),
                _inputField('@username'),
                const SizedBox(height: 20),
                _sectionTitle('Follower Count'),
                const SizedBox(height: 10),
                _inputField('e.g. 12.5k'),
                const SizedBox(height: 20),
                _sectionTitle('Niche / Category'),
                const SizedBox(height: 10),
                _inputField('e.g. Fashion'),
                const SizedBox(height: 20),
                Row(children: [
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_sectionTitle('Price'), const SizedBox(height: 10), _inputField('₦0.00')])),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [_sectionTitle('Pricing'), const SizedBox(height: 10), _inputField('Fixed')])),
                ]),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF2563EB).withOpacity(0.2))),
                  child: Row(children: [const Icon(Icons.info_outline_rounded, size: 18, color: Color(0xFF60A5FA)), const SizedBox(width: 10), Expanded(child: Text('Your account will be reviewed before going live.', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF60A5FA))))]),
                ),
              ],
            ),
          ),
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(color: const Color(0xFF2563EB), borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.4), blurRadius: 15, offset: const Offset(0, 4))]),
              child: Center(child: Text('Submit Listing', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white))),
            ),
          ),
        ],
      ),
    );
  }

  Widget _sectionTitle(String text) => Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5));

  Widget _platformChip(String label, IconData icon, bool selected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: selected ? const Color(0xFF2563EB) : Colors.white.withOpacity(0.1))),
        child: Row(mainAxisSize: MainAxisSize.min, children: [FaIcon(icon, size: 12, color: selected ? Colors.white : const Color(0xFF9CA3AF)), const SizedBox(width: 6), Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: selected ? Colors.white : const Color(0xFF9CA3AF)))]),
      ),
    );
  }

  Widget _inputField(String hint) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
      child: Text(hint, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
    );
  }
}

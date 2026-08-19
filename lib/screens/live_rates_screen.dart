import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../services/market_data_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';

class LiveRatesScreen extends StatefulWidget {
  final bool initialIsGiftcardTab;
  const LiveRatesScreen({super.key, this.initialIsGiftcardTab = false});

  @override
  State<LiveRatesScreen> createState() => _LiveRatesScreenState();
}

class _LiveRatesScreenState extends State<LiveRatesScreen> {
  late bool _isCryptoTab;
  int _selectedFilter = 0;
  bool _isSellAction = true;
  final TextEditingController _calcAmountController = TextEditingController(text: '100');
  final TextEditingController _searchController = TextEditingController();

  List<CoinMarketData> _liveCoins = [];
  StreamSubscription<List<CoinMarketData>>? _coinsSub;
  final double _ngnRate = 1450;

  static const Map<String, Map<String, dynamic>> _cryptoMeta = {
    'BTC': {'name': 'Bitcoin', 'network': 'BTC Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', 'iconColor': Color(0xFFF7931A)},
    'ETH': {'name': 'Ethereum', 'network': 'ERC20', 'iconUrl': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', 'iconColor': Color(0xFF627EEA)},
    'USDT': {'name': 'Tether', 'network': 'TRC20 / ERC20', 'iconUrl': 'https://assets.coingecko.com/coins/images/325/large/Tether.png', 'iconColor': Color(0xFF26A17B)},
    'TON': {'name': 'Toncoin', 'network': 'TON Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png', 'iconColor': Color(0xFF0098EA)},
    'SOL': {'name': 'Solana', 'network': 'SOL Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 'iconColor': Color(0xFF14F195)},
    'BNB': {'name': 'BNB', 'network': 'BSC', 'iconUrl': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', 'iconColor': Color(0xFFF3BA2F)},
    'XRP': {'name': 'Ripple', 'network': 'XRP Ledger', 'iconUrl': 'https://cryptologos.cc/logos/xrp-xrp-logo.png', 'iconColor': Color(0xFF23292F)},
    'DOGE': {'name': 'Dogecoin', 'network': 'DOGE Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png', 'iconColor': Color(0xFFC2A633)},
    'ADA': {'name': 'Cardano', 'network': 'Cardano', 'iconUrl': 'https://assets.coingecko.com/coins/images/975/large/cardano.png', 'iconColor': Color(0xFF0033AD)},
    'MATIC': {'name': 'Polygon', 'network': 'Polygon', 'iconUrl': 'https://assets.coingecko.com/coins/images/4713/large/polygon.png', 'iconColor': Color(0xFF8247E5)},
    'TRX': {'name': 'TRON', 'network': 'TRC20', 'iconUrl': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png', 'iconColor': Color(0xFFEF0027)},
  };

  @override
  void initState() {
    super.initState();
    _isCryptoTab = !widget.initialIsGiftcardTab;
    _coinsSub = MarketDataService.watchAllCoins().listen((coins) {
      if (mounted) setState(() => _liveCoins = coins);
    });
  }

  @override
  void dispose() {
    _calcAmountController.dispose();
    _searchController.dispose();
    _coinsSub?.cancel();
    super.dispose();
  }

  final List<String> _filters = ['All', 'USA', 'UK', 'CAD'];

  final List<Map<String, dynamic>> _giftcardRates = [
    {'name': 'Apple / iTunes', 'icon': FontAwesomeIcons.apple, 'iconColor': const Color(0xFF60A5FA), 'entries': [
      {'region': 'USA', 'type': 'PHYSICAL', 'typeColor': const Color(0xFFA78BFA), 'denom': '\$50 - \$100', 'rate': '1,150/\$'},
      {'region': 'USA', 'type': 'E-CODE', 'typeColor': const Color(0xFF60A5FA), 'denom': '\$50 - \$100', 'rate': '950/\$'},
    ]},
    {'name': 'Steam Wallet', 'icon': FontAwesomeIcons.steam, 'iconColor': const Color(0xFF9CA3AF), 'entries': [
      {'region': 'UK', 'type': 'PHYSICAL', 'typeColor': const Color(0xFFA78BFA), 'denom': '\u00A350 - \u00A3100', 'rate': '1,400/\u00A3'},
    ]},
    {'name': 'Razer Gold', 'icon': Icons.gamepad_rounded, 'iconColor': const Color(0xFF00FF00), 'entries': [
      {'region': 'USA', 'type': 'E-CODE', 'typeColor': const Color(0xFF60A5FA), 'denom': '\$50 - \$500', 'rate': '1,250/\$'},
    ]},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      resizeToAvoidBottomInset: false,
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(context),
                _buildSearchBar(),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                    children: [
                      _buildTabControls(),
                      const SizedBox(height: 20),
                      if (_isCryptoTab) ...[
                        _buildSectionLabel('Cryptocurrency Rates'),
                        if (_liveCoins.isEmpty)
                          Padding(padding: const EdgeInsets.symmetric(vertical: 40), child: Center(child: CircularProgressIndicator(color: Colors.white.withOpacity(0.3))))
                        else
                          ..._liveCoins.map((c) {
                            final meta = _cryptoMeta[c.symbol.toUpperCase()] ?? {'name': c.name, 'network': c.symbol, 'iconUrl': '', 'iconColor': const Color(0xFF9CA3AF)};
                            return _buildCryptoRateCardFromLive(c, meta);
                          }),
                      ] else ...[
                        _buildSectionLabel('Gift Card Rates'),
                        _buildFilterChips(),
                        ..._giftcardRates.map((r) => _buildGiftcardRateCard(r)),
                      ],
                    ],
                  ),
                ),
                _buildRateCalculatorButton(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
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
              child: const Center(child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18)),
            ),
          ),
          Column(
            children: [
              Text('Live Rates', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
              Row(
                children: [
                  Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF34D399), boxShadow: [BoxShadow(color: Color(0xFF34D399), blurRadius: 8)])),
                  const SizedBox(width: 6),
                  Text(
                    _liveCoins.isNotEmpty
                        ? 'Updated ${TimeOfDay.fromDateTime(_liveCoins.first.updatedAt).format(context)}'
                        : 'Loading live data...',
                    style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF34D399)),
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

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.white.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            const Icon(Icons.search_rounded, size: 14, color: Color(0xFF9CA3AF)),
            const SizedBox(width: 10),
            Expanded(
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'Search asset or gift card...',
                  hintStyle: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF6B7280)),
                  border: InputBorder.none,
                  isDense: true,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12),
      child: Text(text.toUpperCase(), style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
    );
  }

  Widget _buildTabControls() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Expanded(child: _buildTabButton('Crypto', FontAwesomeIcons.bitcoin, _isCryptoTab, () => setState(() => _isCryptoTab = true))),
          Expanded(child: _buildTabButton('Gift Cards', Icons.card_giftcard_rounded, !_isCryptoTab, () => setState(() => _isCryptoTab = false))),
        ],
      ),
    );
  }

  Widget _buildTabButton(String label, dynamic icon, bool isActive, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF2563EB) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          boxShadow: isActive ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 12)] : [],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            icon is FaIconData
                ? FaIcon(icon, size: 11, color: isActive ? Colors.white : const Color(0xFF9CA3AF))
                : Icon(icon as IconData, size: 11, color: isActive ? Colors.white : const Color(0xFF9CA3AF)),
            const SizedBox(width: 6),
            Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: isActive ? Colors.white : const Color(0xFF9CA3AF))),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChips() {
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: _filters.length,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final isActive = _selectedFilter == index;
          return GestureDetector(
            onTap: () => setState(() => _selectedFilter = index),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: isActive ? Colors.white : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isActive ? Colors.transparent : Colors.white.withOpacity(0.1)),
              ),
              child: Text(_filters[index], style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: isActive ? Colors.black : const Color(0xFFD1D5DB))),
            ),
          );
        },
      ),
    );
  }

  Widget _buildCryptoRateCardFromLive(CoinMarketData coin, Map<String, dynamic> meta) {
    final isUp = coin.isUp;
    final changeColor = isUp ? const Color(0xFF34D399) : const Color(0xFFF87171);
    final changeBg = isUp ? const Color(0xFF10B981).withOpacity(0.1) : const Color(0xFFEF4444).withOpacity(0.1);
    final iconColor = meta['iconColor'] as Color;
    final iconUrl = meta['iconUrl'] as String?;

    final priceNairaPerUnit = coin.priceNaira;
    final buyRate = priceNairaPerUnit * 0.98;
    final sellRate = priceNairaPerUnit * 1.02;

    String formatRate(double v) {
      if (v >= 1000000) return '${(v / 1000000).toStringAsFixed(2)}M';
      if (v >= 1000) return '${(v / 1000).toStringAsFixed(1)}K';
      return v.toStringAsFixed(0);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 40, height: 40,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: iconColor.withOpacity(0.1), border: Border.all(color: iconColor.withOpacity(0.2))),
                    child: Center(
                      child: iconUrl != null && iconUrl.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: iconUrl,
                              width: 22,
                              height: 22,
                              errorWidget: (context, url, error) => Icon(Icons.token_rounded, size: 22, color: iconColor),
                            )
                          : Icon(Icons.token_rounded, size: 22, color: iconColor),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(meta['name'] as String, style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                      const SizedBox(height: 2),
                      Text(meta['network'] as String, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: changeBg, borderRadius: BorderRadius.circular(4)),
                child: Row(
                  children: [
                    Icon(isUp ? Icons.trending_up_rounded : Icons.trending_down_rounded, size: 8, color: changeColor),
                    const SizedBox(width: 4),
                    Text('${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toStringAsFixed(2)}%', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w800, color: changeColor)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Container(width: double.infinity, height: 1, color: Colors.white.withOpacity(0.05)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildRateBox('WE BUY AT', '\u20A6${formatRate(buyRate)} / ${coin.symbol}', const Color(0xFF10B981))),
              const SizedBox(width: 12),
              Expanded(child: _buildRateBox('WE SELL AT', '\u20A6${formatRate(sellRate)} / ${coin.symbol}', const Color(0xFF2563EB))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRateBox(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        children: [
          Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w900, color: color, letterSpacing: 1.5)),
          const SizedBox(height: 4),
          Text(value, style: GoogleFonts.robotoMono(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
        ],
      ),
    );
  }

  Widget _buildGiftcardRateCard(Map<String, dynamic> card) {
    final entries = card['entries'] as List;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(shape: BoxShape.circle, color: (card['iconColor'] as Color).withOpacity(0.2)),
                child: Center(child: FaIcon(card['icon'], size: 12, color: card['iconColor'])),
              ),
              const SizedBox(width: 8),
              Text(card['name'], style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
            ],
          ),
          const SizedBox(height: 12),
          ...entries.map((e) => _buildGiftcardEntry(e as Map<String, dynamic>)),
        ],
      ),
    );
  }

  Widget _buildGiftcardEntry(Map<String, dynamic> entry) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.transparent)),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _buildTag(entry['region'], Colors.white.withOpacity(0.1), const Color(0xFFD1D5DB)),
                    const SizedBox(width: 6),
                    _buildTag(entry['type'], (entry['typeColor'] as Color).withOpacity(0.2), entry['typeColor']),
                  ],
                ),
                const SizedBox(height: 6),
                Text('Denomination: ${entry['denom']}', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text('RATE', style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF34D399), letterSpacing: 1.5)),
                const SizedBox(height: 2),
                Text('\u20A6${entry['rate']}', style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color bgColor, Color textColor) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(color: bgColor, borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: GoogleFonts.plusJakartaSans(fontSize: 8, fontWeight: FontWeight.w800, color: textColor)),
    );
  }

  Widget _buildRateCalculatorButton() {
    return Positioned(
      left: 0, right: 0, bottom: 24,
      child: Center(
        child: GestureDetector(
          onTap: () => _showCalcSheet(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            decoration: BoxDecoration(
              color: const Color(0xFF2563EB),
              borderRadius: BorderRadius.circular(30),
              boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.5), blurRadius: 25)],
              border: Border.all(color: const Color(0xFF60A5FA).withOpacity(0.5)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.calculate_rounded, size: 16, color: Colors.white),
                const SizedBox(width: 8),
                Text('Rate Calculator', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showCalcSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      useRootNavigator: true,
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => _buildCalcSheet(setModalState),
      ),
    );
  }

  Widget _buildSheetContainer({required Widget child, required double heightFactor}) {
    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          height: MediaQuery.of(context).size.height * heightFactor,
          decoration: BoxDecoration(
            color: const Color(0xFF0F1423).withOpacity(0.95),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
            border: const Border(top: BorderSide(color: Color(0x1AFFFFFF))),
          ),
          child: child,
        ),
      ),
    );
  }

  Widget _buildCalcSheet(StateSetter setModalState) {
    final amount = int.tryParse(_calcAmountController.text) ?? 0;
    final usdtData = _liveCoins.where((c) => c.symbol.toUpperCase() == 'USDT').firstOrNull;
    final baseRate = usdtData?.priceNaira ?? _ngnRate;
    final rate = _isSellAction ? (baseRate * 0.98).round() : (baseRate * 1.02).round();
    final result = amount * rate;

    return _buildSheetContainer(
      heightFactor: 0.75,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Rate Calculator', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.05)),
                    child: const Center(child: Icon(Icons.close_rounded, size: 14, color: Color(0xFF9CA3AF))),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView(
                children: [
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 6),
                    child: Text('SELECT ASSET', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: Row(
                      children: [
                        Container(width: 24, height: 24, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x3326A17B)), child: const Center(child: FaIcon(FontAwesomeIcons.bitcoin, size: 10, color: Color(0xFF26A17B)))),
                        const SizedBox(width: 8),
                        Text('USDT (Tether)', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
                        const Spacer(),
                        const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF6B7280)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 6),
                    child: Text('ACTION', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  ),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        Expanded(child: _buildActionToggle('I want to Sell', _isSellAction, const Color(0xFF10B981), () => setModalState(() => _isSellAction = true))),
                        Expanded(child: _buildActionToggle('I want to Buy', !_isSellAction, const Color(0xFF2563EB), () => setModalState(() => _isSellAction = false))),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 6),
                    child: Text('AMOUNT (\$)', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF6B7280), letterSpacing: 1.5)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: Row(
                      children: [
                        Text('\$', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF34D399))),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _calcAmountController,
                            keyboardType: TextInputType.number,
                            style: GoogleFonts.robotoMono(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white),
                            decoration: InputDecoration(hintText: '100', hintStyle: GoogleFonts.robotoMono(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, isDense: true),
                            onChanged: (_) => setModalState(() {}),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Text('Current Rate: \u20A6${rate.toString()} / \$', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(begin: Alignment.bottomCenter, end: Alignment.topCenter, colors: [const Color(0xFF10B981).withOpacity(0.1), Colors.transparent]),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                    ),
                    child: Column(
                      children: [
                        Text('YOU WILL ${_isSellAction ? 'RECEIVE' : 'PAY'}', style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                        const SizedBox(height: 4),
                        Text('\u20A6${result.toString()}', style: GoogleFonts.robotoMono(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 32),
              child: GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF34D399),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: const Color(0xFF10B981).withOpacity(0.3), blurRadius: 25, offset: const Offset(0, 4))],
                  ),
                  child: Center(child: Text('Proceed to Trade', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: const Color(0xFF000000)))),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionToggle(String label, bool isActive, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? color.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isActive ? color.withOpacity(0.3) : Colors.transparent),
        ),
        child: Center(child: Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: isActive ? color : const Color(0xFF9CA3AF)))),
      ),
    );
  }
}

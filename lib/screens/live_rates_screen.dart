import 'dart:async';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import '../models/giftcard_model.dart';
import '../services/market_data_service.dart';
import '../services/fiat_rate_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import '../widgets/universal_icon.dart';

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
  
  List<GiftcardRate> _firestoreGiftcardRates = [];
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _ratesSub;

  final double _defaultNgnRate = 1450.0;

  static const Map<String, Map<String, dynamic>> _cryptoMeta = {
    'BTC': {'name': 'Bitcoin', 'network': 'BTC Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', 'iconColor': Color(0xFFF7931A), 'baseUsd': 64500.0},
    'ETH': {'name': 'Ethereum', 'network': 'ERC20', 'iconUrl': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', 'iconColor': Color(0xFF627EEA), 'baseUsd': 3450.0},
    'USDT': {'name': 'Tether', 'network': 'TRC20 / ERC20', 'iconUrl': 'https://assets.coingecko.com/coins/images/325/large/Tether.png', 'iconColor': Color(0xFF26A17B), 'baseUsd': 1.0},
    'TON': {'name': 'Toncoin', 'network': 'TON Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png', 'iconColor': Color(0xFF0098EA), 'baseUsd': 6.8},
    'SOL': {'name': 'Solana', 'network': 'SOL Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 'iconColor': Color(0xFF14F195), 'baseUsd': 155.0},
    'BNB': {'name': 'BNB', 'network': 'BSC', 'iconUrl': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', 'iconColor': Color(0xFFF3BA2F), 'baseUsd': 580.0},
    'XRP': {'name': 'Ripple', 'network': 'XRP Ledger', 'iconUrl': 'https://cryptologos.cc/logos/xrp-xrp-logo.png', 'iconColor': Color(0xFF23292F), 'baseUsd': 0.58},
    'DOGE': {'name': 'Dogecoin', 'network': 'DOGE Network', 'iconUrl': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png', 'iconColor': Color(0xFFC2A633), 'baseUsd': 0.12},
    'ADA': {'name': 'Cardano', 'network': 'Cardano', 'iconUrl': 'https://assets.coingecko.com/coins/images/975/large/cardano.png', 'iconColor': Color(0xFF0033AD), 'baseUsd': 0.45},
    'MATIC': {'name': 'Polygon', 'network': 'Polygon', 'iconUrl': 'https://assets.coingecko.com/coins/images/4713/large/polygon.png', 'iconColor': Color(0xFF8247E5), 'baseUsd': 0.52},
    'TRX': {'name': 'TRON', 'network': 'TRC20', 'iconUrl': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png', 'iconColor': Color(0xFFEF0027), 'baseUsd': 0.14},
  };

  final List<String> _filters = ['All', 'USA', 'UK', 'CAD', 'EUR'];

  final List<Map<String, dynamic>> _fallbackGiftcardRates = [
    {
      'name': 'Apple / iTunes',
      'icon': Icons.apple,
      'iconColor': const Color(0xFF60A5FA),
      'entries': [
        {'region': 'USA', 'type': 'PHYSICAL', 'typeColor': const Color(0xFFA78BFA), 'denom': '\$50 - \$100', 'rate': '1,150/\$'},
        {'region': 'USA', 'type': 'E-CODE', 'typeColor': const Color(0xFF60A5FA), 'denom': '\$50 - \$100', 'rate': '950/\$'},
      ]
    },
    {
      'name': 'Steam Wallet',
      'icon': Icons.sports_esports_rounded,
      'iconColor': const Color(0xFF9CA3AF),
      'entries': [
        {'region': 'UK', 'type': 'PHYSICAL', 'typeColor': const Color(0xFFA78BFA), 'denom': '£50 - £100', 'rate': '1,400/£'},
        {'region': 'USA', 'type': 'E-CODE', 'typeColor': const Color(0xFF60A5FA), 'denom': '\$50 - \$500', 'rate': '1,200/\$'},
      ]
    },
    {
      'name': 'Amazon Card',
      'icon': Icons.shopping_bag_rounded,
      'iconColor': const Color(0xFFF59E0B),
      'entries': [
        {'region': 'USA', 'type': 'PHYSICAL', 'typeColor': const Color(0xFFA78BFA), 'denom': '\$50 - \$500', 'rate': '1,180/\$'},
        {'region': 'CAD', 'type': 'E-CODE', 'typeColor': const Color(0xFF60A5FA), 'denom': 'CAD 50 - 500', 'rate': '850/CAD'},
      ]
    },
    {
      'name': 'Razer Gold',
      'icon': Icons.gamepad_rounded,
      'iconColor': const Color(0xFF00FF00),
      'entries': [
        {'region': 'USA', 'type': 'E-CODE', 'typeColor': const Color(0xFF60A5FA), 'denom': '\$50 - \$500', 'rate': '1,250/\$'},
      ]
    },
  ];

  @override
  void initState() {
    super.initState();
    _isCryptoTab = !widget.initialIsGiftcardTab;

    _coinsSub = MarketDataService.watchAllCoins().listen((coins) {
      if (mounted) setState(() => _liveCoins = coins);
    });

    _ratesSub = FirebaseFirestore.instance
        .collection('giftcard_rates')
        .snapshots()
        .listen((snap) {
      if (mounted) {
        final rates = snap.docs.map((doc) => GiftcardRate.fromMap(doc.id, doc.data())).toList();
        setState(() => _firestoreGiftcardRates = rates);
      }
    });

    _searchController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _calcAmountController.dispose();
    _searchController.dispose();
    _coinsSub?.cancel();
    _ratesSub?.cancel();
    super.dispose();
  }

  List<CoinMarketData> get _displayCoins {
    final query = _searchController.text.trim().toLowerCase();
    
    List<CoinMarketData> coins;
    if (_liveCoins.isNotEmpty) {
      coins = _liveCoins;
    } else {
      final ngnRate = FiatRateService.instance.rates['NGN'] ?? _defaultNgnRate;
      coins = _cryptoMeta.entries.map((e) {
        final sym = e.key;
        final meta = e.value;
        final baseUsd = (meta['baseUsd'] as num?)?.toDouble() ?? 1.0;
        final priceNaira = baseUsd * ngnRate;
        return CoinMarketData(
          symbol: sym,
          name: meta['name'] as String,
          priceUsd: baseUsd,
          priceNaira: priceNaira,
          change24h: 1.5,
          change1h: 0.2,
          change7d: 3.8,
          marketCap: baseUsd * 1000000,
          volume24h: baseUsd * 50000,
          high24h: priceNaira * 1.05,
          low24h: priceNaira * 0.95,
          ath: priceNaira * 1.5,
          circulatingSupply: 1000000,
          sparkline: [],
          ngnRate: ngnRate,
          updatedAt: DateTime.now(),
        );
      }).toList();
    }

    if (query.isNotEmpty) {
      return coins.where((c) =>
        c.name.toLowerCase().contains(query) ||
        c.symbol.toLowerCase().contains(query)
      ).toList();
    }
    return coins;
  }

  List<Map<String, dynamic>> get _displayGiftcardRates {
    final filter = _filters[_selectedFilter];
    final query = _searchController.text.trim().toLowerCase();

    List<Map<String, dynamic>> cards;

    if (_firestoreGiftcardRates.isNotEmpty) {
      final Map<String, List<GiftcardRate>> grouped = {};
      for (final r in _firestoreGiftcardRates) {
        grouped.putIfAbsent(r.brandName, () => []).add(r);
      }

      cards = grouped.entries.map((entry) {
        final brandName = entry.key;
        final rates = entry.value;
        return {
          'name': brandName,
          'icon': Icons.card_giftcard_rounded,
          'iconColor': const Color(0xFF60A5FA),
          'entries': rates.map((r) => {
            'region': r.currency,
            'type': r.cardType.toUpperCase(),
            'typeColor': r.cardType.toLowerCase().contains('phys') ? const Color(0xFFA78BFA) : const Color(0xFF60A5FA),
            'denom': r.maxValue != null ? '${r.currency} ${r.minValue.toInt()} - ${r.maxValue!.toInt()}' : '${r.currency} ${r.minValue.toInt()}+',
            'rate': '${r.ratePerUnit.toStringAsFixed(0)}/${r.currency}',
          }).toList(),
        };
      }).toList();
    } else {
      cards = _fallbackGiftcardRates;
    }

    if (filter != 'All') {
      cards = cards.map((c) {
        final entries = (c['entries'] as List)
            .where((e) => (e['region'] as String).toUpperCase() == filter.toUpperCase())
            .toList();
        return {...c, 'entries': entries};
      }).where((c) => (c['entries'] as List).isNotEmpty).toList();
    }

    if (query.isNotEmpty) {
      cards = cards.where((c) =>
        (c['name'] as String).toLowerCase().contains(query) ||
        (c['entries'] as List).any((e) =>
          (e['region'] as String).toLowerCase().contains(query) ||
          (e['type'] as String).toLowerCase().contains(query)
        )
      ).toList();
    }

    return cards;
  }

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
                const SizedBox(height: 12),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                    children: [
                      _buildTabControls(),
                      const SizedBox(height: 20),
                      if (_isCryptoTab) ...[
                        _buildSectionLabel('Cryptocurrency Rates'),
                        if (_displayCoins.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 40),
                            child: Center(
                              child: Text(
                                'No matching crypto coins found',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF9CA3AF),
                                ),
                              ),
                            ),
                          )
                        else
                          ..._displayCoins.map((c) {
                            final meta = _cryptoMeta[c.symbol.toUpperCase()] ?? {
                              'name': c.name,
                              'network': c.symbol,
                              'iconUrl': '',
                              'iconColor': const Color(0xFF9CA3AF)
                            };
                            return _buildCryptoRateCardFromLive(c, meta);
                          }),
                      ] else ...[
                        _buildSectionLabel('Gift Card Rates'),
                        _buildFilterChips(),
                        const SizedBox(height: 12),
                        if (_displayGiftcardRates.isEmpty)
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 40),
                            child: Center(
                              child: Text(
                                'No gift card rates matching "$_selectedFilter"',
                                style: GoogleFonts.plusJakartaSans(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF9CA3AF),
                                ),
                              ),
                            ),
                          )
                        else
                          ..._displayGiftcardRates.map((r) => _buildGiftcardRateCard(r)),
                      ],
                    ],
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 24,
            child: _buildRateCalculatorButton(),
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
            behavior: HitTestBehavior.opaque,
            onTap: () => Navigator.pop(context),
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: const Center(
                child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18),
              ),
            ),
          ),
          Column(
            children: [
              Text(
                'Live Rates',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
              Row(
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF34D399),
                      boxShadow: [BoxShadow(color: Color(0xFF34D399), blurRadius: 8)],
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _liveCoins.isNotEmpty
                        ? 'Live Firestore Market Stream'
                        : 'Realtime Exchange Rates',
                    style: GoogleFonts.plusJakartaSans(
                      fontSize: 9,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF34D399),
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
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
                decoration: InputDecoration(
                  hintText: 'Search asset or gift card...',
                  hintStyle: GoogleFonts.plusJakartaSans(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF6B7280),
                  ),
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
      child: Text(
        text.toUpperCase(),
        style: GoogleFonts.plusJakartaSans(
          fontSize: 11,
          fontWeight: FontWeight.w900,
          color: const Color(0xFF6B7280),
          letterSpacing: 1.5,
        ),
      ),
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
          Expanded(
            child: _buildTabButton('Crypto', Icons.currency_bitcoin_rounded, _isCryptoTab, () {
              setState(() => _isCryptoTab = true);
            }),
          ),
          Expanded(
            child: _buildTabButton('Gift Cards', Icons.card_giftcard_rounded, !_isCryptoTab, () {
              setState(() => _isCryptoTab = false);
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildTabButton(String label, dynamic icon, bool isActive, VoidCallback onTap) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? const Color(0xFF2563EB) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          boxShadow: isActive
              ? [BoxShadow(color: const Color(0xFF2563EB).withOpacity(0.3), blurRadius: 12)]
              : [],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            UniversalIcon(icon, size: 13, color: isActive ? Colors.white : const Color(0xFF9CA3AF)),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.plusJakartaSans(
                fontSize: 13,
                fontWeight: FontWeight.w800,
                color: isActive ? Colors.white : const Color(0xFF9CA3AF),
              ),
            ),
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
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _selectedFilter = index),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: isActive ? Colors.white : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: isActive ? Colors.transparent : Colors.white.withOpacity(0.1)),
              ),
              child: Text(
                _filters[index],
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: isActive ? Colors.black : const Color(0xFFD1D5DB),
                ),
              ),
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
    final iconColor = (meta['iconColor'] as Color?) ?? const Color(0xFF2563EB);
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
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: iconColor.withOpacity(0.1),
                      border: Border.all(color: iconColor.withOpacity(0.2)),
                    ),
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
                      Text(
                        meta['name'] as String? ?? coin.name,
                        style: GoogleFonts.plusJakartaSans(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        meta['network'] as String? ?? coin.symbol,
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
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: changeBg, borderRadius: BorderRadius.circular(4)),
                child: Row(
                  children: [
                    Icon(isUp ? Icons.trending_up_rounded : Icons.trending_down_rounded, size: 8, color: changeColor),
                    const SizedBox(width: 4),
                    Text(
                      '${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toStringAsFixed(2)}%',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: changeColor,
                      ),
                    ),
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
              Expanded(child: _buildRateBox('WE BUY AT', '₦${formatRate(buyRate)} / ${coin.symbol}', const Color(0xFF10B981))),
              const SizedBox(width: 12),
              Expanded(child: _buildRateBox('WE SELL AT', '₦${formatRate(sellRate)} / ${coin.symbol}', const Color(0xFF2563EB))),
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
          Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 9,
              fontWeight: FontWeight.w900,
              color: color,
              letterSpacing: 1.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.robotoMono(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGiftcardRateCard(Map<String, dynamic> card) {
    final entries = card['entries'] as List;
    final iconColor = (card['iconColor'] as Color?) ?? const Color(0xFF2563EB);

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
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: iconColor.withOpacity(0.2),
                ),
                child: Center(child: UniversalIcon(card['icon'], size: 13, color: iconColor)),
              ),
              const SizedBox(width: 8),
              Text(
                card['name'] as String,
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: -0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...entries.map((e) => _buildGiftcardEntry(e as Map<String, dynamic>)),
        ],
      ),
    );
  }

  Widget _buildGiftcardEntry(Map<String, dynamic> entry) {
    final typeColor = (entry['typeColor'] as Color?) ?? const Color(0xFF60A5FA);

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.transparent),
        ),
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
                    _buildTag(entry['type'], typeColor.withOpacity(0.2), typeColor),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Denomination: ${entry['denom']}',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  'RATE',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF34D399),
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '₦${entry['rate']}',
                  style: GoogleFonts.robotoMono(
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF34D399),
                  ),
                ),
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
      child: Text(
        text,
        style: GoogleFonts.plusJakartaSans(
          fontSize: 8,
          fontWeight: FontWeight.w800,
          color: textColor,
        ),
      ),
    );
  }

  Widget _buildRateCalculatorButton() {
    return Center(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
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
              Text(
                'Rate Calculator',
                style: GoogleFonts.plusJakartaSans(
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
            ],
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
    final usdtData = _displayCoins.where((c) => c.symbol.toUpperCase() == 'USDT').firstOrNull;
    final ngnRate = FiatRateService.instance.rates['NGN'] ?? _defaultNgnRate;
    final baseRate = usdtData?.priceNaira ?? ngnRate;
    final rate = _isSellAction ? (baseRate * 0.98).round() : (baseRate * 1.02).round();
    final result = amount * rate;

    return _buildSheetContainer(
      heightFactor: 0.75,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
        child: Column(
          children: [
            Container(
              width: 48,
              height: 6,
              decoration: const BoxDecoration(
                color: Color(0x33FFFFFF),
                borderRadius: BorderRadius.all(Radius.circular(3)),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Rate Calculator',
                  style: GoogleFonts.plusJakartaSans(
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => Navigator.pop(context),
                  child: Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: Colors.white.withOpacity(0.05),
                    ),
                    child: const Center(
                      child: Icon(Icons.close_rounded, size: 14, color: Color(0xFF9CA3AF)),
                    ),
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
                    child: Text(
                      'SELECT ASSET',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF6B7280),
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 24,
                          height: 24,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0x3326A17B),
                          ),
                          child: const Center(
                            child: Icon(Icons.currency_bitcoin_rounded, size: 12, color: Color(0xFF26A17B)),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'USDT (Tether)',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                        const Spacer(),
                        const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF6B7280)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 6),
                    child: Text(
                      'ACTION',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF6B7280),
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _buildActionToggle('I want to Sell', _isSellAction, const Color(0xFF10B981), () {
                            setModalState(() => _isSellAction = true);
                          }),
                        ),
                        Expanded(
                          child: _buildActionToggle('I want to Buy', !_isSellAction, const Color(0xFF2563EB), () {
                            setModalState(() => _isSellAction = false);
                          }),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Padding(
                    padding: const EdgeInsets.only(left: 4, bottom: 6),
                    child: Text(
                      'AMOUNT (\$)',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF6B7280),
                        letterSpacing: 1.5,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.1)),
                    ),
                    child: Row(
                      children: [
                        Text(
                          '\$',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF34D399),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: TextField(
                            controller: _calcAmountController,
                            keyboardType: TextInputType.number,
                            style: GoogleFonts.robotoMono(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                            decoration: InputDecoration(
                              hintText: '100',
                              hintStyle: GoogleFonts.robotoMono(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: Colors.white24,
                              ),
                              border: InputBorder.none,
                              isDense: true,
                            ),
                            onChanged: (_) => setModalState(() {}),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Padding(
                    padding: const EdgeInsets.only(left: 4),
                    child: Text(
                      'Current Rate: ₦${rate.toString()} / \$',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF9CA3AF),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.bottomCenter,
                        end: Alignment.topCenter,
                        colors: [const Color(0xFF10B981).withOpacity(0.1), Colors.transparent],
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF10B981).withOpacity(0.2)),
                    ),
                    child: Column(
                      children: [
                        Text(
                          'YOU WILL ${_isSellAction ? 'RECEIVE' : 'PAY'}',
                          style: GoogleFonts.plusJakartaSans(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: const Color(0xFF9CA3AF),
                            letterSpacing: 1.5,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '₦${result.toString()}',
                          style: GoogleFonts.robotoMono(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.only(bottom: 32),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => Navigator.pop(context),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF34D399),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF10B981).withOpacity(0.3),
                        blurRadius: 25,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Center(
                    child: Text(
                      'Proceed to Trade',
                      style: GoogleFonts.plusJakartaSans(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF000000),
                      ),
                    ),
                  ),
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
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isActive ? color.withOpacity(0.2) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isActive ? color.withOpacity(0.3) : Colors.transparent),
        ),
        child: Center(
          child: Text(
            label,
            style: GoogleFonts.plusJakartaSans(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: isActive ? Colors.white : const Color(0xFF9CA3AF),
            ),
          ),
        ),
      ),
    );
  }
}

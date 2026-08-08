import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../providers/auth_provider.dart';
import '../providers/wallet_provider.dart';
import '../models/transaction_model.dart';
import '../services/firestore_service.dart';
import '../services/market_data_service.dart';
import '../services/hd_wallet_service.dart';
import '../services/network_fee_service.dart';
import '../services/trade_fee_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';

class CoinPreviewScreen extends StatefulWidget {
  final CoinMarketData? initialData;
  final String coinName;
  final String coinSymbol;
  final IconData coinIcon;
  final String? iconUrl;
  final Color coinColor;
  final String balanceNaira;
  final String balanceCoin;
  final String livePrice;
  final String priceChange;
  final bool isUp;
  final String currencyCode;

  const CoinPreviewScreen({
    super.key,
    this.initialData,
    this.coinName = 'Bitcoin',
    this.coinSymbol = 'BTC',
    this.coinIcon = FontAwesomeIcons.bitcoin,
    this.iconUrl,
    this.coinColor = const Color(0xFFF7931A),
    this.balanceNaira = '1,240,500',
    this.balanceCoin = '0.0130 BTC',
    this.livePrice = '95,450,000',
    this.priceChange = '+2.4%',
    this.isUp = true,
    this.currencyCode = 'btc',
  });

  @override
  State<CoinPreviewScreen> createState() => _CoinPreviewScreenState();
}

class _CoinPreviewScreenState extends State<CoinPreviewScreen> {
  int _selectedTimeframe = 1;
  final List<String> _timeframes = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];

  String? _depositAddress;
  bool _depositLoading = false;
  String? _depositError;
  NetworkFeeInfo? _feeInfo;
  bool _feeLoading = false;

  List<TransactionModel> _coinTransactions = [];
  Stream<List<TransactionModel>>? _txStream;

  CoinMarketData? _marketData;
  StreamSubscription<CoinMarketData?>? _marketSub;

  @override
  void initState() {
    super.initState();
    _initTransactionStream();
    _initMarketDataStream();
  }

  void _initTransactionStream() {
    final uid = context.read<AuthProvider>().firebaseUser!.uid;
    final fs = FirestoreService();
    _txStream = fs.watchTransactions(uid, limit: 50);
    _txStream!.listen((txs) {
      if (mounted) {
        setState(() {
          _coinTransactions = txs.where((t) =>
            t.coinSymbol?.toUpperCase() == widget.coinSymbol.toUpperCase()
          ).take(10).toList();
        });
      }
    });
  }

  void _initMarketDataStream() {
    _marketSub = MarketDataService.watchCoin(widget.coinSymbol).listen((data) {
      if (mounted) {
        setState(() {
          _marketData = data;
        });
      }
    });
  }

  @override
  void dispose() {
    _txStream = null;
    _marketSub?.cancel();
    super.dispose();
  }

  ({List<double>? sparkline, double change}) _getTimeframeData(CoinMarketData? md) {
    if (md == null || md.sparkline.length < 2) {
      return (sparkline: null, change: 0);
    }
    final full = md.sparkline;
    // CoinGecko sparkline is 7d hourly (~168 points)
    List<double> slice;
    double change;
    switch (_selectedTimeframe) {
      case 0: // 1H
        slice = full.length > 2 ? full.sublist(full.length - 2) : full;
        change = slice.length >= 2
            ? ((slice.last - slice.first) / slice.first) * 100
            : md.change1h;
        break;
      case 1: // 1D
        final count = full.length > 24 ? 24 : full.length;
        slice = full.sublist(full.length - count);
        change = slice.length >= 2
            ? ((slice.last - slice.first) / slice.first) * 100
            : md.change24h;
        break;
      case 2: // 1W
        slice = full;
        change = md.change7d;
        break;
      case 3: // 1M - downsample full 7d data
        slice = _downsample(full, 30);
        change = slice.length >= 2
            ? ((slice.last - slice.first) / slice.first) * 100
            : md.change7d;
        break;
      case 4: // 1Y - downsample
        slice = _downsample(full, 52);
        change = slice.length >= 2
            ? ((slice.last - slice.first) / slice.first) * 100
            : md.change7d;
        break;
      default: // ALL
        slice = _downsample(full, 60);
        change = slice.length >= 2
            ? ((slice.last - slice.first) / slice.first) * 100
            : md.change7d;
        break;
    }
    return (sparkline: slice, change: change);
  }

  List<double> _downsample(List<double> data, int targetPoints) {
    if (data.length <= targetPoints) return data;
    final step = data.length / targetPoints;
    final result = <double>[];
    for (int i = 0; i < targetPoints; i++) {
      final idx = (i * step).floor();
      result.add(data[idx]);
    }
    result.add(data.last);
    return result;
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
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      _buildHeroBalance(),
                      _buildChart(),
                      _buildQuickActions(),
                      _buildMarketStats(),
                      _buildRecentActivity(),
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
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
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
          Row(
            children: [
              Container(
                width: 24, height: 24,
                decoration: BoxDecoration(shape: BoxShape.circle, color: widget.coinColor.withOpacity(0.15), border: Border.all(color: widget.coinColor.withOpacity(0.2))),
                child: Center(
                  child: widget.iconUrl != null && widget.iconUrl!.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: widget.iconUrl!,
                          width: 14,
                          height: 14,
                          errorWidget: (context, url, error) => FaIcon(widget.coinIcon, size: 12, color: widget.coinColor),
                        )
                      : FaIcon(widget.coinIcon, size: 12, color: widget.coinColor),
                ),
              ),
              const SizedBox(width: 6),
              Text(widget.coinName, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
              const SizedBox(width: 4),
              Text(widget.coinSymbol, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ],
          ),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildHeroBalance() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          Text('YOUR BALANCE', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('\u20A6${widget.balanceNaira}', style: GoogleFonts.plusJakartaSans(fontSize: 32, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1)),
              Text('.00', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ],
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(6)),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                widget.iconUrl != null && widget.iconUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: widget.iconUrl!,
                        width: 12,
                        height: 12,
                        errorWidget: (context, url, error) => FaIcon(widget.coinIcon, size: 10, color: widget.coinColor),
                      )
                    : FaIcon(widget.coinIcon, size: 10, color: widget.coinColor),
                const SizedBox(width: 4),
                Text(widget.balanceCoin, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB))),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChart() {
    final md = _marketData;
    final timeframeData = _getTimeframeData(md);
    final isUp = timeframeData.change >= 0;
    final changeColor = isUp ? const Color(0xFF34D399) : const Color(0xFFEF4444);
    final changeBg = isUp ? const Color(0xFF34D399).withOpacity(0.1) : const Color(0xFFEF4444).withOpacity(0.1);
    final priceStr = md != null
        ? '\u20A6${_formatNaira(md.priceNaira)}'
        : '\u20A6${widget.livePrice}';
    final changeStr = '${timeframeData.change >= 0 ? '+' : ''}${timeframeData.change.toStringAsFixed(2)}%';
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Container(
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
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(width: 6, height: 6, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF34D399))),
                        const SizedBox(width: 6),
                        Text('LIVE PRICE', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(priceStr, style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: changeBg, borderRadius: BorderRadius.circular(8), border: Border.all(color: changeColor.withOpacity(0.2))),
                  child: Row(
                    children: [
                      Icon(isUp ? Icons.trending_up_rounded : Icons.trending_down_rounded, size: 9, color: changeColor),
                      const SizedBox(width: 4),
                      Text(changeStr, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: changeColor)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity, height: 96,
              child: CustomPaint(painter: _ChartPainter(upColor: const Color(0xFF34D399), downColor: const Color(0xFFEF4444), sparkline: timeframeData.sparkline)),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: List.generate(_timeframes.length, (index) {
                  final isActive = _selectedTimeframe == index;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedTimeframe = index),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        decoration: BoxDecoration(color: isActive ? Colors.white.withOpacity(0.1) : Colors.transparent, borderRadius: BorderRadius.circular(8)),
                        child: Text(_timeframes[index], textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: isActive ? FontWeight.w900 : FontWeight.w700, color: isActive ? Colors.white : const Color(0xFF9CA3AF))),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildQuickActions() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Expanded(child: _buildActionBtn('Deposit', Icons.arrow_downward_rounded, const Color(0xFF2563EB), isPrimary: true, onTap: () => _showDepositSheet())),
          const SizedBox(width: 6),
          Expanded(child: _buildActionBtn('Buy', Icons.add_rounded, const Color(0xFF10B981), isPrimary: true, onTap: () => _showBuySheet())),
          const SizedBox(width: 6),
          Expanded(child: _buildActionBtn('Sell', Icons.remove_rounded, const Color(0xFFEF4444), isPrimary: true, onTap: () => _showSellSheet())),
          const SizedBox(width: 6),
          Expanded(child: _buildActionBtn('Swap', Icons.swap_horiz_rounded, const Color(0xFF8B5CF6), isPrimary: true, onTap: () => _showSwapSheet())),
          const SizedBox(width: 6),
          Expanded(child: _buildActionBtn('Send', Icons.send_rounded, const Color(0xFFF59E0B), isPrimary: true, onTap: () => _showSendSheet())),
        ],
      ),
    );
  }

  Widget _buildActionBtn(String label, IconData icon, Color color, {bool isPrimary = false, VoidCallback? onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isPrimary ? color : Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isPrimary ? color : Colors.white.withOpacity(0.08)),
          boxShadow: isPrimary ? [BoxShadow(color: color.withOpacity(0.25), blurRadius: 15)] : [],
        ),
        child: Column(
          children: [
            Container(
              width: 24, height: 24,
              decoration: BoxDecoration(shape: BoxShape.circle, color: isPrimary ? Colors.white.withOpacity(0.85) : color.withOpacity(0.1)),
              child: Center(child: Icon(icon, size: 12, color: isPrimary ? color : Colors.white)),
            ),
            const SizedBox(height: 4),
            Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
          ],
        ),
      ),
    );
  }

  Widget _buildMarketStats() {
    final md = _marketData;
    final stats = [
      {'label': 'Market Cap', 'value': md != null ? '\$${_formatCompact(md.marketCap)}' : '\$1.2T'},
      {'label': '24h Volume', 'value': md != null ? '\$${_formatCompact(md.volume24h)}' : '\$34.5B'},
      {'label': 'Circulating Supply', 'value': md != null ? _formatCompact(md.circulatingSupply) : '19.7M', 'suffix': widget.coinSymbol},
      {'label': 'All-Time High', 'value': md != null ? '\$${_formatCompact(md.ath)}' : '\$73,750'},
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Market Stats', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 6),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 2.2,
            children: stats.map((s) => _buildStatCard(s)).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(Map<String, dynamic> stat) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.03),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(stat['label'], style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
          const SizedBox(height: 4),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(stat['value'], style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
              if (stat['suffix'] != null) ...[
                const SizedBox(width: 2),
                Text(stat['suffix'], style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ],
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRecentActivity() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent Activity', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
              GestureDetector(onTap: () {}, child: Text('View all', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)))),
            ],
          ),
          const SizedBox(height: 6),
          if (_coinTransactions.isEmpty)
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Center(child: Text('No transactions yet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)))),
            )
          else
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.03),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(
                children: _coinTransactions.map((tx) => _buildActivityItemFromTx(tx)).toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildActivityItemFromTx(TransactionModel tx) {
    final isPositive = tx.type == TransactionType.deposit ||
        tx.type == TransactionType.buy ||
        tx.type == TransactionType.receive ||
        tx.type == TransactionType.referralBonus ||
        tx.type == TransactionType.sell;

    IconData icon;
    Color color;
    switch (tx.type) {
      case TransactionType.deposit:
      case TransactionType.receive:
        icon = Icons.arrow_downward_rounded;
        color = const Color(0xFF34D399);
        break;
      case TransactionType.withdrawal:
      case TransactionType.send:
        icon = Icons.arrow_upward_rounded;
        color = const Color(0xFFEF4444);
        break;
      case TransactionType.buy:
        icon = Icons.add_rounded;
        color = const Color(0xFF2563EB);
        break;
      case TransactionType.sell:
        icon = Icons.remove_rounded;
        color = const Color(0xFFEF4444);
        break;
      case TransactionType.swap:
        icon = Icons.swap_horiz_rounded;
        color = const Color(0xFF8B5CF6);
        break;
      default:
        icon = Icons.receipt_long_rounded;
        color = const Color(0xFF9CA3AF);
    }

    final title = '${tx.type.label} ${widget.coinSymbol}';
    final dateStr = '${tx.createdAt.day} ${_monthName(tx.createdAt.month)} ${tx.createdAt.year}';
    final amountStr = tx.amountCoin != null
        ? '${isPositive ? '+' : '-'}${tx.amountCoin} ${widget.coinSymbol}'
        : '${isPositive ? '+' : '-'}\u20A6${tx.amountNaira.toStringAsFixed(0)}';
    final nairaStr = '\u20A6${tx.amountNaira.toStringAsFixed(0)}';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Container(
            width: 32, height: 32,
            decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.1), border: Border.all(color: color.withOpacity(0.15))),
            child: Center(child: Icon(icon, size: 12, color: color)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
                Text(dateStr, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(amountStr, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: isPositive ? const Color(0xFF34D399) : Colors.white)),
              Text(nairaStr, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ],
          ),
        ],
      ),
    );
  }

  String _monthName(int month) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  }

  String _formatNaira(double value) {
    if (value >= 1000000000) {
      return '${(value / 1000000000).toStringAsFixed(2)}B';
    } else if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(2)}M';
    }
    final n = value.toInt();
    final s = n.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return s.replaceAllMapped(reg, (m) => '${m[1]},');
  }

  String _formatCompact(double value) {
    if (value >= 1000000000000) {
      return '${(value / 1000000000000).toStringAsFixed(2)}T';
    } else if (value >= 1000000000) {
      return '${(value / 1000000000).toStringAsFixed(2)}B';
    } else if (value >= 1000000) {
      return '${(value / 1000000).toStringAsFixed(2)}M';
    } else if (value >= 1000) {
      return '${(value / 1000).toStringAsFixed(1)}K';
    }
    return value.toStringAsFixed(0);
  }

  // ============ BOTTOM SHEETS ============

  void _showDepositSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          if (!_depositLoading && _depositAddress == null && _depositError == null) {
            _loadDepositAddress(setSheetState);
          }
          return _buildDepositSheetContainer(setSheetState);
        },
      ),
    );
  }

  Future<void> _loadDepositAddress(StateSetter ss) async {
    ss(() => _depositLoading = true);
    _fetchFeeInfo(ss);
    try {
      final uid = context.read<AuthProvider>().firebaseUser!.uid;
      final fs = FirestoreService();
      final saved = await fs.getCryptoDeposit(uid);

      Map<String, Map<String, dynamic>> addresses = {};

      if (saved != null && saved['addresses'] != null) {
        addresses = Map<String, Map<String, dynamic>>.from(
          (saved['addresses'] as Map).map((k, v) => MapEntry(k, Map<String, dynamic>.from(v))),
        );
      }

      // If address already exists for this currency, show it
      final addrData = addresses[widget.currencyCode];
      if (addrData != null && addrData['address'] != null) {
        ss(() {
          _depositAddress = addrData['address'] as String;
          _depositLoading = false;
        });
        return;
      }

      // Derive new address from HD wallet
      final address = HdWalletService.deriveAddress(widget.currencyCode, uid);
      addresses[widget.currencyCode] = {
        'address': address,
        'created_at': DateTime.now().toIso8601String(),
      };
      await fs.saveCryptoDeposit(uid, {
        'uid': uid,
        'addresses': addresses,
      });
      ss(() {
        _depositAddress = address;
        _depositLoading = false;
      });
    } catch (e) {
      ss(() {
        _depositError = 'Error: $e';
        _depositLoading = false;
      });
    }
  }

  Future<void> _fetchFeeInfo(StateSetter ss) async {
    ss(() => _feeLoading = true);
    try {
      final info = await NetworkFeeService.getFeeInfo(widget.currencyCode);
      ss(() { _feeInfo = info; _feeLoading = false; });
    } catch (_) {
      ss(() => _feeLoading = false);
    }
  }

  void _showSendSheet() {
    final wallet = context.read<WalletProvider>();
    final coinBal = wallet.cryptoBalances[widget.coinSymbol] ?? 0;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          final addressController = TextEditingController();
          final amountController = TextEditingController();
          bool isProcessing = false;

          return _buildAutoSizeSheet('Send ${widget.coinName}', StatefulBuilder(
            builder: (context, innerState) {
              double sendAmount = double.tryParse(amountController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              bool canSend = sendAmount > 0 && sendAmount <= coinBal && addressController.text.trim().isNotEmpty;

              return _buildSendSheetContent(
                addressController, amountController, coinBal, canSend, isProcessing, innerState, setSheetState,
                () async {
                  if (!canSend) return;
                  setSheetState(() => isProcessing = true);
                  try {
                    final uid = context.read<AuthProvider>().firebaseUser!.uid;
                    await FirestoreService().requestSend(
                      uid: uid,
                      coinSymbol: widget.coinSymbol,
                      coinAmount: sendAmount,
                      recipientAddress: addressController.text.trim(),
                      networkFee: '0.0005 ${widget.coinSymbol}',
                    );
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Send request submitted. Processing...', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFF0F1423),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  } catch (e) {
                    setSheetState(() => isProcessing = false);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(e.toString().replaceFirst('Exception: ', ''), style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFFEF4444),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  }
                },
              );
            },
          ));
        },
      ),
    );
  }

  void _showBuySheet() {
    final wallet = context.read<WalletProvider>();
    final ngnBal = wallet.nairaBalance;
    final md = _marketData;
    final priceNaira = md?.priceNaira ?? 0;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          final buyController = TextEditingController();
          final quickAmounts = ['\u20A65,000', '\u20A610,000', '\u20A650,000', '\u20A6100,000'];
          int selectedQuick = -1;
          bool isProcessing = false;

          return _buildAutoSizeSheet('Buy ${widget.coinName}', StatefulBuilder(
            builder: (context, innerState) {
              double inputNaira = double.tryParse(buyController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              double coinAmount = priceNaira > 0 ? inputNaira / priceNaira : 0;
              bool canBuy = inputNaira > 0 && inputNaira <= ngnBal && priceNaira > 0;

              return _buildBuySheetContent(
                buyController, quickAmounts, selectedQuick, setSheetState,
                ngnBal, coinAmount, canBuy, isProcessing, innerState, (val) {
                  setSheetState(() {
                    selectedQuick = val;
                    if (val >= 0 && val < quickAmounts.length) {
                      final amt = quickAmounts[val].replaceAll(RegExp(r'[^\d.]'), '');
                      buyController.text = amt;
                    }
                  });
                }, () async {
                  if (!canBuy) return;
                  setSheetState(() => isProcessing = true);
                  try {
                    final uid = context.read<AuthProvider>().firebaseUser!.uid;
                    await FirestoreService().executeBuy(
                      uid: uid,
                      coinSymbol: widget.coinSymbol,
                      nairaAmount: inputNaira,
                      coinAmount: coinAmount,
                    );
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Successfully bought ${coinAmount.toStringAsFixed(8)} ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFF0F1423),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  } catch (e) {
                    setSheetState(() => isProcessing = false);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(e.toString().replaceFirst('Exception: ', ''), style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFFEF4444),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  }
                },
              );
            },
          ));
        },
      ),
    );
  }

  void _showSellSheet() {
    final wallet = context.read<WalletProvider>();
    final coinBal = wallet.cryptoBalances[widget.coinSymbol] ?? 0;
    final md = _marketData;
    final priceNaira = md?.priceNaira ?? 0;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          final sellController = TextEditingController();
          final quickPercents = ['25%', '50%', '75%', 'MAX'];
          int selectedPercent = -1;
          bool isProcessing = false;

          return _buildAutoSizeSheet('Sell ${widget.coinName}', StatefulBuilder(
            builder: (context, innerState) {
              double inputCoin = double.tryParse(sellController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              double nairaAmount = inputCoin * priceNaira;
              bool canSell = inputCoin > 0 && inputCoin <= coinBal && priceNaira > 0;

              return _buildSellSheetContent(
                sellController, quickPercents, selectedPercent, setSheetState,
                coinBal, nairaAmount, canSell, isProcessing, innerState, (val) {
                  setSheetState(() {
                    selectedPercent = val;
                    double pct = 0;
                    if (val == 0) pct = 0.25;
                    else if (val == 1) pct = 0.50;
                    else if (val == 2) pct = 0.75;
                    else if (val == 3) pct = 1.0;
                    sellController.text = (coinBal * pct).toStringAsFixed(8);
                  });
                }, () async {
                  if (!canSell) return;
                  setSheetState(() => isProcessing = true);
                  try {
                    final uid = context.read<AuthProvider>().firebaseUser!.uid;
                    await FirestoreService().executeSell(
                      uid: uid,
                      coinSymbol: widget.coinSymbol,
                      coinAmount: inputCoin,
                      nairaAmount: nairaAmount,
                    );
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Successfully sold ${inputCoin.toStringAsFixed(8)} ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFF0F1423),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  } catch (e) {
                    setSheetState(() => isProcessing = false);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(e.toString().replaceFirst('Exception: ', ''), style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFFEF4444),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  }
                },
              );
            },
          ));
        },
      ),
    );
  }

  void _showSwapSheet() {
    final wallet = context.read<WalletProvider>();
    final fromBal = wallet.cryptoBalances[widget.coinSymbol] ?? 0;
    final md = _marketData;
    final fromPriceUsd = md?.priceUsd ?? 0;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          final swapController = TextEditingController();
          String toCoin = 'USDT';
          bool isProcessing = false;

          return _buildAutoSizeSheet('Swap ${widget.coinName}', StatefulBuilder(
            builder: (context, innerState) {
              double inputAmount = double.tryParse(swapController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              final toMd = MarketDataService.getCached(toCoin);
              final toPriceUsd = toMd?.priceUsd ?? 0;
              double toAmount = (fromPriceUsd > 0 && toPriceUsd > 0) ? (inputAmount * fromPriceUsd / toPriceUsd) * 0.995 : 0;
              bool canSwap = inputAmount > 0 && inputAmount <= fromBal && fromPriceUsd > 0 && toPriceUsd > 0 && toCoin != widget.coinSymbol;

              return _buildSwapSheetContent(
                swapController, setSheetState, fromBal, toAmount, toCoin, canSwap, isProcessing, innerState,
                (newCoin) { setSheetState(() => toCoin = newCoin); innerState(() {}); },
                () async {
                  if (!canSwap) return;
                  setSheetState(() => isProcessing = true);
                  try {
                    final uid = context.read<AuthProvider>().firebaseUser!.uid;
                    await FirestoreService().executeSwap(
                      uid: uid, fromCoin: widget.coinSymbol, toCoin: toCoin,
                      fromAmount: inputAmount, toAmount: toAmount,
                    );
                    if (mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Successfully swapped ${inputAmount.toStringAsFixed(8)} ${widget.coinSymbol} to ${toAmount.toStringAsFixed(8)} $toCoin', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFF0F1423),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  } catch (e) {
                    setSheetState(() => isProcessing = false);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(e.toString().replaceFirst('Exception: ', ''), style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: const Color(0xFFEF4444),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        ),
                      );
                    }
                  }
                },
              );
            },
          ));
        },
      ),
    );
  }

  void _showCoinPicker(ValueChanged<String> onSelected) {
    final coins = ['BTC', 'ETH', 'USDT', 'TON', 'TRX'];
    final wallet = context.read<WalletProvider>();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Color(0xF20F1423),
          borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 12),
            Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
            const SizedBox(height: 16),
            Text('Select Coin', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
            const SizedBox(height: 16),
            ...coins.where((c) => c != widget.coinSymbol).map((coin) {
              final bal = wallet.cryptoBalances[coin] ?? 0;
              return ListTile(
                onTap: () { onSelected(coin); Navigator.pop(context); },
                leading: Container(width: 32, height: 32, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.1)), child: Center(child: Text(coin.substring(0, 1), style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)))),
                title: Text(coin, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
                subtitle: Text('Bal: ${bal.toStringAsFixed(8)}', style: GoogleFonts.plusJakartaSans(fontSize: 11, color: const Color(0xFF9CA3AF))),
              );
            }),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildAutoSizeSheet(String title, Widget content) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
      decoration: const BoxDecoration(
        color: Color(0xF20F1423),
        borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
        border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
        boxShadow: [BoxShadow(color: Color(0x80000000), blurRadius: 40, offset: Offset(0, -10))],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildSheetHeader(title),
            Flexible(child: content),
          ],
        ),
      ),
    );
  }

  Widget _buildDepositSheetContainer(StateSetter ss) {
    return _buildAutoSizeSheet('Deposit ${widget.coinName}', _buildDepositSheetContent(ss));
  }

  Widget _buildSheetHeader(String title) {
    return Column(
      children: [
        Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
            GestureDetector(
              onTap: () => Navigator.pop(context),
              child: Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.05)), child: const Center(child: Icon(Icons.close_rounded, size: 12, color: Color(0xFF9CA3AF)))),
            ),
          ],
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildDepositSheetContent(StateSetter ss) {
    return ListView(
      shrinkWrap: true,
      children: [
                if (_depositLoading) ...[
                  const SizedBox(height: 40),
                  const Center(child: CircularProgressIndicator(color: Color(0xFF10B981), strokeWidth: 2)),
                  const SizedBox(height: 16),
                  Center(child: Text('Loading deposit address...', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)))),
                ] else if (_depositError != null) ...[
                  const SizedBox(height: 40),
                  Center(child: Icon(Icons.error_outline_rounded, color: const Color(0xFFEF4444), size: 24)),
                  const SizedBox(height: 8),
                  Center(child: Text(_depositError!, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF)), textAlign: TextAlign.center)),
                  const SizedBox(height: 12),
                  Center(child: GestureDetector(onTap: () { _depositError = null; _depositAddress = null; _loadDepositAddress(ss); }, child: Text('Retry', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF34D399))))),
                ] else if (_depositAddress != null) ...[
                  Center(
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(color: Colors.white, borderRadius: BorderRadius.all(Radius.circular(16))),
                      child: QrImageView(data: _depositAddress!, size: 128, backgroundColor: Colors.white),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('SELECTED NETWORK', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: widget.coinColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                        child: Row(
                          children: [
                            Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: widget.coinColor)),
                            const SizedBox(width: 6),
                            Text('${widget.coinName} (${widget.coinSymbol})', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: widget.coinColor)),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  GestureDetector(
                    onTap: () {
                      Clipboard.setData(ClipboardData(text: _depositAddress!));
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Address Copied!', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)), behavior: SnackBarBehavior.floating, backgroundColor: const Color(0xFF0F1423), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)), duration: const Duration(seconds: 2)));
                    },
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('WALLET ADDRESS', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                                    const SizedBox(height: 2),
                                    Text(_depositAddress!, style: GoogleFonts.robotoMono(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white), overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(width: 28, height: 28, decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: const Center(child: Icon(Icons.copy_rounded, size: 12, color: Color(0xFF60A5FA)))),
                            ],
                          ),
                          if (_feeInfo != null) ...[
                            const SizedBox(height: 10),
                            Divider(height: 1, color: Colors.white.withOpacity(0.08)),
                            const SizedBox(height: 10),
                            _buildFeeRow(
                              'Network Fee',
                              _feeLoading ? 'Loading...' : _formatCoinAmount(_feeInfo!.networkFeeCoin, _feeInfo!.feeCoinSymbol),
                              '',
                              const Color(0xFF10B981),
                            ),
                            const SizedBox(height: 8),
                            _buildFeeRow(
                              'Min Deposit',
                              _feeLoading ? 'Loading...' : _formatCoinAmount(_feeInfo!.minDepositCoin, _feeInfo!.minDepositSymbol),
                              '',
                              const Color(0xFF2563EB),
                            ),
                          ] else if (_feeLoading) ...[
                            const SizedBox(height: 10),
                            Divider(height: 1, color: Colors.white.withOpacity(0.08)),
                            const SizedBox(height: 10),
                            Center(child: SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Color(0xFF6B7280), strokeWidth: 1.5))),
                          ],
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFFF59E0B).withOpacity(0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2))),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(width: 20, height: 20, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFFF59E0B).withOpacity(0.2)), child: const Center(child: Icon(Icons.warning_rounded, size: 8, color: Color(0xFFF59E0B)))),
                        const SizedBox(width: 8),
                        Expanded(child: Text('Send only ${widget.coinName} (${widget.coinSymbol}) to this address. Sending other assets may result in permanent loss.', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB), height: 1.5))),
                      ],
                    ),
                  ),
                ],
              ],
            );
  }

  Widget _buildFeeRow(String title, String value, String subtitle, Color color) {
    return Row(crossAxisAlignment: CrossAxisAlignment.center, children: [
      Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: color)),
      const SizedBox(width: 6),
      Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
      const Spacer(),
      Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.white)),
      if (subtitle.isNotEmpty) ...[
        const SizedBox(width: 4),
        Text(subtitle, style: GoogleFonts.plusJakartaSans(fontSize: 9, fontWeight: FontWeight.w600, color: color)),
      ],
    ]);
  }

  String _formatCoinAmount(double amount, String symbol) {
    if (symbol.isEmpty) return '\$${amount.toStringAsFixed(2)}';
    if (amount >= 1) return '${amount.toStringAsFixed(2)} $symbol';
    if (amount >= 0.01) return '${amount.toStringAsFixed(4)} $symbol';
    return '${amount.toStringAsFixed(6)} $symbol';
  }

  Widget _buildSendSheetContent(TextEditingController addressController, TextEditingController amountController, double coinBal, bool canSend, bool isProcessing, StateSetter innerState, StateSetter setSheetState, VoidCallback onExecute) {
    return ListView(
      shrinkWrap: true,
      children: [
                Text('RECIPIENT ADDRESS', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: addressController,
                          style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
                          decoration: InputDecoration(hintText: 'Paste or scan ${widget.coinSymbol} address...', hintStyle: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white.withOpacity(0.4)), border: InputBorder.none, isDense: true),
                          onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                        ),
                      ),
                      const Icon(Icons.content_paste_rounded, size: 14, color: Color(0xFF60A5FA)),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('AMOUNT', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                    Text('Bal: ${coinBal.toStringAsFixed(8)} ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  ],
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                  child: Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: amountController,
                          keyboardType: TextInputType.number,
                          style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                          decoration: InputDecoration(hintText: '0.00', hintStyle: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, isDense: true),
                          onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                        ),
                      ),
                      Text(widget.coinSymbol, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF9CA3AF))),
                      const SizedBox(width: 8),
                      GestureDetector(onTap: () { amountController.text = coinBal.toStringAsFixed(8); setSheetState(() {}); innerState(() {}); }, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: Text('MAX', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA))))),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                  child: Row(
                    children: [
                      Container(
                        width: 24, height: 24,
                        decoration: BoxDecoration(shape: BoxShape.circle, color: widget.coinColor.withOpacity(0.1)),
                        child: Center(
                          child: widget.iconUrl != null && widget.iconUrl!.isNotEmpty
                              ? CachedNetworkImage(
                                  imageUrl: widget.iconUrl!,
                                  width: 14,
                                  height: 14,
                                  errorWidget: (context, url, error) => FaIcon(widget.coinIcon, size: 10, color: widget.coinColor),
                                )
                              : FaIcon(widget.coinIcon, size: 10, color: widget.coinColor),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${widget.coinName} Network', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                            Text('Est. Arrival: ~10 mins', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text('Fee (${TradeFeeService.sendFeePercent}%)', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
                          Text('${double.tryParse(amountController.text.replaceAll(RegExp(r'[^\d.]'), '')) != null ? (double.tryParse(amountController.text.replaceAll(RegExp(r'[^\d.]'), ''))! * TradeFeeService.sendFeePercent / 100).toStringAsFixed(8) : '0.00'} ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                GestureDetector(
                  onTap: canSend && !isProcessing ? onExecute : null,
                  child: Container(
                    width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(color: canSend ? const Color(0xFFF59E0B) : const Color(0xFF1E293B), borderRadius: BorderRadius.circular(14), boxShadow: canSend ? [BoxShadow(color: const Color(0xFFF59E0B).withOpacity(0.4), blurRadius: 15)] : []),
                    child: Center(child: isProcessing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('Send ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: canSend ? Colors.white : const Color(0xFF6B7280)))),
                  ),
                ),
              ],
            );
  }

  Widget _buildBuySheetContent(TextEditingController buyController, List<String> quickAmounts, int selectedQuick, StateSetter setSheetState, double ngnBal, double coinAmount, bool canBuy, bool isProcessing, StateSetter innerState, ValueChanged<int> onQuickTap, VoidCallback onExecute) {
    return ListView(
      shrinkWrap: true,
      children: [
                Column(
                  children: [
                    Text('AMOUNT IN NGN', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text('\u20A6', style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white.withOpacity(0.3))),
                        const SizedBox(width: 4),
                        SizedBox(
                          width: 120,
                          child: TextField(
                            controller: buyController,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white),
                            decoration: InputDecoration(hintText: '0', hintStyle: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, isDense: true),
                            onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text('\u2248 ${coinAmount.toStringAsFixed(8)} ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF60A5FA))),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: List.generate(quickAmounts.length, (index) {
                    final isSelected = selectedQuick == index;
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(right: index < quickAmounts.length - 1 ? 8 : 0),
                        child: GestureDetector(
                          onTap: () { onQuickTap(index); innerState(() {}); },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF1E293B) : Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: isSelected ? Colors.transparent : Colors.white.withOpacity(0.1)),
                            ),
                            child: Text(quickAmounts[index], textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFF9CA3AF))),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                  child: Row(
                    children: [
                      Container(width: 28, height: 28, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x1A10B981)), child: const Center(child: Text('\u20A6', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF34D399))))),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('NGN Wallet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                            Text('Bal: \u20A6${ngnBal.toStringAsFixed(2)}', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, size: 12, color: Color(0xFF6B7280)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Fee (${TradeFeeService.buyFeePercent}%)', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                    Text('\u2248 ${coinAmount > 0 ? (coinAmount * TradeFeeService.buyFeePercent / 100).toStringAsFixed(8) : '0.00'} ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
                  ],
                ),
                const SizedBox(height: 20),
                GestureDetector(
                  onTap: canBuy && !isProcessing ? onExecute : null,
                  child: Container(
                    width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(color: canBuy ? const Color(0xFF10B981) : const Color(0xFF1E293B), borderRadius: BorderRadius.circular(14), boxShadow: canBuy ? [BoxShadow(color: const Color(0xFF10B981).withOpacity(0.4), blurRadius: 15)] : []),
                    child: Center(child: isProcessing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('Buy ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: canBuy ? Colors.white : const Color(0xFF6B7280)))),
                  ),
                ),
              ],
            );
  }

  Widget _buildSellSheetContent(TextEditingController sellController, List<String> quickPercents, int selectedPercent, StateSetter setSheetState, double coinBal, double nairaAmount, bool canSell, bool isProcessing, StateSetter innerState, ValueChanged<int> onQuickTap, VoidCallback onExecute) {
    return ListView(
      shrinkWrap: true,
      children: [
                Column(
                  children: [
                    Text('AMOUNT IN ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                    const SizedBox(height: 4),
                    SizedBox(
                      width: 200,
                      child: TextField(
                        controller: sellController,
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        style: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white),
                        decoration: InputDecoration(hintText: '0.00', hintStyle: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, suffix: Text(widget.coinSymbol, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white.withOpacity(0.3))), isDense: true),
                        onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text('\u2248 \u20A6${nairaAmount.toStringAsFixed(2)}', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFFF87171))),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: List.generate(quickPercents.length, (index) {
                    final isSelected = selectedPercent == index;
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(right: index < quickPercents.length - 1 ? 8 : 0),
                        child: GestureDetector(
                          onTap: () { onQuickTap(index); innerState(() {}); },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            decoration: BoxDecoration(
                              color: isSelected ? const Color(0xFF1E293B) : Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: isSelected ? Colors.transparent : Colors.white.withOpacity(0.1)),
                            ),
                            child: Text(quickPercents[index], textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFF9CA3AF))),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                  child: Row(
                    children: [
                      Container(width: 28, height: 28, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x1A10B981)), child: const Center(child: Text('\u20A6', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF34D399))))),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Receive to NGN Wallet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                            Text('Bal: ${coinBal.toStringAsFixed(8)} ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                          ],
                        ),
                      ),
                      Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(4)), child: Text('${TradeFeeService.sellFeePercent}% fee', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)))),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                GestureDetector(
                  onTap: canSell && !isProcessing ? onExecute : null,
                  child: Container(
                    width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 16),
                    decoration: BoxDecoration(color: canSell ? const Color(0xFFEF4444) : const Color(0xFF1E293B), borderRadius: BorderRadius.circular(14), boxShadow: canSell ? [BoxShadow(color: const Color(0xFFEF4444).withOpacity(0.4), blurRadius: 15)] : []),
                    child: Center(child: isProcessing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('Sell ${widget.coinSymbol}', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: canSell ? Colors.white : const Color(0xFF6B7280)))),
                  ),
                ),
              ],
            );
  }

  Widget _buildSwapSheetContent(TextEditingController swapController, StateSetter setSheetState, double fromBal, double toAmount, String toCoin, bool canSwap, bool isProcessing, StateSetter innerState, ValueChanged<String> onCoinChanged, VoidCallback onExecute) {
    return ListView(
      shrinkWrap: true,
      children: [
        Text('YOU PAY', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Row(
            children: [
              Expanded(
                child: TextField(
                  controller: swapController,
                  keyboardType: TextInputType.number,
                  style: GoogleFonts.robotoMono(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                  decoration: InputDecoration(hintText: '0.00', hintStyle: GoogleFonts.robotoMono(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, isDense: true),
                  onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: widget.coinColor.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                child: Row(
                  children: [
                    Container(
                      width: 16, height: 16,
                      decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
                      child: Center(
                        child: widget.iconUrl != null && widget.iconUrl!.isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: widget.iconUrl!,
                                width: 10,
                                height: 10,
                                errorWidget: (context, url, error) => FaIcon(widget.coinIcon, size: 8, color: widget.coinColor),
                              )
                            : FaIcon(widget.coinIcon, size: 8, color: widget.coinColor),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(widget.coinSymbol, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                    const SizedBox(width: 4),
                    const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF9CA3AF)),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Center(
          child: Container(
            width: 36, height: 36,
            decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFF8B5CF6).withOpacity(0.15), border: Border.all(color: const Color(0xFF8B5CF6).withOpacity(0.3))),
            child: const Center(child: Icon(Icons.swap_vert_rounded, size: 18, color: Color(0xFF8B5CF6))),
          ),
        ),
        const SizedBox(height: 8),
        Text('YOU RECEIVE', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Row(
            children: [
              Expanded(
                child: Text(toAmount.toStringAsFixed(8), style: GoogleFonts.robotoMono(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white.withOpacity(0.3))),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => _showCoinPicker(onCoinChanged),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      Container(width: 16, height: 16, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF10B981)), child: const Center(child: Text('\u20A6', style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Colors.white)))),
                      const SizedBox(width: 6),
                      Text(toCoin, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                      const SizedBox(width: 4),
                      const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF9CA3AF)),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Exchange Rate', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  Text('1 ${widget.coinSymbol} \u2248 ${toAmount > 0 && double.tryParse(swapController.text.replaceAll(RegExp(r'[^\d.]'), '')) != null ? (toAmount / (double.tryParse(swapController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 1)).toStringAsFixed(8) : '0.00'} $toCoin', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Network Fee', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  Text('${TradeFeeService.swapFeePercent}%', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white)),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Minimum Received', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  Text('${toAmount.toStringAsFixed(8)} $toCoin', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF34D399))),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
        GestureDetector(
          onTap: canSwap && !isProcessing ? onExecute : null,
          child: Container(
            width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 16),
            decoration: BoxDecoration(color: canSwap ? const Color(0xFF8B5CF6) : const Color(0xFF1E293B), borderRadius: BorderRadius.circular(14), boxShadow: canSwap ? [BoxShadow(color: const Color(0xFF8B5CF6).withOpacity(0.4), blurRadius: 15)] : []),
            child: Center(child: isProcessing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text('Swap Now', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: canSwap ? Colors.white : const Color(0xFF6B7280)))),
          ),
        ),
      ],
    );
  }
}

// ============ CUSTOM PAINTERS ============

class _ChartPainter extends CustomPainter {
  final Color upColor;
  final Color downColor;
  final List<double>? sparkline;
  _ChartPainter({required this.upColor, required this.downColor, this.sparkline});

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;

    List<Offset> points;
    if (sparkline != null && sparkline!.length > 1) {
      final minVal = sparkline!.reduce((a, b) => a < b ? a : b);
      final maxVal = sparkline!.reduce((a, b) => a > b ? a : b);
      final range = maxVal - minVal;
      points = sparkline!.asMap().entries.map((e) {
        final x = (e.key / (sparkline!.length - 1)) * w;
        final y = h - ((e.value - minVal) / (range == 0 ? 1 : range)) * h;
        return Offset(x, y);
      }).toList();
    } else {
      points = [
        Offset(0, h * 0.5),
        Offset(w * 0.1, h * 0.6),
        Offset(w * 0.2, h * 0.67),
        Offset(w * 0.3, h * 0.5),
        Offset(w * 0.4, h * 0.4),
        Offset(w * 0.5, h * 0.55),
        Offset(w * 0.6, h * 0.3),
        Offset(w * 0.7, h * 0.35),
        Offset(w * 0.8, h * 0.17),
        Offset(w * 0.9, h * 0.1),
        Offset(w, h * 0.07),
      ];
    }

    // Draw fill gradient (use up color as base)
    final fillPath = Path()..moveTo(0, h);
    for (final p in points) {
      fillPath.lineTo(p.dx, p.dy);
    }
    fillPath.lineTo(w, h);
    fillPath.close();

    final gradient = LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [upColor.withOpacity(0.25), upColor.withOpacity(0)]);
    final rect = Rect.fromLTWH(0, 0, w, h);
    final fillPaint = Paint()..shader = gradient.createShader(rect);
    canvas.drawPath(fillPath, fillPaint);

    // Draw line segment-by-segment with green/red coloring
    for (int i = 1; i < points.length; i++) {
      final isUp = points[i].dy <= points[i - 1].dy;
      final segmentPaint = Paint()
        ..color = isUp ? upColor : downColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round;
      final prev = points[i - 1];
      final curr = points[i];
      final midX = (prev.dx + curr.dx) / 2;
      final path = Path()..moveTo(prev.dx, prev.dy);
      path.quadraticBezierTo(prev.dx, prev.dy, midX, (prev.dy + curr.dy) / 2);
      path.lineTo(curr.dx, curr.dy);
      canvas.drawPath(path, segmentPaint);
    }
  }

  @override
  bool shouldRepaint(covariant _ChartPainter oldDelegate) =>
      oldDelegate.sparkline != sparkline || oldDelegate.upColor != upColor || oldDelegate.downColor != downColor;
}

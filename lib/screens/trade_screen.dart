import 'dart:async';
import 'dart:math';
import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:font_awesome_flutter/font_awesome_flutter.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../models/transaction_model.dart';
import '../providers/auth_provider.dart';
import '../providers/transaction_provider.dart';
import '../providers/wallet_provider.dart';
import '../services/firestore_service.dart';
import '../services/market_data_service.dart';
import '../services/trade_fee_service.dart';
import '../widgets/app_background.dart';
import '../widgets/notification_icon.dart';
import 'coin_preview_screen.dart';

class TradeScreen extends StatefulWidget {
  final String? initialMode;
  final String? initialCoin;
  final ValueChanged<int>? onTabSwitch;

  const TradeScreen({super.key, this.initialMode, this.initialCoin, this.onTabSwitch});

  @override
  State<TradeScreen> createState() => _TradeScreenState();
}

class _TradeScreenState extends State<TradeScreen> with SingleTickerProviderStateMixin {
  late AnimationController _rainbowController;
  final _supportedCoins = ['BTC', 'ETH', 'USDT', 'TON', 'TRX'];
  String _selectedCoin = 'BTC';
  List<CoinMarketData> _marketDataList = [];
  StreamSubscription<List<CoinMarketData>>? _marketSub;

  final _coinIcons = <String, IconData>{
    'BTC': FontAwesomeIcons.bitcoin,
    'ETH': FontAwesomeIcons.ethereum,
    'USDT': FontAwesomeIcons.dollarSign,
    'TON': FontAwesomeIcons.telegram,
    'TRX': FontAwesomeIcons.telegram,
  };

  final _coinColors = <String, Color>{
    'BTC': const Color(0xFFF7931A),
    'ETH': const Color(0xFF627EEA),
    'USDT': const Color(0xFF26A17B),
    'TON': const Color(0xFF0098EA),
    'TRX': const Color(0xFFEF0027),
  };

  static const _coinMeta = <String, Map<String, dynamic>>{
    'BTC': {'name': 'Bitcoin', 'icon': FontAwesomeIcons.bitcoin, 'color': Color(0xFFF7931A)},
    'ETH': {'name': 'Ethereum', 'icon': FontAwesomeIcons.ethereum, 'color': Color(0xFF627EEA)},
    'USDT': {'name': 'Tether', 'icon': Icons.attach_money, 'color': Color(0xFF26A17B)},
    'TON': {'name': 'Toncoin', 'icon': Icons.bolt_rounded, 'color': Color(0xFF0098EA)},
    'TRX': {'name': 'TRON', 'icon': Icons.token_rounded, 'color': Color(0xFFEF0027)},
  };

  String _formatNairaValue(double value) {
    if (value >= 1000000000) return '${(value / 1000000000).toStringAsFixed(2)}B';
    if (value >= 1000000) return '${(value / 1000000).toStringAsFixed(2)}M';
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

  @override
  void initState() {
    super.initState();
    _rainbowController = AnimationController(
      duration: const Duration(seconds: 3),
      vsync: this,
    )..repeat();
    _marketSub = MarketDataService.watchAllCoins().listen((data) {
      if (mounted) setState(() => _marketDataList = data);
    });
    if (widget.initialCoin != null) _selectedCoin = widget.initialCoin!;
  }

  @override
  void dispose() {
    _rainbowController.dispose();
    _marketSub?.cancel();
    super.dispose();
  }

  CoinMarketData? _getMd(String coin) {
    for (final md in _marketDataList) {
      if (md.symbol.toUpperCase() == coin.toUpperCase()) return md;
    }
    return null;
  }

  IconData _getIcon(String coin) => _coinIcons[coin] ?? FontAwesomeIcons.coins;
  Color _getColor(String coin) => _coinColors[coin] ?? const Color(0xFF9CA3AF);

  String _fmtNaira(double v) {
    if (v >= 1e9) return '${(v / 1e9).toStringAsFixed(2)}B';
    if (v >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}M';
    final n = v.toInt();
    final s = n.toString();
    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    return s.replaceAllMapped(reg, (m) => '${m[1]},');
  }

  void _showSnackBar(String msg, {bool isError = false}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700)),
        behavior: SnackBarBehavior.floating,
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF0F1423),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
      ),
    );
  }

  Widget _buildSheet(String title, Widget content) {
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
            Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(title, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                GestureDetector(onTap: () => Navigator.pop(context), child: Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.05)), child: const Center(child: Icon(Icons.close_rounded, size: 12, color: Color(0xFF9CA3AF))))),
              ],
            ),
            const SizedBox(height: 20),
            Flexible(child: content),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
        Text(value, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: valueColor ?? Colors.white)),
      ],
    );
  }

  Widget _buildActionButton(String label, Color color, bool enabled, bool isProcessing, VoidCallback onTap) {
    return GestureDetector(
      onTap: enabled && !isProcessing ? onTap : null,
      child: Container(
        width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(color: enabled ? color : const Color(0xFF1E293B), borderRadius: BorderRadius.circular(14), boxShadow: enabled ? [BoxShadow(color: color.withOpacity(0.4), blurRadius: 15)] : []),
        child: Center(child: isProcessing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : Text(label, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: enabled ? Colors.white : const Color(0xFF6B7280)))),
      ),
    );
  }

  void _showCoinPicker(ValueChanged<String> onSelected) {
    final wallet = context.read<WalletProvider>();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.6),
        decoration: const BoxDecoration(
          color: Color(0xF20F1423),
          borderRadius: BorderRadius.only(topLeft: Radius.circular(32), topRight: Radius.circular(32)),
          border: Border(top: BorderSide(color: Color(0x1AFFFFFF))),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(width: 48, height: 6, decoration: const BoxDecoration(color: Color(0x33FFFFFF), borderRadius: BorderRadius.all(Radius.circular(3)))),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Select Coin', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                  GestureDetector(onTap: () => Navigator.pop(context), child: Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.05)), child: const Center(child: Icon(Icons.close_rounded, size: 12, color: Color(0xFF9CA3AF))))),
                ],
              ),
              const SizedBox(height: 16),
              ..._supportedCoins.map((coin) {
                final bal = wallet.cryptoBalances[coin] ?? 0;
                final md = _getMd(coin);
                final price = md?.priceNaira ?? 0;
                final isSelected = coin == _selectedCoin;
                return GestureDetector(
                  onTap: () { onSelected(coin); Navigator.pop(context); },
                  behavior: HitTestBehavior.opaque,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFF2563EB).withOpacity(0.08) : Colors.white.withOpacity(0.03),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: isSelected ? const Color(0xFF2563EB).withOpacity(0.3) : Colors.white.withOpacity(0.06)),
                    ),
                    child: Row(
                      children: [
                        Container(width: 36, height: 36, decoration: BoxDecoration(shape: BoxShape.circle, color: _getColor(coin).withOpacity(0.15), border: Border.all(color: _getColor(coin).withOpacity(0.2))), child: Center(child: FaIcon(_getIcon(coin), size: 14, color: _getColor(coin)))),
                        const SizedBox(width: 12),
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(coin, style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: isSelected ? const Color(0xFF2563EB) : Colors.white)),
                          const SizedBox(height: 2),
                          Text('Bal: ${bal.toStringAsFixed(6)}', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                        ])),
                        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                          Text('\u20A6${_fmtNaira(price)}', style: GoogleFonts.plusJakartaSans(fontSize: 15, fontWeight: FontWeight.w800, color: Colors.white)),
                          const SizedBox(height: 2),
                          if (isSelected) const Icon(Icons.check_rounded, size: 16, color: Color(0xFF2563EB)) else const SizedBox(height: 16),
                        ]),
                      ],
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  void _showBuySheet() {
    final wallet = context.read<WalletProvider>();
    final ngnBal = wallet.nairaBalance;
    final md = _getMd(_selectedCoin);
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

          return _buildSheet('Buy $_selectedCoin', StatefulBuilder(
            builder: (context, innerState) {
              double inputNaira = double.tryParse(buyController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              double coinAmount = priceNaira > 0 ? inputNaira / priceNaira : 0;
              double feeCoin = coinAmount * TradeFeeService.buyFeePercent / 100;
              double netCoin = coinAmount - feeCoin;
              bool canBuy = inputNaira > 0 && inputNaira <= ngnBal && priceNaira > 0;

              return ListView(
                shrinkWrap: true,
                children: [
                  Column(children: [
                    Text('AMOUNT IN NGN', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                    const SizedBox(height: 4),
                    Row(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
                      Text('\u20A6', style: GoogleFonts.plusJakartaSans(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white.withOpacity(0.3))),
                      const SizedBox(width: 4),
                      SizedBox(width: 120, child: TextField(
                        controller: buyController, keyboardType: TextInputType.number, textAlign: TextAlign.center,
                        style: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white),
                        decoration: InputDecoration(hintText: '0', hintStyle: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, isDense: true),
                        onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                      )),
                    ]),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text('\u2248 ${netCoin.toStringAsFixed(8)} $_selectedCoin', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF60A5FA))),
                    ),
                  ]),
                  const SizedBox(height: 20),
                  Row(children: List.generate(quickAmounts.length, (index) {
                    final isSelected = selectedQuick == index;
                    return Expanded(child: Padding(
                      padding: EdgeInsets.only(right: index < quickAmounts.length - 1 ? 8 : 0),
                      child: GestureDetector(
                        onTap: () { setSheetState(() { selectedQuick = index; buyController.text = quickAmounts[index].replaceAll(RegExp(r'[^\d.]'), ''); }); innerState(() {}); },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(color: isSelected ? const Color(0xFF1E293B) : Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: isSelected ? Colors.transparent : Colors.white.withOpacity(0.1))),
                          child: Text(quickAmounts[index], textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFF9CA3AF))),
                        ),
                      ),
                    ));
                  })),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: Row(children: [
                      Container(width: 28, height: 28, decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0x1A10B981)), child: const Center(child: Text('\u20A6', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF34D399))))),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('NGN Wallet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                        Text('Bal: \u20A6${ngnBal.toStringAsFixed(2)}', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                      ])),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow('Fee (${TradeFeeService.buyFeePercent}%)', '\u2248 ${feeCoin.toStringAsFixed(8)} $_selectedCoin'),
                  const SizedBox(height: 20),
                  _buildActionButton('Buy $_selectedCoin', const Color(0xFF10B981), canBuy, isProcessing, () async {
                    if (!canBuy) return;
                    setSheetState(() => isProcessing = true);
                    try {
                      final uid = context.read<AuthProvider>().firebaseUser!.uid;
                      await FirestoreService().executeBuy(uid: uid, coinSymbol: _selectedCoin, nairaAmount: inputNaira, coinAmount: coinAmount);
                      if (mounted) { Navigator.pop(context); _showSnackBar('Bought ${netCoin.toStringAsFixed(8)} $_selectedCoin'); }
                    } catch (e) {
                      setSheetState(() => isProcessing = false);
                      if (mounted) _showSnackBar(e.toString().replaceFirst('Exception: ', ''), isError: true);
                    }
                  }),
                ],
              );
            },
          ));
        },
      ),
    );
  }
  void _showSellSheet() {
    final wallet = context.read<WalletProvider>();
    final coinBal = wallet.cryptoBalances[_selectedCoin] ?? 0;
    final md = _getMd(_selectedCoin);
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

          return _buildSheet('Sell $_selectedCoin', StatefulBuilder(
            builder: (context, innerState) {
              double inputCoin = double.tryParse(sellController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              double nairaAmount = inputCoin * priceNaira;
              double feeNaira = nairaAmount * TradeFeeService.sellFeePercent / 100;
              double netNaira = nairaAmount - feeNaira;
              bool canSell = inputCoin > 0 && inputCoin <= coinBal && priceNaira > 0;

              return ListView(
                shrinkWrap: true,
                children: [
                  Column(children: [
                    Text('AMOUNT IN $_selectedCoin', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                    const SizedBox(height: 4),
                    SizedBox(width: 200, child: TextField(
                      controller: sellController, keyboardType: TextInputType.number, textAlign: TextAlign.center,
                      style: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white),
                      decoration: InputDecoration(hintText: '0.00', hintStyle: GoogleFonts.plusJakartaSans(fontSize: 36, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, suffix: Text(_selectedCoin, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white.withOpacity(0.3))), isDense: true),
                      onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                    )),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                      child: Text('\u2248 \u20A6${netNaira.toStringAsFixed(2)}', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFFEF4444))),
                    ),
                  ]),
                  const SizedBox(height: 20),
                  Row(children: List.generate(quickPercents.length, (index) {
                    final isSelected = selectedPercent == index;
                    return Expanded(child: Padding(
                      padding: EdgeInsets.only(right: index < quickPercents.length - 1 ? 8 : 0),
                      child: GestureDetector(
                        onTap: () {
                          setSheetState(() { selectedPercent = index; double pct = [0.25, 0.50, 0.75, 1.0][index]; sellController.text = (coinBal * pct).toStringAsFixed(8); });
                          innerState(() {});
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(color: isSelected ? const Color(0xFF1E293B) : Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(8), border: Border.all(color: isSelected ? Colors.transparent : Colors.white.withOpacity(0.1))),
                          child: Text(quickPercents[index], textAlign: TextAlign.center, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: isSelected ? Colors.white : const Color(0xFF9CA3AF))),
                        ),
                      ),
                    ));
                  })),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: Row(children: [
                      Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: _getColor(_selectedCoin).withOpacity(0.1)), child: Center(child: FaIcon(_getIcon(_selectedCoin), size: 10, color: _getColor(_selectedCoin)))),
                      const SizedBox(width: 10),
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Receive to NGN Wallet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                        Text('Bal: ${coinBal.toStringAsFixed(8)} $_selectedCoin', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                      ])),
                      Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2), decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(4)), child: Text('${TradeFeeService.sellFeePercent}% fee', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)))),
                    ]),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoRow('Fee', '\u20A6${feeNaira.toStringAsFixed(2)}'),
                  const SizedBox(height: 20),
                  _buildActionButton('Sell $_selectedCoin', const Color(0xFFEF4444), canSell, isProcessing, () async {
                    if (!canSell) return;
                    setSheetState(() => isProcessing = true);
                    try {
                      final uid = context.read<AuthProvider>().firebaseUser!.uid;
                      await FirestoreService().executeSell(uid: uid, coinSymbol: _selectedCoin, coinAmount: inputCoin, nairaAmount: nairaAmount);
                      if (mounted) { Navigator.pop(context); _showSnackBar('Sold for \u20A6${netNaira.toStringAsFixed(2)}'); }
                    } catch (e) {
                      setSheetState(() => isProcessing = false);
                      if (mounted) _showSnackBar(e.toString().replaceFirst('Exception: ', ''), isError: true);
                    }
                  }),
                ],
              );
            },
          ));
        },
      ),
    );
  }
  void _showSwapSheet() {
    final wallet = context.read<WalletProvider>();
    String toCoin = _supportedCoins.firstWhere((c) => c != _selectedCoin, orElse: () => 'USDT');

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          final swapController = TextEditingController();
          bool isProcessing = false;

          return _buildSheet('Swap $_selectedCoin', StatefulBuilder(
            builder: (context, innerState) {
              double fromAmount = double.tryParse(swapController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              final fromBal = wallet.cryptoBalances[_selectedCoin] ?? 0;
              final fromMd = _getMd(_selectedCoin);
              final toMd = _getMd(toCoin);
              final fromPriceUsd = fromMd?.priceUsd ?? 0;
              final toPriceUsd = toMd?.priceUsd ?? 0;
              double toAmount = (fromPriceUsd > 0 && toPriceUsd > 0) ? (fromAmount * fromPriceUsd / toPriceUsd) * 0.995 : 0;
              double feeTo = toAmount * TradeFeeService.swapFeePercent / 100;
              double netTo = toAmount - feeTo;
              bool canSwap = fromAmount > 0 && fromAmount <= fromBal && _selectedCoin != toCoin && toAmount > 0;

              return ListView(
                shrinkWrap: true,
                children: [
                  Text('YOU PAY', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: Row(children: [
                      Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: _getColor(_selectedCoin).withOpacity(0.1)), child: Center(child: FaIcon(_getIcon(_selectedCoin), size: 10, color: _getColor(_selectedCoin)))),
                      const SizedBox(width: 8),
                      Text(_selectedCoin, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                      const Spacer(),
                      SizedBox(width: 100, child: TextField(
                        controller: swapController, keyboardType: TextInputType.number, textAlign: TextAlign.right,
                        style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                        decoration: InputDecoration(hintText: '0.00', hintStyle: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white24), border: InputBorder.none, isDense: true),
                        onChanged: (_) { setSheetState(() {}); innerState(() {}); },
                      )),
                    ]),
                  ),
                  const SizedBox(height: 4),
                  Text('Bal: ${fromBal.toStringAsFixed(8)} $_selectedCoin', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                  const SizedBox(height: 12),
                  Center(child: GestureDetector(onTap: () { setSheetState(() { final t = _selectedCoin; _selectedCoin = toCoin; toCoin = t; }); }, child: Container(width: 36, height: 36, decoration: BoxDecoration(shape: BoxShape.circle, color: Color(0xFF8B5CF6).withOpacity(0.15), border: Border.all(color: Color(0xFF8B5CF6).withOpacity(0.3))), child: const Center(child: Icon(Icons.swap_vert_rounded, size: 18, color: Color(0xFF8B5CF6)))))),
                  const SizedBox(height: 12),
                  Text('YOU RECEIVE', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                  const SizedBox(height: 6),
                  GestureDetector(
                    onTap: () => _showCoinPicker((c) { setSheetState(() => toCoin = c); innerState(() {}); }),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                      child: Row(children: [
                        Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: _getColor(toCoin).withOpacity(0.1)), child: Center(child: FaIcon(_getIcon(toCoin), size: 10, color: _getColor(toCoin)))),
                        const SizedBox(width: 8),
                        Text(toCoin, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.white)),
                        const Icon(Icons.keyboard_arrow_down_rounded, size: 14, color: Color(0xFF9CA3AF)),
                        const Spacer(),
                        Text(netTo.toStringAsFixed(8), style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
                      ]),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
                    child: Column(children: [
                      _buildInfoRow('Exchange Rate', '1 $_selectedCoin \u2248 ${toAmount > 0 && fromAmount > 0 ? (toAmount / fromAmount).toStringAsFixed(8) : "0.00"} $toCoin'),
                      const SizedBox(height: 8),
                      _buildInfoRow('Fee (${TradeFeeService.swapFeePercent}%)', '$feeTo $toCoin'),
                      const SizedBox(height: 8),
                      _buildInfoRow('Minimum Received', '$netTo $toCoin', valueColor: const Color(0xFF34D399)),
                    ]),
                  ),
                  const SizedBox(height: 20),
                  _buildActionButton('Swap Now', const Color(0xFF8B5CF6), canSwap, isProcessing, () async {
                    if (!canSwap) return;
                    setSheetState(() => isProcessing = true);
                    try {
                      final uid = context.read<AuthProvider>().firebaseUser!.uid;
                      await FirestoreService().executeSwap(uid: uid, fromCoin: _selectedCoin, toCoin: toCoin, fromAmount: fromAmount, toAmount: toAmount);
                      if (mounted) { Navigator.pop(context); _showSnackBar('Swapped to ${netTo.toStringAsFixed(8)} $toCoin'); }
                    } catch (e) {
                      setSheetState(() => isProcessing = false);
                      if (mounted) _showSnackBar(e.toString().replaceFirst('Exception: ', ''), isError: true);
                    }
                  }),
                ],
              );
            },
          ));
        },
      ),
    );
  }
  void _showSendSheet() {
    final wallet = context.read<WalletProvider>();
    final coinBal = wallet.cryptoBalances[_selectedCoin] ?? 0;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => StatefulBuilder(
        builder: (context, setSheetState) {
          final addressController = TextEditingController();
          final amountController = TextEditingController();
          bool isProcessing = false;

          return _buildSheet('Send $_selectedCoin', StatefulBuilder(
            builder: (context, innerState) {
              double sendAmount = double.tryParse(amountController.text.replaceAll(RegExp(r'[^\d.]'), '')) ?? 0;
              double feeCoin = sendAmount * TradeFeeService.sendFeePercent / 100;
              double totalDeduct = sendAmount + feeCoin;
              bool canSend = sendAmount > 0 && totalDeduct <= coinBal && addressController.text.trim().isNotEmpty;

              return _buildSendSheetContent(
                addressController, amountController, coinBal, canSend, isProcessing,
                sendAmount, feeCoin, totalDeduct, setSheetState, innerState,
              );
            },
          ));
        },
      ),
    );
  }

  Widget _buildSendSheetContent(
    TextEditingController addressController,
    TextEditingController amountController,
    double coinBal, bool canSend, bool isProcessing,
    double sendAmount, double feeCoin, double totalDeduct,
    StateSetter setSheetState, StateSetter innerState,
  ) {
    return ListView(
      shrinkWrap: true,
      children: [
        Text('RECIPIENT ADDRESS', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: TextField(
            controller: addressController,
            style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
            decoration: InputDecoration(hintText: 'Paste $_selectedCoin address...', hintStyle: GoogleFonts.robotoMono(fontSize: 14, color: Colors.white24), border: InputBorder.none, isDense: true),
            onChanged: (_) { setSheetState(() {}); innerState(() {}); },
          ),
        ),
        const SizedBox(height: 16),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('AMOUNT', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
          Text('Bal: ${coinBal.toStringAsFixed(8)} $_selectedCoin', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
        ]),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Row(children: [
            Expanded(child: TextField(
              controller: amountController, keyboardType: TextInputType.number,
              style: GoogleFonts.robotoMono(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
              decoration: InputDecoration(hintText: '0.00', hintStyle: GoogleFonts.robotoMono(fontSize: 14, color: Colors.white24), border: InputBorder.none, isDense: true),
              onChanged: (_) { setSheetState(() {}); innerState(() {}); },
            )),
            Text(_selectedCoin, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w900, color: const Color(0xFF9CA3AF))),
            const SizedBox(width: 8),
            GestureDetector(onTap: () { setSheetState(() { amountController.text = coinBal.toStringAsFixed(8); }); innerState(() {}); }, child: Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: const Color(0xFF2563EB).withOpacity(0.1), borderRadius: BorderRadius.circular(8)), child: Text('MAX', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w900, color: const Color(0xFF60A5FA))))),
          ]),
        ),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.1))),
          child: Column(children: [
            _buildInfoRow('Fee (${TradeFeeService.sendFeePercent}%)', '$feeCoin $_selectedCoin'),
            const SizedBox(height: 8),
            _buildInfoRow('Total Deducted', '$totalDeduct $_selectedCoin', valueColor: const Color(0xFFF59E0B)),
          ]),
        ),
        const SizedBox(height: 20),
        _buildActionButton('Send $_selectedCoin', const Color(0xFFF59E0B), canSend, isProcessing, () async {
          if (!canSend) return;
          setSheetState(() => isProcessing = true);
          try {
            final uid = context.read<AuthProvider>().firebaseUser!.uid;
            await FirestoreService().requestSend(uid: uid, coinSymbol: _selectedCoin, coinAmount: sendAmount, recipientAddress: addressController.text.trim());
            if (mounted) { Navigator.pop(context); _showSnackBar('Send request submitted. Processing...'); }
          } catch (e) {
            setSheetState(() => isProcessing = false);
            if (mounted) _showSnackBar(e.toString().replaceFirst('Exception: ', ''), isError: true);
          }
        }),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final wallet = context.watch<WalletProvider>();
    final md = _getMd(_selectedCoin);
    final coinBal = wallet.cryptoBalances[_selectedCoin] ?? 0;
    final ngnBal = wallet.nairaBalance;
    final priceNaira = md?.priceNaira ?? 0;
    final change24h = md?.change24h ?? 0;
    final isUp = change24h >= 0;

    return Scaffold(
      backgroundColor: const Color(0xFF000000),
      body: Stack(
        fit: StackFit.expand,
        children: [
          const AppBackground(child: SizedBox.expand()),
          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 24),
                    children: [
                      _buildBalanceCard(coinBal, ngnBal, priceNaira),
                      _buildCryptoAssetsSection(),
                      _buildActivities(),
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

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          GestureDetector(
            onTap: () => Navigator.pop(context),
            child: Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white.withOpacity(0.08))), child: const Center(child: Icon(Icons.chevron_left_rounded, color: Colors.white, size: 18))),
          ),
          Text('Trade', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
          const NotificationIcon(),
        ],
      ),
    );
  }

  Widget _buildCoinSelectorCard(double priceNaira, bool isUp, double change24h) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: GestureDetector(
        onTap: () => _showCoinPicker((c) => setState(() => _selectedCoin = c)),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.03), borderRadius: BorderRadius.circular(24), border: Border.all(color: Colors.white.withOpacity(0.08))),
          child: Row(children: [
            Container(width: 36, height: 36, decoration: BoxDecoration(shape: BoxShape.circle, color: _getColor(_selectedCoin).withOpacity(0.15), border: Border.all(color: _getColor(_selectedCoin).withOpacity(0.2))), child: Center(child: FaIcon(_getIcon(_selectedCoin), size: 14, color: _getColor(_selectedCoin)))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(_selectedCoin, style: GoogleFonts.plusJakartaSans(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white)),
              Text('\u20A6${_fmtNaira(priceNaira)}', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: isUp ? const Color(0xFF34D399).withOpacity(0.1) : const Color(0xFFEF4444).withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: (isUp ? const Color(0xFF34D399) : const Color(0xFFEF4444)).withOpacity(0.2))),
              child: Row(children: [Icon(isUp ? Icons.trending_up_rounded : Icons.trending_down_rounded, size: 11, color: isUp ? const Color(0xFF34D399) : const Color(0xFFEF4444)), const SizedBox(width: 4), Text('${isUp ? '+' : ''}${change24h.toStringAsFixed(2)}%', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w900, color: isUp ? const Color(0xFF34D399) : const Color(0xFFEF4444)))]),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.keyboard_arrow_down_rounded, size: 16, color: Color(0xFF9CA3AF)),
          ]),
        ),
      ),
    );
  }

  Widget _buildBalanceCard(double coinBal, double ngnBal, double priceNaira) {
    final valueNaira = coinBal * priceNaira;
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: AnimatedBuilder(
        animation: _rainbowController,
        builder: (context, child) {
          return CustomPaint(
            foregroundPainter: _RainbowBorderPainter(
              progress: _rainbowController.value,
              radius: 24,
              strokeWidth: 1.5,
            ),
            child: child,
          );
        },
        child: Container(
          decoration: BoxDecoration(
            color: const Color(0xFF0A192F),
            borderRadius: BorderRadius.circular(24),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(24),
            child: Stack(
              children: [
                Positioned.fill(
                  child: CustomPaint(
                    painter: _WalletMeshPainter(meshColor: Colors.white.withOpacity(0.06)),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('YOUR BALANCE', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF9CA3AF), letterSpacing: 1.5)),
                      Text('NGN Wallet: \u20A6${_fmtNaira(ngnBal)}', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
                    ]),
                    const SizedBox(height: 8),
                    Row(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.baseline, textBaseline: TextBaseline.alphabetic, children: [
                      Text('\u20A6${_fmtNaira(valueNaira)}', style: GoogleFonts.plusJakartaSans(fontSize: 34, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -1)),
                    ]),
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(6)),
                      child: Row(mainAxisSize: MainAxisSize.min, children: [
                        FaIcon(_getIcon(_selectedCoin), size: 10, color: _getColor(_selectedCoin)),
                        const SizedBox(width: 4),
                        Text('${coinBal.toStringAsFixed(8)} $_selectedCoin', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFFD1D5DB))),
                      ]),
                    ),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildActivities() {
    final txProvider = context.watch<TransactionProvider>();
    final recent = txProvider.recentTransactions;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Recent Activities', style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
              Text('View all', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
            ],
          ),
          const SizedBox(height: 6),
          if (recent.isEmpty)
            _glassCard(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 24),
                child: Center(child: Text('No transactions yet', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)))),
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
                  return Column(children: [
                    if (index > 0) const Divider(color: Color(0x0DFFFFFF), height: 16),
                    _activityItem(icon: iconData, iconBg: color.withOpacity(0.15), iconColor: color, title: tx.type.label, time: time, amount: amount, amountColor: color),
                  ]);
                }),
              ),
            ),
        ],
      ),
    );
  }

  Widget _activityItem({required IconData icon, required Color iconBg, required Color iconColor, required String title, required String time, required String amount, required Color amountColor}) {
    return Row(children: [
      Container(width: 28, height: 28, decoration: BoxDecoration(shape: BoxShape.circle, color: iconBg), child: Icon(icon, size: 9, color: iconColor)),
      const SizedBox(width: 8),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w800, color: Colors.white)),
        Text(time, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
      ])),
      Text(amount, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: amountColor)),
    ]);
  }

  Widget _buildCryptoAssetsSection() {
    final wallet = context.watch<WalletProvider>();
    final cryptoBalances = wallet.cryptoBalances;
    final visibleCoins = wallet.visibleCoins;
    final coinsToShow = visibleCoins.isEmpty ? _coinMeta.keys.toList() : visibleCoins;
    final mdMap = {for (final c in _marketDataList) c.symbol.toUpperCase(): c};

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('Crypto Assets', style: GoogleFonts.plusJakartaSans(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.white)),
          GestureDetector(onTap: () => _showManageAssetsModal(context), child: Text('Manage', style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)))),
        ]),
        const SizedBox(height: 6),
        if (coinsToShow.isEmpty)
          _glassCard(child: Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: Center(child: Text('No crypto assets visible', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))))))
        else
          _glassCard(child: Column(children: List.generate(coinsToShow.length, (index) {
            final ticker = coinsToShow[index];
            final balance = cryptoBalances[ticker] ?? 0;
            final meta = _coinMeta[ticker] ?? {'name': ticker, 'icon': Icons.token_rounded, 'color': const Color(0xFF9CA3AF)};
            final isLast = index == coinsToShow.length - 1;
            final md = mdMap[ticker.toUpperCase()];
            final nairaValue = md != null ? balance * md.priceNaira : 0.0;
            final valueStr = md != null ? '\u20A6${_formatNairaValue(nairaValue)}' : '${balance.toStringAsFixed(4)} $ticker';
            final priceStr = md != null ? '\u20A6${_formatNairaValue(md.priceNaira)}' : '';
            final changeStr = md != null ? '${md.change24h >= 0 ? '+' : ''}${md.change24h.toStringAsFixed(2)}%' : '';
            final changeColor = md != null ? (md.isUp ? const Color(0xFF34D399) : const Color(0xFFEF4444)) : Colors.transparent;
            final chartColor = md != null ? (md.isUp ? const Color(0xFF10B981) : const Color(0xFFEF4444)) : const Color(0xFF10B981);
            final chartPoints = md != null && md.sparkline.length > 1 ? _normalizeSparkline(md.sparkline) : const [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
            return Column(children: [
              _portfolioItem(name: meta['name'] as String, ticker: ticker, value: valueStr, price: priceStr, change: changeStr, changeColor: changeColor, iconColor: meta['color'] as Color, iconBg: (meta['color'] as Color).withOpacity(0.2), chartColor: chartColor, chartPoints: chartPoints, iconData: meta['icon'] as IconData?, onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => CoinPreviewScreen(coinName: meta['name'] as String, coinSymbol: ticker, coinIcon: meta['icon'] as IconData? ?? Icons.token_rounded, coinColor: meta['color'] as Color, balanceNaira: md != null ? _formatNairaValue(nairaValue) : '0', balanceCoin: '${balance.toStringAsFixed(6)} $ticker', livePrice: md != null ? _formatNairaValue(md.priceNaira) : '0', priceChange: md != null ? '${md.change24h.toStringAsFixed(2)}%' : '0%', isUp: md?.isUp ?? true, currencyCode: {'BTC': 'btc', 'ETH': 'eth', 'USDT': 'usdttrc20', 'TRX': 'trx'}[ticker] ?? ticker.toLowerCase())))),
              if (!isLast) const Divider(color: Color(0x0DFFFFFF), height: 16),
            ]);
          }))),
      ]),
    );
  }

  Widget _glassCard({required Widget child}) {
    return Container(
      decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.08)), boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.2), blurRadius: 32, offset: const Offset(0, 8))]),
      child: ClipRRect(borderRadius: BorderRadius.circular(16), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16), child: Padding(padding: const EdgeInsets.all(12), child: child))),
    );
  }

  Widget _portfolioItem({required String name, required String ticker, required String value, required String price, required String change, required Color changeColor, required Color iconColor, required Color iconBg, required Color chartColor, required List<double> chartPoints, IconData? iconData, VoidCallback? onTap}) {
    return GestureDetector(onTap: onTap, behavior: HitTestBehavior.opaque, child: Row(children: [
      Expanded(flex: 35, child: Row(children: [
        Container(width: 36, height: 36, decoration: BoxDecoration(shape: BoxShape.circle, color: iconBg), child: Center(child: iconData != null ? FaIcon(iconData, size: 16, color: iconColor) : Text(ticker[0], style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: iconColor)))),
        const SizedBox(width: 8),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(name, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.white)),
          Text(ticker, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
        ]),
      ])),
      Expanded(flex: 20, child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        SizedBox(height: 28, child: CustomPaint(size: const Size(70, 28), painter: _MiniChartPainter(upColor: const Color(0xFF10B981), downColor: const Color(0xFFEF4444), points: chartPoints))),
        if (change.isNotEmpty) Text(change, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 12, fontWeight: FontWeight.w800, color: changeColor)),
      ])),
      Expanded(flex: 35, child: Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.white)),
        if (price.isNotEmpty) Text(price, maxLines: 1, overflow: TextOverflow.ellipsis, style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF))),
      ])),
    ]));
  }

  void _showManageAssetsModal(BuildContext context) {
    final walletProvider = context.read<WalletProvider>();
    final currentVisible = walletProvider.visibleCoins.isEmpty ? _coinMeta.keys.toList() : List<String>.from(walletProvider.visibleCoins);

    showModalBottomSheet(context: context, isScrollControlled: true, backgroundColor: Colors.transparent, builder: (sheetContext) {
      return StatefulBuilder(builder: (context, setSheetState) {
        return ClipRRect(borderRadius: const BorderRadius.vertical(top: Radius.circular(32)), child: BackdropFilter(filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20), child: Container(height: MediaQuery.of(context).size.height * 0.7, decoration: BoxDecoration(color: const Color(0xFF0A0F1F).withOpacity(0.95), borderRadius: const BorderRadius.vertical(top: Radius.circular(32)), border: Border(top: BorderSide(color: Colors.white.withOpacity(0.1)))), child: Padding(padding: const EdgeInsets.fromLTRB(24, 24, 24, 24), child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Manage Assets', style: GoogleFonts.plusJakartaSans(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
              const SizedBox(height: 2),
              Text('Select coins to show', style: GoogleFonts.plusJakartaSans(fontSize: 11, fontWeight: FontWeight.w800, color: Colors.grey.shade400)),
            ]),
            GestureDetector(onTap: () => Navigator.pop(context), child: Container(width: 32, height: 32, decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), shape: BoxShape.circle), child: const Icon(Icons.close_rounded, color: Colors.grey, size: 16))),
          ]),
          const SizedBox(height: 24),
          Expanded(child: ListView(children: _coinMeta.entries.map((entry) {
            final ticker = entry.key;
            final meta = entry.value;
            final isToggled = currentVisible.contains(ticker);
            return Padding(padding: const EdgeInsets.only(bottom: 8), child: _manageItem('${meta['name']} ($ticker)', meta['icon'] as IconData, meta['color'] as Color, isToggled, (val) { setSheetState(() { if (val) { if (!currentVisible.contains(ticker)) currentVisible.add(ticker); } else { currentVisible.remove(ticker); } }); }));
          }).toList())),
          const SizedBox(height: 16),
          GestureDetector(onTap: () async { await walletProvider.saveVisibleCoins(currentVisible); if (context.mounted) Navigator.pop(context); }, child: Container(width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 16), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)), child: Center(child: Text('Save Changes', style: GoogleFonts.plusJakartaSans(fontSize: 13, fontWeight: FontWeight.w900, color: Colors.black))))),
        ])))));
      });
    });
  }

  Widget _manageItem(String name, IconData icon, Color color, bool isToggled, ValueChanged<bool> onChanged) {
    return Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.white.withOpacity(0.05))), child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Row(children: [
        Container(width: 32, height: 32, decoration: BoxDecoration(shape: BoxShape.circle, color: color.withOpacity(0.1), border: Border.all(color: color.withOpacity(0.2))), child: Center(child: Icon(icon, size: 14, color: color))),
        const SizedBox(width: 12),
        Text(name, style: GoogleFonts.plusJakartaSans(fontSize: 14, fontWeight: FontWeight.w800, color: Colors.white)),
      ]),
      CupertinoSwitch(value: isToggled, onChanged: onChanged, activeColor: Colors.blue.shade600, trackColor: Colors.grey.shade800),
    ]));
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
      final paint = Paint()..color = isUp ? upColor : downColor..strokeWidth = 1.5..style = PaintingStyle.stroke..strokeCap = StrokeCap.round;
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

class _RainbowBorderPainter extends CustomPainter {
  final double progress;
  final double radius;
  final double strokeWidth;

  _RainbowBorderPainter({
    required this.progress,
    required this.radius,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    const colors = [
      Color(0xFFFF0000),
      Color(0xFFFF7F00),
      Color(0xFFFFFF00),
      Color(0xFF00FF00),
      Color(0xFF0000FF),
      Color(0xFF4B0082),
      Color(0xFF9400D3),
      Color(0xFFFF0000),
    ];

    final rect = Offset.zero & size;
    final rrect = RRect.fromRectAndRadius(
      rect.deflate(strokeWidth / 2),
      Radius.circular(radius),
    );

    final sweepGradient = SweepGradient(
      startAngle: progress * 2 * pi,
      colors: colors,
    );

    final paint = Paint()
      ..shader = sweepGradient.createShader(rect)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawRRect(rrect, paint);
  }

  @override
  bool shouldRepaint(covariant _RainbowBorderPainter oldDelegate) =>
      oldDelegate.progress != progress;
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

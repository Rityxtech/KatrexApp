import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:cloud_firestore/cloud_firestore.dart';

/// Real-time network fee and minimum deposit info for a cryptocurrency.
class NetworkFeeInfo {
  final String currencyCode;
  final double networkFeeUsd;
  final double networkFeeCoin;
  final String feeCoinSymbol;
  final double minDepositCoin;
  final double minDepositUsd;
  final String minDepositSymbol;
  final String feeLabel;

  NetworkFeeInfo({
    required this.currencyCode,
    required this.networkFeeUsd,
    required this.networkFeeCoin,
    required this.feeCoinSymbol,
    required this.minDepositCoin,
    required this.minDepositUsd,
    required this.minDepositSymbol,
    required this.feeLabel,
  });
}

/// Fetches real-time network fees from blockchain APIs and calculates
/// practical minimum deposits based on current sweep/withdrawal costs.
///
/// APIs used (all free, no API key required):
/// - BTC: https://mempool.space/api/v1/fees/recommended
/// - ETH: https://eth.llamarpc.com (public RPC, eth_gasPrice)
/// - BSC: https://bsc-dataseed.binance.org/ (public RPC, eth_gasPrice)
/// - TRX: https://api.trongrid.io (public, no key needed for fees)
class NetworkFeeService {
  NetworkFeeService._();

  static final _db = FirebaseFirestore.instance;

  /// Fetch real-time network fee info for a currency code.
  /// [currencyCode] must be one of: btc, eth, trx, usdttrc20, usdt, usdtbsc
  static Future<NetworkFeeInfo> getFeeInfo(String currencyCode) async {
    try {
      switch (currencyCode) {
        case 'btc':
          return await _getBtcFeeInfo();
        case 'eth':
          return await _getEthFeeInfo();
        case 'trx':
          return await _getTrxFeeInfo();
        case 'usdttrc20':
          return await _getUsdtTrc20FeeInfo();
        case 'usdt':
          return await _getUsdtErc20FeeInfo();
        case 'usdtbsc':
          return await _getUsdtBscFeeInfo();
        default:
          return _fallbackFeeInfo(currencyCode);
      }
    } catch (_) {
      return _fallbackFeeInfo(currencyCode);
    }
  }

  // ─── BTC ───────────────────────────────────────────────────────────
  static Future<NetworkFeeInfo> _getBtcFeeInfo() async {
    final res = await http.get(Uri.parse('https://mempool.space/api/v1/fees/recommended'));
    final data = jsonDecode(res.body);
    final satPerVByte = (data['halfHourFee'] as num).toDouble();

    // Typical withdrawal tx ~250 vBytes
    final withdrawFeeSats = satPerVByte * 250;
    final withdrawFeeBtc = withdrawFeeSats / 1e8;
    final btcPrice = await _getCoinPrice('btc');
    final withdrawFeeUsd = withdrawFeeBtc * btcPrice;

    // Minimum deposit = 3x withdrawal fee (ensures we can sweep profitably)
    final minDepositBtc = withdrawFeeBtc * 3;
    final minDepositUsd = minDepositBtc * btcPrice;

    return NetworkFeeInfo(
      currencyCode: 'btc',
      networkFeeUsd: withdrawFeeUsd,
      networkFeeCoin: withdrawFeeBtc,
      feeCoinSymbol: 'BTC',
      minDepositCoin: minDepositBtc,
      minDepositUsd: minDepositUsd,
      minDepositSymbol: 'BTC',
      feeLabel: '~${satPerVByte.round()} sat/vB',
    );
  }

  // ─── ETH ───────────────────────────────────────────────────────────
  static Future<NetworkFeeInfo> _getEthFeeInfo() async {
    final gasPriceWei = await _getEthGasPrice('https://eth.llamarpc.com');
    // Typical ETH transfer ~21000 gas
    final withdrawFeeWei = gasPriceWei * 21000;
    final withdrawFeeEth = withdrawFeeWei / 1e18;
    final ethPrice = await _getCoinPrice('eth');
    final withdrawFeeUsd = withdrawFeeEth * ethPrice;

    final minDepositEth = withdrawFeeEth * 3;
    final minDepositUsd = minDepositEth * ethPrice;

    final gwei = gasPriceWei / 1e9;

    return NetworkFeeInfo(
      currencyCode: 'eth',
      networkFeeUsd: withdrawFeeUsd,
      networkFeeCoin: withdrawFeeEth,
      feeCoinSymbol: 'ETH',
      minDepositCoin: minDepositEth,
      minDepositUsd: minDepositUsd,
      minDepositSymbol: 'ETH',
      feeLabel: '~${gwei.round()} gwei',
    );
  }

  // ─── TRX ───────────────────────────────────────────────────────────
  static Future<NetworkFeeInfo> _getTrxFeeInfo() async {
    // TRX transfers cost 1 TRX (burned for bandwidth/energy)
    const withdrawFeeTrx = 1.0;
    final trxPrice = await _getCoinPrice('trx');
    final withdrawFeeUsd = withdrawFeeTrx * trxPrice;

    // Minimum deposit = 10 TRX (covers multiple withdrawals)
    const minDepositTrx = 10.0;
    final minDepositUsd = minDepositTrx * trxPrice;

    return NetworkFeeInfo(
      currencyCode: 'trx',
      networkFeeUsd: withdrawFeeUsd,
      networkFeeCoin: withdrawFeeTrx,
      feeCoinSymbol: 'TRX',
      minDepositCoin: minDepositTrx,
      minDepositUsd: minDepositUsd,
      minDepositSymbol: 'TRX',
      feeLabel: '~1 TRX/tx',
    );
  }

  // ─── USDT TRC20 ────────────────────────────────────────────────────
  static Future<NetworkFeeInfo> _getUsdtTrc20FeeInfo() async {
    // USDT TRC20 transfer costs ~1 TRX in energy (~$0.15)
    final trxPrice = await _getCoinPrice('trx');
    final withdrawFeeUsd = 1.0 * trxPrice;

    // Minimum deposit = $1 (very cheap network)
    const minDepositUsd = 1.0;
    final minDepositCoin = minDepositUsd; // USDT is ~$1

    return NetworkFeeInfo(
      currencyCode: 'usdttrc20',
      networkFeeUsd: withdrawFeeUsd,
      networkFeeCoin: withdrawFeeUsd,
      feeCoinSymbol: 'USDT',
      minDepositCoin: minDepositCoin,
      minDepositUsd: minDepositUsd,
      minDepositSymbol: 'USDT',
      feeLabel: '~1 TRX/tx',
    );
  }

  // ─── USDT ERC20 ────────────────────────────────────────────────────
  static Future<NetworkFeeInfo> _getUsdtErc20FeeInfo() async {
    final gasPriceWei = await _getEthGasPrice('https://eth.llamarpc.com');
    // ERC20 transfer ~65000 gas
    final withdrawFeeWei = gasPriceWei * 65000;
    final withdrawFeeEth = withdrawFeeWei / 1e18;
    final ethPrice = await _getCoinPrice('eth');
    final withdrawFeeUsd = withdrawFeeEth * ethPrice;

    // Minimum deposit = 2x withdrawal fee in USD
    final minDepositUsd = withdrawFeeUsd * 2;
    final minDepositCoin = minDepositUsd; // USDT ~$1

    final gwei = gasPriceWei / 1e9;

    return NetworkFeeInfo(
      currencyCode: 'usdt',
      networkFeeUsd: withdrawFeeUsd,
      networkFeeCoin: withdrawFeeUsd,
      feeCoinSymbol: 'USDT',
      minDepositCoin: minDepositCoin,
      minDepositUsd: minDepositUsd,
      minDepositSymbol: 'USDT',
      feeLabel: '~${gwei.round()} gwei',
    );
  }

  // ─── USDT BEP20 ────────────────────────────────────────────────────
  static Future<NetworkFeeInfo> _getUsdtBscFeeInfo() async {
    final gasPriceWei = await _getEthGasPrice('https://bsc-dataseed.binance.org/');
    // BEP20 transfer ~65000 gas, BSC gas is cheap (~3-5 gwei)
    final withdrawFeeWei = gasPriceWei * 65000;
    final withdrawFeeBnb = withdrawFeeWei / 1e18;
    final bnbPrice = await _getCoinPrice('bnb');
    final withdrawFeeUsd = withdrawFeeBnb * bnbPrice;

    // Minimum deposit = $2 (very cheap network)
    const minDepositUsd = 2.0;
    final minDepositCoin = minDepositUsd;

    final gwei = gasPriceWei / 1e9;

    return NetworkFeeInfo(
      currencyCode: 'usdtbsc',
      networkFeeUsd: withdrawFeeUsd,
      networkFeeCoin: withdrawFeeUsd,
      feeCoinSymbol: 'USDT',
      minDepositCoin: minDepositCoin,
      minDepositUsd: minDepositUsd,
      minDepositSymbol: 'USDT',
      feeLabel: '~${gwei.round()} gwei',
    );
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  static Future<double> _getEthGasPrice(String rpcUrl) async {
    final res = await http.post(
      Uri.parse(rpcUrl),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'jsonrpc': '2.0',
        'id': 1,
        'method': 'eth_gasPrice',
        'params': [],
      }),
    );
    final data = jsonDecode(res.body);
    final hexGas = data['result'] as String;
    return int.parse(hexGas, radix: 16).toDouble();
  }

  static Future<double> _getCoinPrice(String symbol) async {
    try {
      final snap = await _db.collection('market_data').doc(symbol.toLowerCase()).get();
      if (snap.exists) {
        return (snap.data()!['priceUsd'] as num?)?.toDouble() ?? 0;
      }
    } catch (_) {}
    // Fallback approximate prices
    switch (symbol.toLowerCase()) {
      case 'btc':
        return 95000;
      case 'eth':
        return 3200;
      case 'trx':
        return 0.15;
      case 'bnb':
        return 600;
      default:
        return 1.0;
    }
  }

  static NetworkFeeInfo _fallbackFeeInfo(String currencyCode) {
    switch (currencyCode) {
      case 'btc':
        return NetworkFeeInfo(
          currencyCode: 'btc',
          networkFeeUsd: 3.0,
          networkFeeCoin: 0.00003,
          feeCoinSymbol: 'BTC',
          minDepositCoin: 0.0001,
          minDepositUsd: 10,
          minDepositSymbol: 'BTC',
          feeLabel: '~50 sat/vB',
        );
      case 'eth':
        return NetworkFeeInfo(
          currencyCode: 'eth',
          networkFeeUsd: 2.0,
          networkFeeCoin: 0.0006,
          feeCoinSymbol: 'ETH',
          minDepositCoin: 0.002,
          minDepositUsd: 6,
          minDepositSymbol: 'ETH',
          feeLabel: '~25 gwei',
        );
      case 'trx':
        return NetworkFeeInfo(
          currencyCode: 'trx',
          networkFeeUsd: 0.15,
          networkFeeCoin: 1.0,
          feeCoinSymbol: 'TRX',
          minDepositCoin: 10,
          minDepositUsd: 1.5,
          minDepositSymbol: 'TRX',
          feeLabel: '~1 TRX/tx',
        );
      case 'usdttrc20':
        return NetworkFeeInfo(
          currencyCode: 'usdttrc20',
          networkFeeUsd: 0.15,
          networkFeeCoin: 0.15,
          feeCoinSymbol: 'USDT',
          minDepositCoin: 1,
          minDepositUsd: 1,
          minDepositSymbol: 'USDT',
          feeLabel: '~1 TRX/tx',
        );
      case 'usdt':
        return NetworkFeeInfo(
          currencyCode: 'usdt',
          networkFeeUsd: 5.0,
          networkFeeCoin: 5.0,
          feeCoinSymbol: 'USDT',
          minDepositCoin: 10,
          minDepositUsd: 10,
          minDepositSymbol: 'USDT',
          feeLabel: '~25 gwei',
        );
      case 'usdtbsc':
        return NetworkFeeInfo(
          currencyCode: 'usdtbsc',
          networkFeeUsd: 0.05,
          networkFeeCoin: 0.05,
          feeCoinSymbol: 'USDT',
          minDepositCoin: 2,
          minDepositUsd: 2,
          minDepositSymbol: 'USDT',
          feeLabel: '~3 gwei',
        );
      default:
        return NetworkFeeInfo(
          currencyCode: currencyCode,
          networkFeeUsd: 1.0,
          networkFeeCoin: 1.0,
          feeCoinSymbol: '',
          minDepositCoin: 5.0,
          minDepositUsd: 5.0,
          minDepositSymbol: '',
          feeLabel: '',
        );
    }
  }
}

import 'package:flutter/material.dart';

/// Shared coin metadata with official logo icons from CoinGecko/CryptoLogos.
/// Used across dashboard, trade, deposit, and live rates screens for consistency.
class CoinMeta {
  CoinMeta._();

  /// Full coin list ordered by global market-cap popularity rank.
  /// This order is used everywhere: Trade page shows all, Home shows top 6.
  static const Map<String, Map<String, dynamic>> coins = {
    'BTC':  {'name': 'Bitcoin',   'iconUrl': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',       'color': Color(0xFFF7931A)},
    'ETH':  {'name': 'Ethereum',  'iconUrl': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',    'color': Color(0xFF627EEA)},
    'USDT': {'name': 'Tether',    'iconUrl': 'https://assets.coingecko.com/coins/images/325/large/Tether.png',      'color': Color(0xFF26A17B)},
    'BNB':  {'name': 'BNB',       'iconUrl': 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png','color': Color(0xFFF3BA2F)},
    'SOL':  {'name': 'Solana',    'iconUrl': 'https://assets.coingecko.com/coins/images/4128/large/solana.png',     'color': Color(0xFF14F195)},
    'XRP':  {'name': 'Ripple',    'iconUrl': 'https://cryptologos.cc/logos/xrp-xrp-logo.png',                      'color': Color(0xFF346AA9)},
    'DOGE': {'name': 'Dogecoin',  'iconUrl': 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',      'color': Color(0xFFC2A633)},
    'ADA':  {'name': 'Cardano',   'iconUrl': 'https://assets.coingecko.com/coins/images/975/large/cardano.png',     'color': Color(0xFF0033AD)},
    'TRX':  {'name': 'TRON',      'iconUrl': 'https://assets.coingecko.com/coins/images/1094/large/tron-logo.png',  'color': Color(0xFFEF0027)},
    'TON':  {'name': 'Toncoin',   'iconUrl': 'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png','color': Color(0xFF0098EA)},
    'MATIC':{'name': 'Polygon',   'iconUrl': 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',    'color': Color(0xFF8247E5)},
  };

  /// Top 6 coins shown on the Home Portfolio section.
  /// Must be a subset of [coins] keys and in popularity order.
  static const List<String> homePageCoins = ['BTC', 'ETH', 'USDT', 'BNB', 'SOL', 'XRP'];

  /// Maps deposit/trade asset codes (lowercase, e.g. 'usdttrc20') to ticker symbols (e.g. 'USDT').
  static const Map<String, String> codeToTicker = {
    'btc': 'BTC',
    'eth': 'ETH',
    'usdt': 'USDT',
    'usdttrc20': 'USDT',
    'usdtbsc': 'USDT',
    'usdterc20': 'USDT',
    'bnb': 'BNB',
    'sol': 'SOL',
    'xrp': 'XRP',
    'doge': 'DOGE',
    'ada': 'ADA',
    'trx': 'TRX',
    'ton': 'TON',
    'matic': 'MATIC',
  };

  /// Get metadata for a ticker symbol (e.g. 'BTC', 'USDT').
  static Map<String, dynamic> forTicker(String ticker) {
    return coins[ticker.toUpperCase()] ?? {'name': ticker, 'iconUrl': '', 'color': const Color(0xFF9CA3AF)};
  }

  /// Get metadata for a deposit/trade asset code (e.g. 'usdttrc20', 'btc').
  static Map<String, dynamic> forCode(String code) {
    final ticker = codeToTicker[code.toLowerCase()] ?? code.toUpperCase();
    return forTicker(ticker);
  }

  /// Get the ticker symbol for a deposit/trade asset code.
  static String tickerForCode(String code) {
    return codeToTicker[code.toLowerCase()] ?? code.toUpperCase();
  }
}

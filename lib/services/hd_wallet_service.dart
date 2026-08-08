import 'dart:convert';
import 'dart:typed_data';

import 'package:bip32/bip32.dart' as bip32;
import 'package:bip39/bip39.dart' as bip39;
import 'package:bs58check/bs58check.dart' as bs58;
import 'package:crypto/crypto.dart' as crypto;
import 'package:pointycastle/export.dart' as pc;
import 'package:web3dart/web3dart.dart';

/// Enum for supported coin types with their BIP-44 coin types.
enum CoinType {
  btc(0, 'Bitcoin', 'BTC'),
  eth(60, 'Ethereum', 'ETH'),
  tron(195, 'Tron', 'TRX');

  final int coinType;
  final String name;
  final String symbol;
  const CoinType(this.coinType, this.name, this.symbol);
}

/// Maps app currency codes to CoinType + network label.
class CryptoAssetInfo {
  final CoinType coinType;
  final String network;

  const CryptoAssetInfo(this.coinType, this.network);

  static const Map<String, CryptoAssetInfo> _map = {
    'btc': CryptoAssetInfo(CoinType.btc, 'Bitcoin'),
    'eth': CryptoAssetInfo(CoinType.eth, 'ERC20'),
    'usdt': CryptoAssetInfo(CoinType.eth, 'ERC20'),
    'usdtbsc': CryptoAssetInfo(CoinType.eth, 'BEP20'),
    'usdttrc20': CryptoAssetInfo(CoinType.tron, 'TRC20'),
    'trx': CryptoAssetInfo(CoinType.tron, 'TRC20'),
  };

  static CryptoAssetInfo? forCode(String code) => _map[code];
}

/// HD wallet service for custodial deposit address generation.
///
/// The master seed is set once at app startup via [init].
/// Only public addresses are derived client-side.
/// For withdrawals, the backend uses the same seed to derive private keys.
class HdWalletService {
  HdWalletService._();

  static bip32.BIP32? _root;

  /// Initialize with a mnemonic seed phrase.
  /// Call this once at app startup.
  static void init(String mnemonic) {
    final seed = bip39.mnemonicToSeed(mnemonic);
    _root = bip32.BIP32.fromSeed(seed);
  }

  /// Initialize with raw seed bytes.
  static void setSeed(Uint8List seed) {
    _root = bip32.BIP32.fromSeed(seed);
  }

  static bool get isInitialized => _root != null;

  static void _ensureInit() {
    if (_root == null) {
      throw StateError(
        'HdWalletService not initialized. Call HdWalletService.init(mnemonic) first.',
      );
    }
  }

  /// Derives a unique index for a user from their UID.
  static int _userIndex(String uid) {
    final bytes = utf8.encode(uid);
    var hash = 0;
    for (final b in bytes) {
      hash = ((hash << 5) - hash + b) & 0x7FFFFFFF;
    }
    return hash % 1000000;
  }

  /// RIPEMD-160(SHA-256(data)) — Bitcoin standard hash160.
  static Uint8List _hash160(Uint8List data) {
    final sha256Hash = Uint8List.fromList(crypto.sha256.convert(data).bytes);
    final ripemd = pc.RIPEMD160Digest();
    ripemd.reset();
    ripemd.update(sha256Hash, 0, sha256Hash.length);
    final out = Uint8List(20);
    ripemd.doFinal(out, 0);
    return out;
  }

  /// Derive a Bitcoin P2PKH address (starts with '1').
  static String _deriveBtcAddress(int userIndex) {
    final path = "m/44'/0'/0'/0/$userIndex";
    final child = _root!.derivePath(path);
    final pubKey = child.publicKey;

    final hash = _hash160(pubKey);
    final payload = Uint8List(21);
    payload[0] = 0x00; // Mainnet P2PKH version byte
    payload.setRange(1, 21, hash);
    return bs58.base58.encode(payload);
  }

  /// Derive an Ethereum (or BSC) address (starts with '0x').
  static String _deriveEthAddress(int userIndex) {
    final path = "m/44'/60'/0'/0/$userIndex";
    final child = _root!.derivePath(path);
    final privateKey = child.privateKey!;
    final hexKey = privateKey
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join();
    final credentials = EthPrivateKey.fromHex(hexKey);
    return credentials.address.hex;
  }

  /// Derive a Tron address (starts with 'T').
  /// Tron uses secp256k1 like Ethereum but with Tron's Base58Check format.
  static String _deriveTronAddress(int userIndex) {
    final path = "m/44'/195'/0'/0/$userIndex";
    final child = _root!.derivePath(path);
    final privateKey = child.privateKey!;
    final hexKey = privateKey
        .map((b) => b.toRadixString(16).padLeft(2, '0'))
        .join();
    final credentials = EthPrivateKey.fromHex(hexKey);
    final addressBytes = credentials.address.addressBytes;

    // Tron address = Base58Check(0x41 + last 20 bytes of pubKey hash)
    final payload = Uint8List(21);
    payload[0] = 0x41; // Tron mainnet prefix
    payload.setRange(1, 21, addressBytes);
    return bs58.base58.encode(payload);
  }

  /// Derive a deposit address for a given currency code and user UID.
  ///
  /// [currencyCode] is the app code: 'btc', 'eth', 'usdttrc20', etc.
  /// [uid] is the Firebase user UID.
  static String deriveAddress(String currencyCode, String uid) {
    _ensureInit();
    final info = CryptoAssetInfo.forCode(currencyCode);
    if (info == null) {
      throw ArgumentError('Unsupported currency: $currencyCode');
    }
    final userIndex = _userIndex(uid);

    switch (info.coinType) {
      case CoinType.btc:
        return _deriveBtcAddress(userIndex);
      case CoinType.eth:
        return _deriveEthAddress(userIndex);
      case CoinType.tron:
        return _deriveTronAddress(userIndex);
    }
  }

  /// Derive a private key for a given currency code and user UID.
  /// **WARNING**: Only call on the backend for signing withdrawals.
  static String derivePrivateKey(String currencyCode, String uid) {
    _ensureInit();
    final info = CryptoAssetInfo.forCode(currencyCode);
    if (info == null) {
      throw ArgumentError('Unsupported currency: $currencyCode');
    }
    final userIndex = _userIndex(uid);

    switch (info.coinType) {
      case CoinType.btc:
        final path = "m/44'/0'/0'/0/$userIndex";
        final child = _root!.derivePath(path);
        return child.privateKey!
            .map((b) => b.toRadixString(16).padLeft(2, '0'))
            .join();
      case CoinType.eth:
        final path = "m/44'/60'/0'/0/$userIndex";
        final child = _root!.derivePath(path);
        return child.privateKey!
            .map((b) => b.toRadixString(16).padLeft(2, '0'))
            .join();
      case CoinType.tron:
        final path = "m/44'/195'/0'/0/$userIndex";
        final child = _root!.derivePath(path);
        return child.privateKey!
            .map((b) => b.toRadixString(16).padLeft(2, '0'))
            .join();
    }
  }

  /// Generate a new random mnemonic (12 words).
  static String generateMnemonic() {
    return bip39.generateMnemonic(strength: 128);
  }

  /// Validate a mnemonic is correct.
  static bool validateMnemonic(String mnemonic) {
    return bip39.validateMnemonic(mnemonic);
  }
}

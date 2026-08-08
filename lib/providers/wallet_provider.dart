import 'package:flutter/foundation.dart';

import '../models/wallet_model.dart';
import '../services/firestore_service.dart';

/// Streams the user's wallet from Firestore for real-time balance updates.
class WalletProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  WalletModel? _wallet;
  bool _isLoading = false;
  String? _errorMessage;

  WalletModel? get wallet => _wallet;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  double get nairaBalance => _wallet?.nairaBalance ?? 0;
  Map<String, double> get cryptoBalances => _wallet?.cryptoBalances ?? {};
  double get totalValueNaira => _wallet?.totalValueNaira ?? 0;
  List<String> get visibleCoins => _wallet?.visibleCoins ?? [];
  String? get uid => _wallet?.uid;

  Stream<WalletModel>? _walletStream;

  /// Start listening to the wallet document for the given UID.
  void init(String uid) {
    _isLoading = true;
    notifyListeners();

    _walletStream = _firestoreService.watchWallet(uid);

    _walletStream!.listen(
      (wallet) {
        _wallet = wallet;
        _isLoading = false;
        _errorMessage = null;
        notifyListeners();
      },
      onError: (e) {
        _isLoading = false;
        _errorMessage = e.toString();
        debugPrint('WalletProvider error: $e');
        notifyListeners();
      },
    );
  }

  /// Persist visible coin preferences to Firestore.
  Future<void> saveVisibleCoins(List<String> coins) async {
    final currentUid = _wallet?.uid;
    if (currentUid == null) return;
    await _firestoreService.updateVisibleCoins(currentUid, coins);
  }

  /// Stop listening and clear state.
  void dispose_() {
    _wallet = null;
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _wallet = null;
    super.dispose();
  }
}

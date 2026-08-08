import 'package:flutter/foundation.dart';

import '../models/transaction_model.dart';
import '../services/firestore_service.dart';

/// Streams the user's transactions from Firestore for real-time updates.
class TransactionProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  List<TransactionModel> _transactions = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<TransactionModel> get transactions => _transactions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  /// Recent transactions (last 5) for dashboard display.
  List<TransactionModel> get recentTransactions =>
      _transactions.take(5).toList();

  Stream<List<TransactionModel>>? _txStream;

  /// Start listening to the user's transactions.
  void init(String uid) {
    _isLoading = true;
    notifyListeners();

    _txStream = _firestoreService.watchTransactions(uid);

    _txStream!.listen(
      (transactions) {
        _transactions = transactions;
        _isLoading = false;
        _errorMessage = null;
        notifyListeners();
      },
      onError: (e) {
        _isLoading = false;
        _errorMessage = e.toString();
        debugPrint('TransactionProvider error: $e');
        notifyListeners();
      },
    );
  }

  /// Filter transactions by type.
  List<TransactionModel> filterByType(TransactionType type) {
    return _transactions.where((t) => t.type == type).toList();
  }

  /// Filter transactions by status.
  List<TransactionModel> filterByStatus(TransactionStatus status) {
    return _transactions.where((t) => t.status == status).toList();
  }

  void dispose_() {
    _transactions = [];
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _transactions = [];
    super.dispose();
  }
}

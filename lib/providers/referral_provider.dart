import 'dart:async';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/foundation.dart';

import '../services/cloud_functions_service.dart';

/// Real-time referral data for the current user.
///
/// Listens to the `referrals` collection where `referrerUid == uid` and
/// computes:
///   - claimableBalance  (sum of qualified referrals' bonusAmount)
///   - totalEarned       (sum of qualified + claimed)
///   - pendingCount      (referrals awaiting qualification)
///   - qualifiedCount    (referrals ready to claim)
///   - claimedCount      (referrals already claimed)
class ReferralProvider extends ChangeNotifier {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  List<Map<String, dynamic>> _referrals = [];
  bool _isLoading = true;
  String? _errorMessage;
  StreamSubscription<QuerySnapshot>? _subscription;

  // ─── Computed stats ──────────────────────────────────────────
  double _claimableBalance = 0;
  double _totalEarned = 0;
  int _pendingCount = 0;
  int _qualifiedCount = 0;
  int _claimedCount = 0;

  // ─── Getters ─────────────────────────────────────────────────
  List<Map<String, dynamic>> get referrals => _referrals;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  double get claimableBalance => _claimableBalance;
  double get totalEarned => _totalEarned;
  int get pendingCount => _pendingCount;
  int get qualifiedCount => _qualifiedCount;
  int get claimedCount => _claimedCount;
  int get totalReferrals => _referrals.length;

  /// Start listening to the current user's referrals.
  void load(String uid) {
    _subscription?.cancel();
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    _subscription = _db
        .collection('referrals')
        .where('referrerUid', isEqualTo: uid)
        .snapshots()
        .listen(
      (snapshot) {
        _referrals = snapshot.docs
            .map((doc) => {'id': doc.id, ...doc.data()})
            .toList()
          ..sort((a, b) {
            final aCreated = (a['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now();
            final bCreated = (b['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now();
            return bCreated.compareTo(aCreated);
          });
        _computeStats();
        _isLoading = false;
        notifyListeners();
      },
      onError: (e) {
        _errorMessage = e.toString();
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  void _computeStats() {
    _claimableBalance = 0;
    _totalEarned = 0;
    _pendingCount = 0;
    _qualifiedCount = 0;
    _claimedCount = 0;

    for (final r in _referrals) {
      final status = r['status'] as String? ?? 'pending';
      final bonus = (r['bonusAmount'] as num?)?.toDouble() ?? 0;

      switch (status) {
        case 'pending':
          _pendingCount++;
          break;
        case 'qualified':
          _qualifiedCount++;
          _claimableBalance += bonus;
          _totalEarned += bonus;
          break;
        case 'claimed':
          _claimedCount++;
          _totalEarned += bonus;
          break;
      }
    }
  }

  /// Claim all qualified referral rewards.
  /// Returns the amount claimed, or null if failed.
  Future<double?> claimRewards() async {
    if (_claimableBalance <= 0) return null;
    try {
      final result = await CloudFunctionsService.claimReferralRewards();
      if (result['success'] == true) {
        return (result['amountClaimed'] as num?)?.toDouble();
      }
      return null;
    } catch (e) {
      debugPrint('[ReferralProvider] claimRewards error: $e');
      return null;
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

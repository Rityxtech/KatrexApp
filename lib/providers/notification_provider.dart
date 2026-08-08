import 'package:flutter/foundation.dart';

import '../models/notification_model.dart';
import '../services/firestore_service.dart';

/// Streams the user's notifications from Firestore for real-time updates.
class NotificationProvider extends ChangeNotifier {
  final FirestoreService _firestoreService = FirestoreService();

  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  int get unreadCount => _notifications.where((n) => !n.isRead).length;
  bool get isEmpty => _notifications.isEmpty;

  Stream<List<NotificationModel>>? _notifStream;

  /// Start listening to the user's notifications.
  void init(String uid) {
    _isLoading = true;
    notifyListeners();

    _notifStream = _firestoreService.watchNotifications(uid);

    _notifStream!.listen(
      (notifications) {
        _notifications = notifications;
        _isLoading = false;
        _errorMessage = null;
        notifyListeners();
      },
      onError: (e) {
        _isLoading = false;
        _errorMessage = e.toString();
        debugPrint('NotificationProvider error: $e');
        notifyListeners();
      },
    );
  }

  /// Mark a single notification as read.
  Future<void> markAsRead(String notificationId) async {
    await _firestoreService.markNotificationRead(notificationId);
  }

  /// Mark all notifications as read.
  Future<void> markAllAsRead(String uid) async {
    await _firestoreService.markAllNotificationsRead(uid);
  }

  /// Clear all notifications.
  Future<void> clearAll(String uid) async {
    await _firestoreService.clearAllNotifications(uid);
  }

  void dispose_() {
    _notifications = [];
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _notifications = [];
    super.dispose();
  }
}

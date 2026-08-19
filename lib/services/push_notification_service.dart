import 'dart:ui';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../utils/constants.dart';
import '../utils/notification_template.dart';
import '../widgets/in_app_notification_banner.dart';

/// Top-level background message handler for FCM.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  final data = message.data;
  final title = data['title'] ?? 'Katrex';
  final body = data['body'] ?? '';

  if (body.isEmpty) return;

  final flutterLocalNotifications = FlutterLocalNotificationsPlugin();
  const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
  const initSettings = InitializationSettings(android: androidSettings);
  await flutterLocalNotifications.initialize(settings: initSettings);

  await flutterLocalNotifications.show(
    id: message.hashCode,
    title: title,
    body: body,
    notificationDetails: NotificationDetails(
      android: AndroidNotificationDetails(
        'katrex_notifications',
        'Katrex Notifications',
        channelDescription: 'Updates from the Katrex team — campaigns, security alerts, and account activity.',
        importance: Importance.high,
        priority: Priority.high,
        icon: '@mipmap/ic_launcher',
        color: const Color(0xFF2563EB),
        ticker: '$title — Katrex',
        category: AndroidNotificationCategory.message,
        visibility: NotificationVisibility.public,
        styleInformation: BigTextStyleInformation(
          body,
          contentTitle: title,
          summaryText: 'Katrex',
          htmlFormatBigText: false,
          htmlFormatContentTitle: false,
          htmlFormatSummaryText: false,
        ),
      ),
    ),
    payload: data['ctaRoute'] as String?,
  );
}

/// Manages FCM token registration and push notification handling.
///
/// Flow:
///   1. On app launch, request notification permission.
///   2. Get the FCM token and save it to `fcm_tokens/{uid}`.
///   3. Listen for token refresh and update Firestore.
///   4. Listen for incoming push messages and show local notifications.
///   5. When the user toggles push notifications off, delete the token
///      from Firestore so the admin can't reach them.
///
/// All local notifications are rendered through [NotificationTemplate] so the
/// on-device push reads on-brand: brand-coloured small icon, expandable body,
/// and matching channel name.
class PushNotificationService {
  static final PushNotificationService instance = PushNotificationService._();
  PushNotificationService._();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  // Channel identity. Mirrors the channel used by the FCM payload sent from
  // the admin Cloud Function (`admin_functions.handleSendPushNotification`).
  static const _channelId = 'katrex_notifications';
  static const _channelName = 'Katrex Notifications';
  static const _channelDesc =
      'Updates from the Katrex team — campaigns, security alerts, and account activity.';

  // Dedicated status-bar icon for the push notification. Falls back to the
  // app launcher icon if the dedicated asset isn't bundled in this build.
  static const _smallIcon = '@mipmap/ic_launcher';
  static const _smallIconFallback = '@drawable/ic_stat_notification';

  bool _initialized = false;

  /// Initialize the service. Call once on app startup.
  Future<void> init() async {
    if (_initialized) return;
    _initialized = true;

    // Set up local notification channel (Android). The `ticker` and
    // `category` line up with the channel description and Android's
    // notification ranking so time-sensitive Katrex pushes surface cleanly.
    const androidSettings = AndroidInitializationSettings(_smallIcon);
    const initSettings = InitializationSettings(android: androidSettings);
    await _localNotifications.initialize(
      settings: initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create the notification channel for Android 8+ with the brand colour
    // applied at the channel level so every push on this channel inherits it.
    await _localNotifications
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(const AndroidNotificationChannel(
          _channelId,
          _channelName,
          description: _channelDesc,
          importance: Importance.high,
          enableLights: true,
          enableVibration: true,
          showBadge: true,
        ));

    // Request permission (Android 13+)
    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Listen for token refresh
    _messaging.onTokenRefresh.listen(_saveToken);

    // Listen for background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

    // Listen for foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);

    // Listen for background tap
    FirebaseMessaging.onMessageOpenedApp.listen(_handleMessageTap);

    // Check if app was opened from a notification
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleMessageTap(initialMessage);
    }

    // Register token if user is logged in
    if (FirebaseAuth.instance.currentUser != null) {
      await registerToken();
    }
  }

  /// Register the current FCM token to Firestore for the logged-in user.
  Future<void> registerToken() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      final token = await _messaging.getToken();
      if (token == null) return;

      await _saveToken(token);
    } catch (e) {
      debugPrint('[PushNotification] Error registering token: $e');
    }
  }

  Future<void> _saveToken(String token) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      // Fetch the latest user profile to mirror metadata into fcm_tokens.
      // This enables the admin to send targeted notifications based on 
      // country, currency, and KYC tier without reading all user docs.
      final userDoc = await FirebaseFirestore.instance.collection('users').doc(user.uid).get();
      final userData = userDoc.data();

      await FirebaseFirestore.instance
          .collection(FirestoreCollections.fcmTokens)
          .doc(user.uid)
          .set({
        'token': token,
        'uid': user.uid,
        'email': user.email,
        'updatedAt': FieldValue.serverTimestamp(),
        'pushEnabled': true,
        // Mirrored metadata for optimized server-side filtering
        'country': userData?['country'] ?? 'Unknown',
        'currency': userData?['defaultCurrency'] ?? 'NGN',
        'isKycVerified': (userData?['kycTier'] ?? 0) >= 1,
      }, SetOptions(merge: true));
      debugPrint('[PushNotification] Token and metadata saved for user ${user.uid}');
    } catch (e) {
      debugPrint('[PushNotification] Error saving token: $e');
    }
  }

  /// Remove the FCM token from Firestore (when user disables push or logs out).
  Future<void> unregisterToken() async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      await FirebaseFirestore.instance
          .collection(FirestoreCollections.fcmTokens)
          .doc(user.uid)
          .delete();
      debugPrint('[PushNotification] Token removed for user ${user.uid}');
    } catch (e) {
      debugPrint('[PushNotification] Error removing token: $e');
    }
  }

  /// Set pushEnabled flag on the token document without deleting the token.
  /// When pushEnabled is false, the Cloud Function will skip this user.
  Future<void> setPushEnabled(bool enabled) async {
    final user = FirebaseAuth.instance.currentUser;
    if (user == null) return;

    try {
      await FirebaseFirestore.instance
          .collection(FirestoreCollections.fcmTokens)
          .doc(user.uid)
          .set({
        'pushEnabled': enabled,
        'updatedAt': FieldValue.serverTimestamp(),
      }, SetOptions(merge: true));
      debugPrint('[PushNotification] pushEnabled set to $enabled for user ${user.uid}');
    } catch (e) {
      debugPrint('[PushNotification] Error setting pushEnabled: $e');
    }
  }

  void _handleForegroundMessage(RemoteMessage message) {
    final title = message.notification?.title ?? message.data['title'] ?? NotificationTemplate.brandName;
    final body = message.notification?.body ?? message.data['body'] ?? '';

    if (body.isEmpty) return;

    // Run the copy through the Katrex brand template so the title is clamped
    // and the body is consistent across admin pushes, system events, and
    // transaction notifications.
    final payload = NotificationTemplate.build(
      title: title,
      body: body,
      type: _templateTypeFor(message.data),
    );

    // Show the branded in-app banner for foreground messages.
    InAppNotificationBanner.show(
      title: payload.title,
      body: payload.body,
      onTap: () {
        final route = message.data['ctaRoute'] as String?;
        if (route != null) {
          InAppNotificationBanner.navigatorKey?.currentState?.pushNamed(route);
        }
      },
    );

    // Render the OS-level push. `BigTextStyleInformation` lets the user
    // expand the notification to read the full body without opening the app.
    // The brand colour is applied at the channel + per-notification level so
    // the small icon and accent strip match the in-app UI.
    _localNotifications.show(
      id: message.hashCode,
      title: payload.title,
      body: payload.body,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          _channelId,
          _channelName,
          channelDescription: _channelDesc,
          importance: Importance.high,
          priority: Priority.high,
          icon: _smallIcon,
          color: NotificationTemplate.brandColor,
          ticker: '${payload.title} — ${NotificationTemplate.brandName}',
          category: AndroidNotificationCategory.message,
          visibility: NotificationVisibility.public,
          styleInformation: BigTextStyleInformation(
            payload.body,
            contentTitle: payload.title,
            summaryText: NotificationTemplate.brandName,
            htmlFormatBigText: false,
            htmlFormatContentTitle: false,
            htmlFormatSummaryText: false,
          ),
        ),
        iOS: const DarwinNotificationDetails(
          presentAlert: true,
          presentBadge: true,
          presentSound: true,
          interruptionLevel: InterruptionLevel.active,
          threadIdentifier: 'katrex-notifications',
        ),
      ),
      payload: message.data['ctaRoute'] as String?,
    );
  }

  NotificationTemplateType _templateTypeFor(Map<String, dynamic> data) {
    final tag = data['template'] as String?;
    switch (tag) {
      case 'admin_push':
        return NotificationTemplateType.adminPush;
      case 'transaction':
        return NotificationTemplateType.transaction;
      case 'security':
        return NotificationTemplateType.security;
      default:
        return NotificationTemplateType.system;
    }
  }

  void _handleMessageTap(RemoteMessage message) {
    final route = message.data['ctaRoute'] as String?;
    debugPrint('[PushNotification] Message tapped, route: $route');
    // Navigation is handled by the app's router if needed.
    // For now, we just log it. The notification screen will show
    // the notification content.
  }

  void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    debugPrint('[PushNotification] Local notification tapped, payload: $payload');
  }
}

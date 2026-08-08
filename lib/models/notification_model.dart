import 'package:cloud_firestore/cloud_firestore.dart';

enum NotificationType {
  deposit,
  withdrawal,
  login,
  bonus,
  trade,
  security,
  general,
}

extension NotificationTypeX on NotificationType {
  String get value {
    switch (this) {
      case NotificationType.deposit: return 'deposit';
      case NotificationType.withdrawal: return 'withdrawal';
      case NotificationType.login: return 'login';
      case NotificationType.bonus: return 'bonus';
      case NotificationType.trade: return 'trade';
      case NotificationType.security: return 'security';
      case NotificationType.general: return 'general';
    }
  }

  static NotificationType fromString(String? v) {
    return NotificationType.values.firstWhere(
      (e) => e.value == v,
      orElse: () => NotificationType.general,
    );
  }
}

class NotificationModel {
  final String id;
  final String uid;
  final NotificationType type;
  final String title;
  final String body;
  final String? preview;
  final bool isRead;
  final DateTime createdAt;
  final String? ctaLabel;
  final String? ctaRoute;

  NotificationModel({
    required this.id,
    required this.uid,
    required this.type,
    required this.title,
    required this.body,
    this.preview,
    this.isRead = false,
    required this.createdAt,
    this.ctaLabel,
    this.ctaRoute,
  });

  factory NotificationModel.fromMap(Map<String, dynamic> map) {
    return NotificationModel(
      id: map['id'] as String,
      uid: map['uid'] as String,
      type: NotificationTypeX.fromString(map['type'] as String?),
      title: map['title'] as String,
      body: map['body'] as String,
      preview: map['preview'] as String?,
      isRead: map['isRead'] as bool? ?? false,
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      ctaLabel: map['ctaLabel'] as String?,
      ctaRoute: map['ctaRoute'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'uid': uid,
      'type': type.value,
      'title': title,
      'body': body,
      'preview': preview,
      'isRead': isRead,
      'createdAt': Timestamp.fromDate(createdAt),
      'ctaLabel': ctaLabel,
      'ctaRoute': ctaRoute,
    };
  }

  NotificationModel copyWith({bool? isRead}) {
    return NotificationModel(
      id: id,
      uid: uid,
      type: type,
      title: title,
      body: body,
      preview: preview,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
      ctaLabel: ctaLabel,
      ctaRoute: ctaRoute,
    );
  }
}

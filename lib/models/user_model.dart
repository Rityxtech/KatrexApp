import 'package:cloud_firestore/cloud_firestore.dart';

/// Represents a user profile stored in Firestore.
class UserModel {
  final String uid;
  final String fullName;
  final String username;
  final String email;
  final String? phone;
  final String? avatarUrl;

  /// KYC fields for virtual account creation.
  final String? bvn;
  final String? dateOfBirth;
  final String? gender;
  final String? address;

  /// KYC verification tier: 0 = unverified, 1 = basic, 2 = full.
  final int kycTier;
  final bool isEmailVerified;
  final bool isPhoneVerified;

  /// Referral code the user shares with others.
  final String referralCode;

  /// UID of the user who referred this user, if any.
  final String? referredBy;

  /// Default display currency code (e.g. NGN, USD).
  final String defaultCurrency;

  final String? country;

  final String? transactionPin;
  final bool biometricEnabled;

  /// Security settings.
  final bool twoFactorEnabled;
  final bool pinEnabled;

  /// Linked payment methods (bank accounts, cards).
  final List<Map<String, dynamic>> paymentMethods;

  /// Saved card tokens from Squad for repeat charges.
  final List<Map<String, dynamic>> savedCards;

  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isActive;

  UserModel({
    required this.uid,
    required this.fullName,
    required this.username,
    required this.email,
    this.phone,
    this.avatarUrl,
    this.bvn,
    this.dateOfBirth,
    this.gender,
    this.address,
    this.kycTier = 0,
    this.isEmailVerified = false,
    this.isPhoneVerified = false,
    required this.referralCode,
    this.referredBy,
    this.defaultCurrency = 'NGN',
    this.country,
    this.transactionPin,
    this.biometricEnabled = false,
    this.twoFactorEnabled = false,
    this.pinEnabled = false,
    this.paymentMethods = const [],
    this.savedCards = const [],
    required this.createdAt,
    required this.updatedAt,
    this.isActive = true,
  });

  factory UserModel.fromMap(Map<String, dynamic> map) {
    return UserModel(
      uid: map['uid'] as String,
      fullName: map['fullName'] as String,
      username: map['username'] as String,
      email: map['email'] as String,
      phone: map['phone'] as String?,
      avatarUrl: map['avatarUrl'] as String?,
      bvn: map['bvn'] as String?,
      dateOfBirth: map['dateOfBirth'] as String?,
      gender: map['gender'] as String?,
      address: map['address'] as String?,
      kycTier: (map['kycTier'] as num?)?.toInt() ?? 0,
      isEmailVerified: map['isEmailVerified'] as bool? ?? false,
      isPhoneVerified: map['isPhoneVerified'] as bool? ?? false,
      referralCode: map['referralCode'] as String,
      referredBy: map['referredBy'] as String?,
      defaultCurrency: map['defaultCurrency'] as String? ?? 'NGN',
      country: map['country'] as String?,
      transactionPin: map['transactionPin'] as String?,
      biometricEnabled: map['biometricEnabled'] as bool? ?? false,
      twoFactorEnabled: map['twoFactorEnabled'] as bool? ?? false,
      pinEnabled: map['pinEnabled'] as bool? ?? false,
      paymentMethods: (map['paymentMethods'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [],
      savedCards: (map['savedCards'] as List?)?.map((e) => Map<String, dynamic>.from(e as Map)).toList() ?? [],
      createdAt: (map['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (map['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isActive: map['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'uid': uid,
      'fullName': fullName,
      'username': username,
      'email': email,
      'phone': phone,
      'avatarUrl': avatarUrl,
      'bvn': bvn,
      'dateOfBirth': dateOfBirth,
      'gender': gender,
      'address': address,
      'kycTier': kycTier,
      'isEmailVerified': isEmailVerified,
      'isPhoneVerified': isPhoneVerified,
      'referralCode': referralCode,
      'referredBy': referredBy,
      'defaultCurrency': defaultCurrency,
      'country': country,
      'transactionPin': transactionPin,
      'biometricEnabled': biometricEnabled,
      'twoFactorEnabled': twoFactorEnabled,
      'pinEnabled': pinEnabled,
      'paymentMethods': paymentMethods,
      'savedCards': savedCards,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
      'isActive': isActive,
    };
  }

  UserModel copyWith({
    String? fullName,
    String? username,
    String? phone,
    String? avatarUrl,
    String? bvn,
    String? dateOfBirth,
    String? gender,
    String? address,
    int? kycTier,
    bool? isEmailVerified,
    bool? isPhoneVerified,
    String? referredBy,
    String? defaultCurrency,
    String? country,
    String? transactionPin,
    bool? biometricEnabled,
    bool? twoFactorEnabled,
    bool? pinEnabled,
    List<Map<String, dynamic>>? paymentMethods,
    List<Map<String, dynamic>>? savedCards,
    DateTime? updatedAt,
    bool? isActive,
  }) {
    return UserModel(
      uid: uid,
      fullName: fullName ?? this.fullName,
      username: username ?? this.username,
      email: email,
      phone: phone ?? this.phone,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      bvn: bvn ?? this.bvn,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      address: address ?? this.address,
      kycTier: kycTier ?? this.kycTier,
      isEmailVerified: isEmailVerified ?? this.isEmailVerified,
      isPhoneVerified: isPhoneVerified ?? this.isPhoneVerified,
      referralCode: referralCode,
      referredBy: referredBy ?? this.referredBy,
      defaultCurrency: defaultCurrency ?? this.defaultCurrency,
      country: country ?? this.country,
      transactionPin: transactionPin ?? this.transactionPin,
      biometricEnabled: biometricEnabled ?? this.biometricEnabled,
      twoFactorEnabled: twoFactorEnabled ?? this.twoFactorEnabled,
      pinEnabled: pinEnabled ?? this.pinEnabled,
      paymentMethods: paymentMethods ?? this.paymentMethods,
      savedCards: savedCards ?? this.savedCards,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isActive: isActive ?? this.isActive,
    );
  }
}

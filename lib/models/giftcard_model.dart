class GiftcardBrand {
  const GiftcardBrand({
    required this.id,
    required this.name,
    required this.iconName,
    required this.colorHex,
    required this.imageUrl,
    required this.sortOrder,
    required this.featured,
    required this.promoTag,
    required this.promoTitle,
    required this.promoSubtitle,
    required this.promoImageUrl,
  });

  final String id;
  final String name;
  final String iconName;
  final String colorHex;
  final String imageUrl;
  final int sortOrder;
  final bool featured;
  final String? promoTag;
  final String? promoTitle;
  final String? promoSubtitle;
  final String? promoImageUrl;

  factory GiftcardBrand.fromMap(String documentId, Map<String, dynamic> data) {
    String? optionalString(String key) {
      final value = data[key];
      return value is String && value.trim().isNotEmpty ? value.trim() : null;
    }

    return GiftcardBrand(
      id: documentId,
      name: optionalString('name') ?? 'Gift Card',
      iconName: optionalString('iconName') ?? 'card_giftcard',
      colorHex: optionalString('colorHex') ?? '#2563EB',
      imageUrl: optionalString('imageUrl') ?? '',
      sortOrder: (data['sortOrder'] as num?)?.toInt() ?? 0,
      featured: data['featured'] == true,
      promoTag: optionalString('promoTag'),
      promoTitle: optionalString('promoTitle'),
      promoSubtitle: optionalString('promoSubtitle'),
      promoImageUrl: optionalString('promoImageUrl'),
    );
  }

  bool get hasPromo =>
      featured &&
      promoTitle != null &&
      promoSubtitle != null &&
      promoImageUrl != null;
}

class GiftcardPromo {
  const GiftcardPromo({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.tag,
    required this.imageUrl,
    required this.sortOrder,
    required this.isActive,
  });

  final String id;
  final String title;
  final String? subtitle;
  final String? tag;
  final String imageUrl;
  final int sortOrder;
  final bool isActive;

  factory GiftcardPromo.fromMap(String documentId, Map<String, dynamic> data) {
    String? optionalString(String key) {
      final value = data[key];
      return value is String && value.trim().isNotEmpty ? value.trim() : null;
    }
    return GiftcardPromo(
      id: documentId,
      title: optionalString('title') ?? '',
      subtitle: optionalString('subtitle'),
      tag: optionalString('tag'),
      imageUrl: optionalString('imageUrl') ?? '',
      sortOrder: (data['sortOrder'] as num?)?.toInt() ?? 0,
      isActive: data['isActive'] != false,
    );
  }
}

class GiftcardCategory {
  const GiftcardCategory({
    required this.id,
    required this.name,
    required this.type,
    required this.symbol,
    required this.sortOrder,
    required this.isActive,
  });

  final String id;
  final String name;
  final String type; // "currency" or "cardType"
  final String? symbol;
  final int sortOrder;
  final bool isActive;

  factory GiftcardCategory.fromMap(String documentId, Map<String, dynamic> data) {
    String? optionalString(String key) {
      final value = data[key];
      return value is String && value.trim().isNotEmpty ? value.trim() : null;
    }
    return GiftcardCategory(
      id: documentId,
      name: optionalString('name') ?? '',
      type: optionalString('type') ?? 'currency',
      symbol: optionalString('symbol'),
      sortOrder: (data['sortOrder'] as num?)?.toInt() ?? 0,
      isActive: data['isActive'] != false,
    );
  }
}

class GiftcardRate {
  const GiftcardRate({
    required this.id,
    required this.brandId,
    required this.brandName,
    required this.currency,
    required this.cardType,
    required this.minValue,
    required this.maxValue,
    required this.ratePerUnit,
    required this.version,
  });

  final String id;
  final String brandId;
  final String brandName;
  final String currency;
  final String cardType;
  final double minValue;
  final double? maxValue;
  final double ratePerUnit;
  final int version;

  factory GiftcardRate.fromMap(String documentId, Map<String, dynamic> data) {
    return GiftcardRate(
      id: documentId,
      brandId: data['brandId'] as String? ?? '',
      brandName: data['brandName'] as String? ?? '',
      currency: (data['currency'] as String? ?? '').toUpperCase(),
      cardType: (data['cardType'] as String? ?? '').toLowerCase(),
      minValue: (data['minValue'] as num?)?.toDouble() ?? 0,
      maxValue: (data['maxValue'] as num?)?.toDouble(),
      ratePerUnit: (data['ratePerUnit'] as num?)?.toDouble() ?? 0,
      version: (data['version'] as num?)?.toInt() ?? 0,
    );
  }

  bool supportsValue(double value) =>
      value >= minValue && (maxValue == null || value <= maxValue!);
}

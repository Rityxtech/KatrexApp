/// Model representing a promo banner in the Giftcard screen slider.
///
/// These are managed by the admin in the Admin Dashboard Settings page
/// and stored in the `giftcard_promos` Firestore collection.
class GiftcardPromo {
  final String id;
  final String title;
  final String? subtitle;
  final String tag;
  final String imageUrl;
  final int sortOrder;
  final bool isActive;

  const GiftcardPromo({
    required this.id,
    required this.title,
    this.subtitle,
    required this.tag,
    required this.imageUrl,
    required this.sortOrder,
    required this.isActive,
  });

  factory GiftcardPromo.fromMap(String documentId, Map<String, dynamic> data) {
    String? optionalString(String key) {
      final value = data[key];
      return value is String && value.trim().isNotEmpty ? value.trim() : null;
    }

    return GiftcardPromo(
      id: documentId,
      title: optionalString('title') ?? 'Special Offer',
      subtitle: optionalString('subtitle'),
      tag: optionalString('tag') ?? 'PROMO',
      imageUrl: optionalString('imageUrl') ?? '',
      sortOrder: (data['sortOrder'] as num?)?.toInt() ?? 0,
      isActive: data['isActive'] != false,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'subtitle': subtitle,
      'tag': tag,
      'imageUrl': imageUrl,
      'sortOrder': sortOrder,
      'isActive': isActive,
    };
  }
}

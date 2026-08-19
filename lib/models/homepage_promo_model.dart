/// Promo slide model for the homepage carousel.
///
/// These are managed by the admin in the Settings page and stored in the
/// `homepage_promos` Firestore collection. The Flutter dashboard reads them
/// in real time and renders the carousel slider.
class HomepagePromo {
  const HomepagePromo({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.badge,
    required this.buttonText,
    required this.imageUrl,
    required this.sortOrder,
    required this.isActive,
  });

  final String id;
  final String title;
  final String? subtitle;
  final String? badge;
  final String? buttonText;
  final String imageUrl;
  final int sortOrder;
  final bool isActive;

  factory HomepagePromo.fromMap(String documentId, Map<String, dynamic> data) {
    String? optionalString(String key) {
      final value = data[key];
      return value is String && value.trim().isNotEmpty ? value.trim() : null;
    }
    return HomepagePromo(
      id: documentId,
      title: optionalString('title') ?? '',
      subtitle: optionalString('subtitle'),
      badge: optionalString('badge'),
      buttonText: optionalString('buttonText'),
      imageUrl: optionalString('imageUrl') ?? '',
      sortOrder: (data['sortOrder'] as num?)?.toInt() ?? 0,
      isActive: data['isActive'] != false,
    );
  }
}

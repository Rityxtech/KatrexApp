import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Stores recent phone numbers locally using SharedPreferences.
/// Each user gets their own key based on their uid.
/// Numbers are stored as JSON: [{"phone":"0803...","network":0}, ...]
class RecentNumbers {
  static const _maxCount = 3;

  /// Load recent numbers for a user.
  static Future<List<RecentNumber>> load(String uid) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'recent_numbers_$uid';
      final raw = prefs.getString(key);
      if (raw == null || raw.isEmpty) return [];
      final list = jsonDecode(raw) as List;
      return list
          .map((e) => RecentNumber(
                phone: e['phone'] as String,
                networkIndex: e['network'] as int?,
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Save a phone number to the recent list. Moves it to the front if it
  /// already exists. Keeps at most [_maxCount] entries.
  static Future<void> save(String uid, String phone, int? networkIndex) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final key = 'recent_numbers_$uid';
      final existing = await load(uid);

      // Remove if already present (we'll re-add at front)
      existing.removeWhere((e) => e.phone == phone);

      // Add to front
      existing.insert(0, RecentNumber(phone: phone, networkIndex: networkIndex));

      // Trim to max count
      final trimmed = existing.take(_maxCount).toList();

      final json = jsonEncode(trimmed
          .map((e) => {'phone': e.phone, 'network': e.networkIndex})
          .toList());
      await prefs.setString(key, json);
    } catch (_) {}
  }
}

class RecentNumber {
  final String phone;
  final int? networkIndex;
  RecentNumber({required this.phone, this.networkIndex});
}

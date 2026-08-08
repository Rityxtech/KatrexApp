import 'dart:io';

import 'package:firebase_storage/firebase_storage.dart';

import '../utils/constants.dart';

/// Handles file uploads to Firebase Storage (gift card images, KYC docs, avatars).
class StorageService {
  final FirebaseStorage _storage = FirebaseStorage.instance;

  /// Upload a gift card image and return its download URL.
  Future<String> uploadGiftcardImage({
    required String uid,
    required String filePath,
    required String fileName,
  }) async {
    final ref = _storage.ref()
        .child(StoragePaths.giftcardImages)
        .child(uid)
        .child(fileName);
    final task = await ref.putFile(File(filePath));
    return task.ref.getDownloadURL();
  }

  /// Upload a KYC document and return its download URL.
  Future<String> uploadKycDocument({
    required String uid,
    required String filePath,
    required String fileName,
  }) async {
    final ref = _storage.ref()
        .child(StoragePaths.kycDocuments)
        .child(uid)
        .child(fileName);
    final task = await ref.putFile(File(filePath));
    return task.ref.getDownloadURL();
  }

  /// Upload a user avatar and return its download URL.
  Future<String> uploadAvatar({
    required String uid,
    required String filePath,
  }) async {
    final ref = _storage.ref()
        .child(StoragePaths.avatars)
        .child(uid)
        .child('avatar.jpg');
    final task = await ref.putFile(File(filePath));
    return task.ref.getDownloadURL();
  }

  /// Delete a file by its full storage path.
  Future<void> deleteFile(String path) async {
    await _storage.ref(path).delete();
  }
}

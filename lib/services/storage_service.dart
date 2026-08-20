import 'dart:convert';
import 'dart:io';

import 'package:firebase_storage/firebase_storage.dart';

import '../utils/constants.dart';

/// Handles file uploads to Firebase Storage (gift card images, KYC docs, avatars).
/// Supports automatic multi-bucket resolution for projects with either `.firebasestorage.app`
/// or `.appspot.com` bucket configurations.
class StorageService {
  static final List<FirebaseStorage> _storageInstances = [
    FirebaseStorage.instance,
    FirebaseStorage.instanceFor(bucket: 'gs://katrexapp-83cde.appspot.com'),
    FirebaseStorage.instanceFor(bucket: 'gs://katrexapp-83cde.firebasestorage.app'),
    FirebaseStorage.instanceFor(bucket: 'katrexapp-83cde.appspot.com'),
    FirebaseStorage.instanceFor(bucket: 'katrexapp-83cde.firebasestorage.app'),
  ];

  Future<String> _uploadWithFallback({
    required String path,
    required String filePath,
    String contentType = 'image/jpeg',
  }) async {
    final file = File(filePath);
    final metadata = SettableMetadata(contentType: contentType);

    Object? lastError;
    for (final storage in _storageInstances) {
      try {
        final ref = storage.ref().child(path);
        final task = await ref.putFile(file, metadata);
        return await task.ref.getDownloadURL();
      } catch (e) {
        lastError = e;
        final errStr = e.toString().toLowerCase();
        if (errStr.contains('404') ||
            errStr.contains('-13010') ||
            errStr.contains('not found') ||
            errStr.contains('does not exist') ||
            errStr.contains('bucket')) {
          continue;
        }
        rethrow;
      }
    }
    throw lastError ?? Exception('Upload failed. Could not connect to storage bucket.');
  }

  /// Upload a gift card image and return its download URL.
  Future<String> uploadGiftcardImage({
    required String uid,
    required String filePath,
    required String fileName,
  }) async {
    return _uploadWithFallback(
      path: '${StoragePaths.giftcardImages}/$uid/$fileName',
      filePath: filePath,
    );
  }

  /// Upload a KYC document and return its download URL.
  Future<String> uploadKycDocument({
    required String uid,
    required String filePath,
    required String fileName,
  }) async {
    return _uploadWithFallback(
      path: '${StoragePaths.kycDocuments}/$uid/$fileName',
      filePath: filePath,
    );
  }

  /// Upload a user avatar and return its download URL.
  /// Automatically falls back to a base64 Data URI if the Firebase Storage
  /// bucket is not provisioned or returns 404.
  Future<String> uploadAvatar({
    required String uid,
    required String filePath,
  }) async {
    final fileName = 'avatar_${DateTime.now().millisecondsSinceEpoch}.jpg';
    try {
      return await _uploadWithFallback(
        path: '${StoragePaths.avatars}/$uid/$fileName',
        filePath: filePath,
      );
    } catch (_) {
      try {
        final file = File(filePath);
        final bytes = await file.readAsBytes();
        final base64String = base64Encode(bytes);
        return 'data:image/jpeg;base64,$base64String';
      } catch (e) {
        rethrow;
      }
    }
  }

  /// Delete a file by its full storage path.
  Future<void> deleteFile(String path) async {
    for (final storage in _storageInstances) {
      try {
        await storage.ref(path).delete();
        return;
      } catch (_) {}
    }
  }
}

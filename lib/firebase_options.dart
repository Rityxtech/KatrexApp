/*
 * firebase_options.dart — Placeholder
 *
 * After running `flutterfire configure` (from the FlutterFire CLI),
 * this file will be auto-generated with your project's Firebase config.
 *
 * Steps to generate:
 *   1. Install FlutterFire CLI:
 *      dart pub global activate flutterfire_cli
 *   2. Run in project root:
 *      flutterfire configure --project=your-firebase-project-id
 *   3. This will generate the real firebase_options.dart with your
 *      Android, iOS, and Web configurations.
 *
 * Until then, the app uses a fallback DefaultFirebaseOptions in main.dart
 * that you must fill in with your Firebase project credentials.
 */

import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart' show defaultTargetPlatform, kIsWeb, TargetPlatform;

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) return web;
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not configured for this platform. '
          'Run `flutterfire configure` to generate the real options.',
        );
    }
  }

  // ─── REPLACE THESE WITH YOUR FIREBASE PROJECT VALUES ─────────────
  // Get these from: Firebase Console → Project Settings → General → Your apps

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'YOUR_WEB_API_KEY',
    appId: 'YOUR_WEB_APP_ID',
    messagingSenderId: 'YOUR_SENDER_ID',
    projectId: 'YOUR_PROJECT_ID',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    storageBucket: 'YOUR_PROJECT.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyD7P0Y-aoTsVZTdC2qGQnDL7hkiu25jx40',
    appId: '1:925831475855:android:148dca70973afa9ca0f6fa',
    messagingSenderId: '925831475855',
    projectId: 'katrexapp-83cde',
    storageBucket: 'katrexapp-83cde.firebasestorage.app',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyD7P0Y-aoTsVZTdC2qGQnDL7hkiu25jx40',
    appId: '1:925831475855:ios:TODO_REPLACE_WITH_IOS_APP_ID',
    messagingSenderId: '925831475855',
    projectId: 'katrexapp-83cde',
    storageBucket: 'katrexapp-83cde.firebasestorage.app',
    iosBundleId: 'com.rityxtech.katrexapp',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyD7P0Y-aoTsVZTdC2qGQnDL7hkiu25jx40',
    appId: '1:925831475855:ios:TODO_REPLACE_WITH_MACOS_APP_ID',
    messagingSenderId: '925831475855',
    projectId: 'katrexapp-83cde',
    storageBucket: 'katrexapp-83cde.firebasestorage.app',
    iosBundleId: 'com.rityxtech.katrexapp',
  );
}

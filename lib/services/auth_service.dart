import 'dart:math';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:google_sign_in/google_sign_in.dart';

import '../models/user_model.dart';
import '../utils/constants.dart';
import '../utils/error_handler.dart';

/// Handles all Firebase Authentication operations and user profile creation.
class AuthService {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  Stream<User?> get authStateChanges => _auth.authStateChanges();

  /// Sign out the current user from Firebase Auth and Google Sign-In.
  Future<void> signOut() async {
    await _auth.signOut();
    await GoogleSignIn().signOut();
  }

  /// Register a new user with email & password.
  /// Creates a Firestore user profile and generates a 6-digit verification code.
  /// If Firestore writes fail, the Firebase Auth user is deleted to prevent
  /// orphaned accounts that block re-registration.
  /// Returns the UserModel and the verification code (for dev display).
  Future<(UserModel, String)> registerWithEmail({
    required String fullName,
    required String username,
    required String email,
    required String password,
    String? phone,
    String? referredBy,
  }) async {
    final cred = await _auth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final user = cred.user!;
    final now = DateTime.now();
    final referralCode = _generateReferralCode(username);

    final userModel = UserModel(
      uid: user.uid,
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      kycTier: 0,
      isEmailVerified: false,
      isPhoneVerified: false,
      referralCode: referralCode,
      referredBy: referredBy,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    );

    try {
      await _db
          .collection(FirestoreCollections.users)
          .doc(user.uid)
          .set(userModel.toMap());

      // Create an empty wallet document for the new user.
      await _db
          .collection(FirestoreCollections.wallets)
          .doc(user.uid)
          .set({
        'uid': user.uid,
        'nairaBalance': 0,
        'cryptoBalances': <String, double>{},
        'totalValueNaira': 0,
        'createdAt': Timestamp.fromDate(now),
        'updatedAt': Timestamp.fromDate(now),
      });
    } catch (e) {
      // Firestore write failed — delete the auth user so registration can be retried.
      await user.delete();
      rethrow;
    }

    // Generate a 6-digit verification code (stored in Firestore).
    // A Cloud Function triggers on creation to email the code to the user.
    final code = await generateEmailCode(user.uid, email.trim());

    return (userModel, code);
  }

  /// Sign in with email & password.
  Future<UserModel> signInWithEmail({
    required String email,
    required String password,
  }) async {
    final cred = await _auth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final user = cred.user!;
    final userModel = await getUserProfile(user.uid);
    return userModel;
  }

  /// Send a password reset email.
  Future<void> sendPasswordResetEmail(String email) async {
    await _auth.sendPasswordResetEmail(email: email.trim());
  }

  /// Generate a 6-digit email verification code, store it in Firestore
  /// with a 10-minute expiry. A Cloud Function triggers on document creation
  /// to email the code to the user.
  Future<String> generateEmailCode(String uid, String email) async {
    final random = Random();
    final code = (100000 + random.nextInt(900000)).toString();

    await _db.collection('email_codes').doc(uid).set({
      'code': code,
      'email': email,
      'createdAt': Timestamp.fromDate(DateTime.now()),
      'expiresAt': Timestamp.fromDate(DateTime.now().add(const Duration(minutes: 10))),
    });

    return code;
  }

  /// Verify the 6-digit email code. If valid, marks the user's email as
  /// verified in their Firestore profile and deletes the code document.
  /// Returns true on success, false on invalid/expired code.
  Future<bool> verifyEmailCode(String uid, String code) async {
    final docRef = _db.collection('email_codes').doc(uid);
    final doc = await docRef.get();

    if (!doc.exists) {
      throw Exception('No verification code found. Please request a new code.');
    }

    final data = doc.data()!;
    final storedCode = data['code'] as String;
    final expiresAt = (data['expiresAt'] as Timestamp?)?.toDate() ?? DateTime.now();

    if (DateTime.now().isAfter(expiresAt)) {
      await docRef.delete();
      throw Exception('Verification code has expired. Please request a new code.');
    }

    if (storedCode != code) {
      throw Exception('Invalid verification code. Please try again.');
    }

    // Code is valid — mark email as verified in user profile.
    final userDocRef = _db.collection(FirestoreCollections.users).doc(uid);
    final userDoc = await userDocRef.get();
    if (userDoc.exists) {
      final userData = userDoc.data()!;
      userData['isEmailVerified'] = true;
      userData['updatedAt'] = Timestamp.fromDate(DateTime.now());
      await userDocRef.update(userData);
    }

    // Clean up the code document.
    await docRef.delete();

    return true;
  }

  /// Sign in with Google. Only signs in existing users — does NOT create new accounts.
  /// Throws [GoogleUserNotFoundException] if no account exists for this Google user.
  Future<UserModel> signInWithGoogle() async {
    final googleUser = await GoogleSignIn().signIn();
    if (googleUser == null) {
      throw FirebaseAuthException(
        code: 'cancelled',
        message: 'Google sign-in was cancelled.',
      );
    }

    final googleAuth = await googleUser.authentication;
    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth.accessToken,
      idToken: googleAuth.idToken,
    );

    final cred = await _auth.signInWithCredential(credential);
    final user = cred.user!;

    // Check if user profile already exists in Firestore.
    final docRef = _db.collection(FirestoreCollections.users).doc(user.uid);
    final docSnap = await docRef.get();

    if (!docSnap.exists) {
      // New user — sign them out and throw so the caller can redirect to register.
      await _auth.signOut();
      throw GoogleUserNotFoundException(email: user.email ?? '');
    }

    return UserModel.fromMap(docSnap.data()!);
  }

  /// Send an email verification link to the current user.
  Future<void> sendEmailVerification() async {
    final user = _auth.currentUser;
    if (user != null && !user.emailVerified) {
      await user.sendEmailVerification();
    }
  }

  /// Reload the current user to refresh email verification status.
  Future<bool> reloadAndCheckEmailVerified() async {
    final user = _auth.currentUser;
    if (user == null) return false;
    await user.reload();
    return _auth.currentUser?.emailVerified ?? false;
  }

  /// Update the user's display name (Firebase Auth profile).
  Future<void> updateDisplayName(String displayName) async {
    final user = _auth.currentUser;
    if (user != null) {
      await user.updateDisplayName(displayName);
    }
  }

  /// Update the user's password (requires recent login).
  Future<void> updatePassword(String newPassword) async {
    final user = _auth.currentUser;
    if (user != null) {
      await user.updatePassword(newPassword);
    }
  }

  /// Re-authenticate the current user with their current password.
  /// Required before sensitive operations like password change.
  Future<void> reAuthenticate(String email, String password) async {
    final user = _auth.currentUser;
    if (user != null) {
      final cred = EmailAuthProvider.credential(
        email: email.trim(),
        password: password,
      );
      await user.reauthenticateWithCredential(cred);
    }
  }

  /// Fetch the user profile from Firestore.
  Future<UserModel> getUserProfile(String uid) async {
    final doc = await _db
        .collection(FirestoreCollections.users)
        .doc(uid)
        .get();

    if (!doc.exists || doc.data() == null) {
      throw Exception('User profile not found');
    }

    return UserModel.fromMap(doc.data()!);
  }

  /// Create a user profile and wallet for an existing Firebase Auth user
  /// who doesn't have a Firestore document yet (e.g., orphaned from a
  /// failed registration or created in Firebase Console).
  Future<UserModel> createUserProfileForExistingAuthUser(User user) async {
    final now = DateTime.now();
    final username = (user.email?.split('@').first ?? 'user') +
        now.millisecondsSinceEpoch.toString().substring(7);
    final referralCode = _generateReferralCode(username);

    final userModel = UserModel(
      uid: user.uid,
      fullName: user.displayName ?? 'User',
      username: username,
      email: user.email ?? '',
      phone: user.phoneNumber,
      avatarUrl: user.photoURL,
      kycTier: 0,
      isEmailVerified: user.emailVerified,
      isPhoneVerified: false,
      referralCode: referralCode,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    );

    await _db
        .collection(FirestoreCollections.users)
        .doc(user.uid)
        .set(userModel.toMap());

    await _db
        .collection(FirestoreCollections.wallets)
        .doc(user.uid)
        .set({
      'uid': user.uid,
      'nairaBalance': 0,
      'cryptoBalances': <String, double>{},
      'totalValueNaira': 0,
      'createdAt': Timestamp.fromDate(now),
      'updatedAt': Timestamp.fromDate(now),
    });

    return userModel;
  }

  /// Update the user profile in Firestore.
  Future<void> updateUserProfile(UserModel user) async {
    await _db
        .collection(FirestoreCollections.users)
        .doc(user.uid)
        .update(user.copyWith(updatedAt: DateTime.now()).toMap());
  }

  /// Change the current user's password after re-authentication.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final user = _auth.currentUser;
    if (user == null || user.email == null) return;

    final cred = EmailAuthProvider.credential(
      email: user.email!,
      password: currentPassword,
    );
    await user.reauthenticateWithCredential(cred);
    await user.updatePassword(newPassword);
  }

  /// Check if a username is already taken.
  Future<bool> isUsernameTaken(String username) async {
    final snapshot = await _db
        .collection(FirestoreCollections.users)
        .where('username', isEqualTo: username.trim())
        .limit(1)
        .get();
    return snapshot.docs.isNotEmpty;
  }

  /// Check if an email is already registered.
  Future<bool> isEmailTaken(String email) async {
    try {
      final snapshot = await FirebaseFirestore.instance
          .collection(FirestoreCollections.users)
          .where('email', isEqualTo: email.trim().toLowerCase())
          .limit(1)
          .get();
      return snapshot.docs.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  /// Generate a unique referral code from the username.
  String _generateReferralCode(String username) {
    final clean = username.toUpperCase().replaceAll(RegExp(r'[^A-Z0-9]'), '');
    final random = Random();
    final suffix = List.generate(4, (_) => random.nextInt(10)).join();
    return 'KAT-${clean.padRight(3, 'X').substring(0, 3)}-$suffix';
  }

  /// Maps a FirebaseAuthException to a user-friendly message.
  String handleAuthError(FirebaseAuthException e) {
    return AuthErrorHandler.handle(e);
  }
}

/// Thrown when a Google sign-in user does not have an existing account.
class GoogleUserNotFoundException implements Exception {
  final String email;
  GoogleUserNotFoundException({required this.email});

  @override
  String toString() => 'No account found for $email. Please create an account first.';
}

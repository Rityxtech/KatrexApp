import 'dart:async';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../models/user_model.dart';
import '../services/auth_service.dart';
import '../services/push_notification_service.dart';
import '../utils/constants.dart';
import '../utils/error_handler.dart';

enum AuthStatus { uninitialized, authenticated, unauthenticated, loading }

/// Central auth state provider. Expose via ChangeNotifierProvider at app root.
/// Listens to Firebase Auth state changes and loads the user profile from Firestore.
class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();

  AuthStatus _status = AuthStatus.uninitialized;
  UserModel? _userModel;
  User? _firebaseUser;
  String? _errorMessage;
  bool _isRegistering = false;
  bool _needsRegistration = false;
  StreamSubscription<DocumentSnapshot<Map<String, dynamic>>>? _userDocSubscription;

  AuthStatus get status => _status;
  UserModel? get userModel => _userModel;
  User? get firebaseUser => _firebaseUser;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isLoading => _status == AuthStatus.loading;
  bool get needsRegistration => _needsRegistration;

  AuthProvider() {
    _init();
  }

  void _init() {
    _authService.authStateChanges.listen(_onAuthStateChanged);
  }

  void _listenToUserProfile(String uid) {
    _userDocSubscription?.cancel();
    _userDocSubscription = FirebaseFirestore.instance
        .collection(FirestoreCollections.users)
        .doc(uid)
        .snapshots()
        .listen(
      (snap) {
        if (snap.exists && snap.data() != null) {
          _userModel = UserModel.fromMap(snap.data()!);
          notifyListeners();
        }
      },
      onError: (e) {
        debugPrint('[AuthProvider] User profile stream error: $e');
      },
    );
  }

  Future<void> _onAuthStateChanged(User? user) async {
    _firebaseUser = user;
    if (user == null) {
      _userModel = null;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return;
    }

    // If a manual registration is in progress, let it finish without switching AuthGate.
    if (_isRegistering) {
      return;
    }

    // If already authenticated (from signIn/register), don't override.
    if (_status == AuthStatus.authenticated && _userModel != null) {
      return;
    }

    try {
      _userModel = await _authService.getUserProfile(user.uid);

      // Sync: if Firebase says email is verified but our Firestore field doesn't, update it.
      if (!_userModel!.isEmailVerified && user.emailVerified) {
        _userModel = _userModel!.copyWith(isEmailVerified: true);
        await _authService.updateUserProfile(_userModel!);
      }

      _status = AuthStatus.authenticated;
      _listenToUserProfile(user.uid);
    } catch (e) {
      // Profile doesn't exist — try to create a minimal one.
      try {
        debugPrint('User profile not found, creating one for ${user.uid}');
        _userModel = await _authService.createUserProfileForExistingAuthUser(user);
        _status = AuthStatus.authenticated;
        _listenToUserProfile(user.uid);
      } catch (e2) {
        debugPrint('Error creating user profile: $e2');
        _userModel = null;
        _status = AuthStatus.unauthenticated;
      }
    }
    notifyListeners();
  }

  /// Register a new user.
  Future<bool> register({
    required String fullName,
    required String username,
    required String email,
    required String password,
    String? phone,
    String? referredBy,
  }) async {
    _isRegistering = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final (model, _) = await _authService.registerWithEmail(
        fullName: fullName,
        username: username,
        email: email,
        password: password,
        phone: phone,
        referredBy: referredBy,
      );
      _userModel = model;
      _firebaseUser = _authService.currentUser;
      _status = AuthStatus.authenticated;
      _isRegistering = false;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      _errorMessage = _authService.handleAuthError(e);
      _isRegistering = false;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = AppErrorHandler.handle(e);
      _isRegistering = false;
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  /// Sign in with email & password.
  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    _errorMessage = null;

    try {
      _userModel = await _authService.signInWithEmail(
        email: email,
        password: password,
      );
      _firebaseUser = _authService.currentUser;

      // Sync: if Firebase says email is verified but our Firestore field doesn't,
      // update Firestore so the user doesn't get stuck on the OTP screen.
      if (!_userModel!.isEmailVerified &&
          _firebaseUser != null &&
          _firebaseUser!.emailVerified) {
        _userModel = _userModel!.copyWith(isEmailVerified: true);
        await _authService.updateUserProfile(_userModel!);
      }

      // If still not verified, generate and email a code.
      if (!_userModel!.isEmailVerified && _firebaseUser != null) {
        await _authService.generateEmailCode(_firebaseUser!.uid, _userModel!.email);
      }
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      _errorMessage = _authService.handleAuthError(e);
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = AppErrorHandler.handle(e);
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  /// Send a password reset email.
  Future<bool> sendPasswordReset(String email) async {
    _errorMessage = null;
    try {
      await _authService.sendPasswordResetEmail(email);
      return true;
    } on FirebaseAuthException catch (e) {
      _errorMessage = _authService.handleAuthError(e);
      return false;
    } catch (e) {
      _errorMessage = AppErrorHandler.handle(e);
      return false;
    }
  }

  /// Sign in with Google. Seamlessly logs in existing users or provisions new accounts.
  Future<bool> signInWithGoogle() async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    _needsRegistration = false;
    notifyListeners();

    try {
      _userModel = await _authService.signInWithGoogle();
      _firebaseUser = _authService.currentUser;
      _status = AuthStatus.authenticated;
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      if (e.code == 'cancelled') {
        _status = AuthStatus.unauthenticated;
      } else {
        _errorMessage = _authService.handleAuthError(e);
        _status = AuthStatus.unauthenticated;
      }
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = AppErrorHandler.handle(e);
      _status = AuthStatus.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  /// Generate a new email verification code and trigger the email Cloud Function.
  Future<bool> sendEmailVerification() async {
    _errorMessage = null;
    if (_firebaseUser == null) return false;
    try {
      await _authService.generateEmailCode(_firebaseUser!.uid, _firebaseUser!.email ?? _userModel?.email ?? '');
      return true;
    } catch (e) {
      _errorMessage = AppErrorHandler.handle(e);
      return false;
    }
  }

  /// Verify the 6-digit email code entered by the user.
  /// On success, updates the local userModel and notifies listeners.
  Future<bool> verifyEmailCode(String code) async {
    _errorMessage = null;
    if (_firebaseUser == null) return false;
    try {
      final success = await _authService.verifyEmailCode(_firebaseUser!.uid, code);
      if (success && _userModel != null) {
        _userModel = _userModel!.copyWith(isEmailVerified: true);
        notifyListeners();
      }
      return success;
    } catch (e) {
      _errorMessage = AppErrorHandler.handle(e);
      return false;
    }
  }

  /// Sign out the current user.
  Future<void> signOut() async {
    _userDocSubscription?.cancel();
    _userDocSubscription = null;
    try {
      await PushNotificationService.instance.unregisterToken();
    } catch (e) {
      debugPrint('[AuthProvider] Error unregistering push token: $e');
    }
    await _authService.signOut();
    _userModel = null;
    _firebaseUser = null;
    _isRegistering = false;
    _needsRegistration = false;
    _errorMessage = null;
    _status = AuthStatus.unauthenticated;
    notifyListeners();
  }

  @override
  void dispose() {
    _userDocSubscription?.cancel();
    super.dispose();
  }

  /// Reload the user profile from Firestore.
  Future<void> reloadUserProfile() async {
    if (_firebaseUser == null) return;
    try {
      _userModel = await _authService.getUserProfile(_firebaseUser!.uid);
      notifyListeners();
    } catch (e) {
      debugPrint('Error reloading user profile: $e');
    }
  }

  /// Update the user profile in Firestore and refresh local state.
  Future<void> updateUserProfileDirect(UserModel updated) async {
    await _authService.updateUserProfile(updated);
    _userModel = updated;
    notifyListeners();
  }

  /// Change the current user's password.
  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    await _authService.changePassword(
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
  }

  /// Clear any error message.
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

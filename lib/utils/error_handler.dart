import 'dart:io';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

/// Maps Firebase Auth error codes to user-friendly messages.
/// Raw error details are logged to console only — never shown to users.
class AuthErrorHandler {
  AuthErrorHandler._();

  static String handle(FirebaseAuthException e) {
    debugPrint('[FirebaseAuth] ${e.code}: ${e.message}');
    switch (e.code) {
      case 'invalid-email':
        return 'The email address is not valid.';
      case 'user-disabled':
        return 'This account has been disabled. Contact support.';
      case 'user-not-found':
        return 'No account found with this email.';
      case 'wrong-password':
      case 'invalid-credential':
        return 'Incorrect email or password.';
      case 'email-already-in-use':
        return 'An account already exists with this email.';
      case 'operation-not-allowed':
        return 'This sign-in method is not enabled. Contact support.';
      case 'weak-password':
        return 'Password is too weak. Use at least 8 characters with a number and uppercase letter.';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'network-request-failed':
        return 'Network error. Check your internet connection.';
      case 'invalid-verification-code':
        return 'Invalid OTP code. Please try again.';
      case 'invalid-phone-number':
        return 'The phone number is not valid.';
      case 'session-expired':
        return 'The OTP session has expired. Please request a new code.';
      case 'quota-exceeded':
        return 'SMS quota exceeded. Please try again later.';
      case 'requires-recent-login':
        return 'This action requires a recent login. Please sign in again.';
      case 'cancelled':
        return 'Sign-in was cancelled.';
      case 'account-exists-with-different-credential':
        return 'An account already exists with a different sign-in method. Try another option.';
      case 'provider-already-linked':
        return 'This sign-in method is already linked to your account.';
      case 'credential-already-in-use':
        return 'This credential is already associated with another account.';
      case 'user-token-expired':
        return 'Your session has expired. Please sign in again.';
      case 'user-token-revoked':
        return 'Your session was revoked. Please sign in again.';
      case 'invalid-action-code':
        return 'The action code is invalid or has expired.';
      case 'expired-action-code':
        return 'The action code has expired. Please request a new one.';
      case 'invalid-user-token':
        return 'Your session is invalid. Please sign in again.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

/// Maps Firebase Firestore errors to user-friendly messages.
class FirestoreErrorHandler {
  FirestoreErrorHandler._();

  static String handle(dynamic e) {
    debugPrint('[Firestore] $e');
    final msg = e.toString().toLowerCase();
    if (msg.contains('permission-denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (msg.contains('not-found')) {
      return 'The requested data was not found.';
    }
    if (msg.contains('already-exists')) {
      return 'This data already exists.';
    }
    if (msg.contains('unavailable')) {
      return 'Service temporarily unavailable. Please try again.';
    }
    return 'Something went wrong. Please try again.';
  }
}

/// Catch-all handler for any exception. Logs the raw error to console
/// and returns a safe, user-friendly message.
class AppErrorHandler {
  AppErrorHandler._();

  static String handle(dynamic e) {
    debugPrint('[AppError] $e');

    if (e is FirebaseAuthException) {
      return AuthErrorHandler.handle(e);
    }

    final msg = e.toString().toLowerCase();

    if (e is SocketException || msg.contains('socket') || msg.contains('network')) {
      return 'Network error. Check your internet connection.';
    }
    if (msg.contains('permission-denied')) {
      return 'You do not have permission to perform this action.';
    }
    if (msg.contains('not-found')) {
      return 'The requested data was not found.';
    }
    if (msg.contains('already-exists') || msg.contains('already in use')) {
      return 'This data already exists.';
    }
    if (msg.contains('unavailable') || msg.contains('timeout')) {
      return 'Service temporarily unavailable. Please try again.';
    }
    if (msg.contains('expired')) {
      return 'This action has expired. Please try again.';
    }
    if (msg.contains('no verification code found')) {
      return 'No verification code found. Please request a new code.';
    }
    if (msg.contains('verification code has expired')) {
      return 'Your verification code has expired. Please request a new code.';
    }
    if (msg.contains('invalid verification code')) {
      return 'Invalid verification code. Please try again.';
    }

    return 'Something went wrong. Please try again.';
  }
}

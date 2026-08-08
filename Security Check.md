# KatrexApp — Security Checklist & Audit

## Authentication Security

### Firebase Auth
- [x] Email/password authentication enabled via Firebase Auth
- [x] Email verification required after registration (`sendEmailVerification`)
- [x] Password reset via Firebase (`sendPasswordResetEmail`)
- [x] Re-authentication required before sensitive operations (`reAuthenticate`)
- [x] Auth state listened via `authStateChanges` stream (no manual token management)
- [x] Error messages mapped to user-friendly text (no internal leaks via `AuthErrorHandler`)

### Session Management
- [x] `AuthProvider` listens to Firebase auth state changes automatically
- [x] `AuthGate` routes users based on `AuthStatus` (uninitialized/authenticated/unauthenticated)
- [x] Sign-out clears all local state (`_userModel`, `_firebaseUser`)
- [x] No tokens stored locally — Firebase manages session persistence

### Password Policies
- [x] Minimum 8 characters enforced (`Validators.password`)
- [x] Requires at least one uppercase letter
- [x] Requires at least one number
- [x] Confirm password validation (`Validators.confirmPassword`)

---

## Firestore Security Rules

### User Profiles (`users/{userId}`)
- [x] Users can only read their own profile (`isOwner(userId)`)
- [x] Users can only create their own profile (UID must match auth UID)
- [x] Users cannot escalate `kycTier` field (blocked in update rule)
- [x] Users cannot change `isActive` status (blocked in update rule)
- [x] Users cannot delete their own profile (`allow delete: if false`)

### Wallets (`wallets/{userId}`)
- [x] Users can read their own wallet balance
- [x] Wallet creation only allowed with zero balances
- [x] **Wallet updates blocked from client** — only Cloud Functions can modify balances
- [x] Wallet deletion blocked

### Transactions (`transactions/{transactionId}`)
- [x] Users can only read transactions where `uid` matches their auth UID
- [x] New transactions must have `status: 'pending'`
- [x] Users can only cancel their own pending transactions
- [x] Transaction deletion blocked (immutable audit trail)

### Notifications (`notifications/{notificationId}`)
- [x] Users can only read their own notifications
- [x] Users can only change `isRead` to `true` (no other fields)
- [x] Notification creation blocked from client (Cloud Functions / admin only)
- [x] Users can delete (clear) their own notifications

### Gift Card Trades (`giftcard_trades/{tradeId}`)
- [x] Users can read only their own trades
- [x] New trades must have `status: 'pending'`
- [x] Status updates blocked from client (Cloud Functions only)
- [x] Trade deletion blocked

### Support Tickets (`support_tickets/{ticketId}`)
- [x] Users can read only their own tickets
- [x] New tickets must have `status: 'open'`
- [x] Updates blocked from client (admin / Cloud Functions only)
- [x] Ticket deletion blocked

### KYC Documents (`kyc_documents/{docId}`)
- [x] Users can read only their own KYC documents
- [x] New documents must have `verificationStatus: 'pending'`
- [x] Users cannot change verification status (admin only)
- [x] Document deletion blocked

### Referrals (`referrals/{referralId}`)
- [x] Users can read only their own referral records
- [x] Create/update/delete all blocked (Cloud Functions only)

### Default Rule
- [x] **Deny all** — any collection not explicitly matched is fully blocked

---

## Firebase Storage Security Rules

### Gift Card Images (`giftcard_images/{uid}/{fileName}`)
- [x] Users can only access their own folder
- [x] Max file size: 10MB
- [x] Content type must be `image/*`

### KYC Documents (`kyc_documents/{uid}/{fileName}`)
- [x] Users can only access their own folder
- [x] Max file size: 10MB
- [x] Content type must be `image/*` or `application/pdf`

### Avatars (`avatars/{uid}/{fileName}`)
- [x] Max file size: 5MB
- [x] Content type must be `image/*`
- [x] Any signed-in user can read (for profile pictures)
- [x] Only owner can write/delete

### Default Rule
- [x] **Deny all** — any path not explicitly matched is fully blocked

---

## Data Protection

### Input Validation
- [x] Email format validated (`Validators.email`)
- [x] Password strength validated (`Validators.password`)
- [x] Username format validated (alphanumeric + underscore only)
- [x] Phone number format validated (10-15 digits)
- [x] Amount validation with minimum checks (`Validators.amount`)
- [x] OTP format validated (6 digits)

### Sensitive Data Handling
- [x] No API keys or secrets hardcoded in app code
- [x] Firebase config values are public-safe (Firebase security comes from rules, not config secrecy)
- [x] Error messages do not expose internal system details (`AuthErrorHandler` maps to generic messages)
- [x] No sensitive data logged to console in production (`debugPrint` only)

### Firestore Data Structure
- [x] All documents include `uid` field for ownership checks
- [x] Timestamps use `FieldValue.serverTimestamp()` pattern via `Timestamp.fromDate`
- [x] Transaction amounts stored as `double` (not integer to avoid rounding issues)

---

## Production Hardening (Before Launch)

### Cloud Functions (Required)
- [ ] Deploy Cloud Functions for all wallet balance modifications
- [ ] Deploy Cloud Function for transaction status updates (verify payment before completing)
- [ ] Deploy Cloud Function for gift card trade processing
- [ ] Deploy Cloud Function for referral bonus distribution
- [ ] Deploy Cloud Function for notification creation on events
- [ ] Deploy Cloud Function for KYC verification status updates

### Rate Limiting
- [ ] Implement rate limiting on auth endpoints (Firebase handles brute-force protection)
- [ ] Add rate limiting on transaction creation (Cloud Functions)
- [ ] Add rate limiting on support ticket creation

### Monitoring & Alerting
- [ ] Enable Firebase App Check (attestation to prevent API abuse from non-app sources)
- [ ] Set up Firebase Crashlytics for crash monitoring
- [ ] Set up Firebase Performance Monitoring
- [ ] Configure Firestore alerts for quota approaching limits

### Additional Auth Security
- [ ] Enable Firebase Auth email enumeration protection
- [ ] Consider adding phone OTP authentication (Firebase Phone Auth)
- [ ] Consider adding biometric authentication (local_auth package)
- [ ] Set up Firebase App Check with reCAPTCHA Enterprise (web) or DeviceCheck (iOS) / Play Integrity (Android)

### Data Compliance
- [ ] Review data retention policy for transactions
- [ ] Implement data export functionality (GDPR compliance)
- [ ] Implement account deletion flow (GDPR right to erasure)
- [ ] Review PII storage (phone, email, KYC docs) against local regulations

---

## File Locations

| File | Path |
|------|------|
| Firestore Rules | `firestore.rules` |
| Storage Rules | `storage.rules` |
| Auth Service | `lib/services/auth_service.dart` |
| Firestore Service | `lib/services/firestore_service.dart` |
| Storage Service | `lib/services/storage_service.dart` |
| Auth Provider | `lib/providers/auth_provider.dart` |
| Validators | `lib/utils/validators.dart` |
| Error Handler | `lib/utils/error_handler.dart` |
| Constants | `lib/utils/constants.dart` |
| Auth Gate | `lib/widgets/auth_gate.dart` |
| Firebase Options | `lib/firebase_options.dart` |

---

## Deployment Commands

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Storage security rules
firebase deploy --only storage

# Deploy Cloud Functions (when ready)
firebase deploy --only functions

# Deploy everything
firebase deploy
```

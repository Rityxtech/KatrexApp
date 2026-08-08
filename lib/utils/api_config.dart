/// Central place for all third-party API keys and base URLs.
///
/// SECURITY: All secret keys have been moved to Cloud Functions (server-side).
/// The client app should NEVER contain secret keys, mnemonics, or API tokens.
/// All sensitive operations are proxied through Firebase Callable Functions.
class ApiConfig {
  ApiConfig._();

  // ─── Squad (Payment Gateway & Virtual Accounts) ──────────────────
  // Secret key is now in Cloud Functions (SQUAD_SECRET_KEY env var).
  // Only the public key and non-sensitive config remain here.
  static const String squadBaseUrl = 'https://sandbox-api-d.squadco.com';
  static const String squadCallbackUrl = 'https://smclientkx.com/payment-callback';

  // ─── HD Wallet (Custodial Crypto Deposits) ─────────────────────
  // Mnemonic is now in Cloud Functions (HD_WALLET_MNEMONIC env var).
  // The client never sees the mnemonic or private keys.

  // ─── SMEPLUG (Data & Airtime) ────────────────────────────────────
  // API key is now in Cloud Functions (SMEPLUG_API_KEY env var).
  static const String smeplugBaseUrl = 'https://smeplug.ng/api/v1';

  // ─── SME API (Data & Airtime) ─────────────────────────────────────
  // API key is now in Cloud Functions (SME_API_KEY env var).
  static const String smeapiBaseUrl = 'https://smeapi.com.ng/api';

  // ─── Network helpers ──────────────────────────────────────────────
  /// Maps app network names to SMEPLUG network IDs.
  static const networkIdMap = {
    'MTN': '1',
    'Airtel': '2',
    'Glo': '4',
    '9Mobile': '3',
  };
}

/// App-wide constants for Firestore collection paths and configuration.
class FirestoreCollections {
  FirestoreCollections._();

  static const users = 'users';
  static const transactions = 'transactions';
  static const notifications = 'notifications';
  static const wallets = 'wallets';
  static const giftcardTrades = 'giftcard_trades';
  static const supportTickets = 'support_tickets';
  static const referrals = 'referrals';
  static const kycDocuments = 'kyc_documents';
  static const virtualAccounts = 'virtual_accounts';
  static const cryptoDeposits = 'crypto_deposits';
  static const appConfig = 'app_config';
}

class StoragePaths {
  StoragePaths._();

  static const giftcardImages = 'giftcard_images';
  static const kycDocuments = 'kyc_documents';
  static const avatars = 'avatars';
}

class AppConstants {
  AppConstants._();

  static const String appName = 'KatrexApp';
  static const String supportEmail = 'support@katrex.com';

  /// Default currency symbol used across the app.
  static const String nairaSymbol = '\u20A6';

  /// Minimum transaction amounts.
  static const double minDeposit = 100;
  static const double minWithdrawal = 1000;
  static const double minAirtimePurchase = 100;
  static const double maxAirtimePurchase = 20000;
  static const double minDataPurchase = 100;
}

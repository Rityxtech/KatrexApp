import 'package:bip39/bip39.dart' as bip39;

void main() {
  final mnemonic = bip39.generateMnemonic(strength: 128);
  print('========================================');
  print('  YOUR HD WALLET MASTER MNEMONIC');
  print('========================================');
  print('');
  print(mnemonic);
  print('');
  print('========================================');
  print('  IMPORTANT SECURITY NOTES:');
  print('========================================');
  print('');
  print('1. Write these 12 words down on paper.');
  print('2. Store them OFFLINE in a secure location.');
  print('3. NEVER share them with anyone.');
  print('4. NEVER commit them to git.');
  print('5. These words control ALL user funds.');
  print('6. If you lose them, all funds are gone forever.');
  print('');
  print('After saving securely, paste them into:');
  print('  lib/utils/api_config.dart -> hdWalletMnemonic');
  print('  Firebase Functions secret -> HD_WALLET_MNEMONIC');
  print('');
}

# HD Wallet Setup Guide

## Step 1: Generate Your Master Mnemonic

Run this Dart script once to generate your 12-word seed phrase:

```bash
cd /Users/rityxtech/Desktop/Mobile\ Apps/KatrexApp
/Users/rityxtech/development/flutter/bin/dart run lib/tools/generate_mnemonic.dart
```

**Write down the 12 words on paper. Store them offline.** These words control ALL user funds.

## Step 2: Set Your Mnemonic in the App

Open `lib/utils/api_config.dart` and replace the placeholder mnemonic:

```dart
static const String hdWalletMnemonic = 'YOUR 12 WORDS HERE';
```

## Step 3: Deploy the Deposit Detection Cloud Function

The Cloud Function monitors blockchains for incoming deposits and auto-credits user wallets.

### Prerequisites:
```bash
cd functions
npm install axios
```

### Deploy:
```bash
firebase deploy --only functions:checkCryptoDeposits
```

The Cloud Function code is in `functions/checkCryptoDeposits.js`.

## Step 4: Set Up Blockchain API Keys

### TronGrid (TRX, USDT TRC20) — Free
1. Go to https://www.trongrid.io/
2. Sign up and get an API key
3. Add to Cloud Function environment: `firebase functions:secrets:set TRONGRID_API_KEY`

### Infura/Alchemy (ETH, USDT ERC20/BEP20) — Free tier
1. Go to https://www.infura.io/ or https://www.alchemy.com/
2. Sign up and get an API key
3. Add to Cloud Function environment: `firebase functions:secrets:set INFURA_API_KEY`

### Blockchain.com (BTC) — Free
No API key needed, uses public API.

## Step 5: Set Mnemonic in Cloud Function

```bash
firebase functions:secrets:set HD_WALLET_MNEMONIC
# Paste your 12-word mnemonic when prompted
```

## How It Works

1. **User opens deposit** → App derives their unique address from the master seed (instant, no API call)
2. **User sends crypto** to their address
3. **Cloud Function polls** blockchain APIs every 30 seconds
4. **Deposit detected** → Cloud Function credits user's wallet balance in Firestore
5. **User sees updated balance** in the app

## Security Notes

- **NEVER** commit the mnemonic to git
- **NEVER** share it with anyone
- **NEVER** store it unencrypted in Firestore
- The mnemonic in `api_config.dart` is a placeholder — replace it with your real one
- For production, consider moving the mnemonic to Firebase Remote Config or Secret Manager
- The app only derives public addresses — private keys are never exposed to the client
- Withdrawals should be signed on the backend (Cloud Function) using the same mnemonic

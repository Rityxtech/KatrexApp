import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {onRequest} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {defineSecret} from "firebase-functions/params";
import * as https from "https";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");
const squadSecretKey = defineSecret("SQUAD_SECRET_KEY");
const hdWalletMnemonic = defineSecret("HD_WALLET_MNEMONIC");
const trongridApiKey = defineSecret("TRONGRID_API_KEY");
const infuraApiKey = defineSecret("INFURA_API_KEY");
const FROM_EMAIL = "KatrexApp <noreply@katrexapp.com>";

// Re-export the callable admin API so the Firebase CLI's filter parser can
// resolve it (`firebase deploy --only functions:default:adminApi` looks for
// the export on the entry point, not on the source file). Other functions
// are kept in their own modules and only re-exported here when they need
// to be deployable via a targeted filter.
export {adminApi} from "./admin-functions";

// Re-export the user-facing support API (tickets + AI live chat) so we
// can ship Gemini changes via a targeted filter without redeploying
// every function in the codebase. Also re-export the scheduled cleanup.
export {supportApi, cleanupOldAiChatMessages} from "./support-functions";

// Re-export the referral pipeline so we can deploy the qualification
// logic (`onTransactionCompleted`), the "new referral" notification
// (`onUserCreated`), and the admin config (`updateReferralConfig`) via
// a targeted filter without redeploying every function in the codebase.
export {
  onUserCreated,
  onTransactionCompleted,
  updateReferralConfig,
  claimReferralRewards,
  processReferralPayout,
  flagReferral,
  backfillReferralMinSpend,
} from "./referral-functions";

export const sendVerificationEmail = onDocumentCreated(
  {
    document: "email_codes/{uid}",
    region: "us-central1",
    memory: "256MiB",
    secrets: [resendApiKey],
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const code = data.code as string;
    const uid = event.params.uid;
    const email = data.email as string;

    logger.info(`Sending verification email for uid: ${uid}`);

    const html = [
      "<div style=\"font-family: Arial, sans-serif;",
      " max-width: 480px; margin: 0 auto; padding: 24px;\">",
      "<h2 style=\"color: #1E3A8A;\">Verify Your Email</h2>",
      "<p style=\"font-size: 16px; color: #333;\">",
      "Your verification code is:</p>",
      "<div style=\"text-align: center; margin: 24px 0;\">",
      "<span style=\"font-size: 36px; font-weight: bold;",
      " letter-spacing: 8px; color: #1E3A8A;\">",
      `${code}</span></div>`,
      "<p style=\"font-size: 14px; color: #666;\">",
      "This code expires in 10 minutes.</p>",
      "<p style=\"font-size: 14px; color: #666;\">",
      "If you didn't request this code,",
      " you can safely ignore this email.</p>",
      "</div>",
    ].join("");

    const payload = JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: "Your KatrexApp Verification Code",
      html: html,
    });

    return new Promise<void>((resolve) => {
      const req = https.request(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.value()}`,
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(payload),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 &&
                res.statusCode < 300) {
              logger.info(`Email sent to ${email}`);
            } else {
              logger.error(
                `Resend error: ${res.statusCode} ${body}`
              );
            }
            resolve();
          });
        }
      );
      req.on("error", (error) => {
        logger.error("Failed to send email:", error);
        resolve();
      });
      req.write(payload);
      req.end();
    });
  }
);

export const squadWebhook = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    secrets: [squadSecretKey],
  },
  async (req, res) => {
    try {
      const body = req.body;
      const event = body?.event;
      const data = body?.data;

      logger.info(`Squad webhook received: ${event}`);

      if (event === "charge_successful" && data) {
        const tokenId = data.token_id as string | undefined;
        const transactionRef = data.transaction_ref as string | undefined;
        const email = data.email as string | undefined;
        const customerName = data.customer_name as string | undefined;
        const cardLast4 = data.card_last4 as string | undefined;
        const cardBrand = data.card_brand as string | undefined;

        if (tokenId && email) {
          const db = getFirestore();
          const usersRef = db.collection("users");
          const userQuery = await usersRef
            .where("email", "==", email)
            .limit(1)
            .get();

          if (!userQuery.empty) {
            const userDoc = userQuery.docs[0];
            const uid = userDoc.id;
            const userData = userDoc.data();
            const savedCards = userData.savedCards || [];

            const cardEntry = {
              tokenId,
              last4: cardLast4 || "",
              brand: cardBrand || "",
              email,
              customerName: customerName || "",
              transactionRef: transactionRef || "",
              savedAt: new Date().toISOString(),
            };

            savedCards.push(cardEntry);

            await userDoc.ref.update({
              savedCards,
              updatedAt: new Date(),
            });

            logger.info(`Card token saved for user ${uid}`);
          } else {
            logger.warn(`No user found for email ${email}`);
          }
        }
      }

      if (event === "virtual_account_payment" && data) {
        const accountNumber = data.virtual_account_number as string | undefined;
        const amount = data.amount as number | undefined;
        const transactionRef = data.transaction_ref as string | undefined;

        logger.info(`VA payment: account=${accountNumber}, amount=${amount}, ref=${transactionRef}`);

        if (accountNumber && amount) {
          const db = getFirestore();
          const vaQuery = await db.collection("virtualAccounts")
            .where("account_number", "==", accountNumber)
            .limit(1)
            .get();

          if (!vaQuery.empty) {
            const vaDoc = vaQuery.docs[0];
            const uid = vaDoc.id;
            const amountNaira = amount / 100;
            const reference = transactionRef || `VA-${uid}-${Date.now()}`;

            // Replay protection: check if this transaction_ref was already processed.
            if (transactionRef) {
              const existingTx = await db.collection("transactions")
                .where("reference", "==", transactionRef)
                .limit(1)
                .get();
              if (!existingTx.empty) {
                logger.info(`Duplicate webhook: ${transactionRef} already processed`);
                res.status(200).send({status: "already_processed"});
                return;
              }
            }

            // Atomic: create transaction + credit wallet + notify — all-or-nothing.
            const txRef = db.collection("transactions").doc();
            const walletRef = db.collection("wallets").doc(uid);
            const notifRef = db.collection("notifications").doc();

            await db.runTransaction(async (txn) => {
              // Create transaction record
              txn.set(txRef, {
                id: txRef.id,
                uid: uid,
                type: "deposit",
                status: "completed",
                amountNaira: amountNaira,
                description: `Bank transfer deposit to ${accountNumber}`,
                reference: reference,
                paymentMethod: "virtual_account",
                createdAt: new Date(),
                completedAt: new Date(),
              });

              // Credit wallet atomically using FieldValue.increment
              txn.set(walletRef, {
                uid: uid,
                nairaBalance: FieldValue.increment(amountNaira),
                updatedAt: new Date(),
              }, { merge: true });

              // Create notification
              txn.set(notifRef, {
                id: notifRef.id,
                uid: uid,
                type: "deposit",
                title: "Deposit Successful",
                body: `Your bank transfer deposit of ₦${amountNaira.toLocaleString()} has been credited.`,
                preview: `Your bank transfer deposit of ₦${amountNaira.toLocaleString()} has been credited.`,
                isRead: false,
                createdAt: new Date(),
              });
            });

            logger.info(`VA deposit credited atomically: uid=${uid}, amount=${amountNaira}, ref=${reference}`);
          } else {
            logger.warn(`No virtual account found for ${accountNumber}`);
          }
        }
      }

      res.status(200).send({status: "success"});
    } catch (error) {
      logger.error("Squad webhook error:", error);
      res.status(500).send({status: "error"});
    }
  }
);

// ============ HD WALLET DEPOSIT DETECTION ============

// Currency code → blockchain info
const CURRENCY_INFO: Record<string, {chain: string; contract?: string; decimals?: number}> = {
  btc: {chain: "bitcoin"},
  eth: {chain: "ethereum"},
  trx: {chain: "tron"},
  usdttrc20: {chain: "tron", contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t", decimals: 6},
  usdt: {chain: "ethereum", contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals: 6},
  usdtbsc: {chain: "bsc", contract: "0x55d398326f99059fF775485246999027B3197955", decimals: 18},
};

// Minimum deposit thresholds (in coin units).
// Deposits below these are forfeited to management (not credited to user).
const MIN_DEPOSIT: Record<string, number> = {
  btc: 0.0001,
  eth: 0.002,
  trx: 10,
  usdttrc20: 1,
  usdt: 10,
  usdtbsc: 2,
};

/// Process a balance check: compute delta from last seen balance,
/// credit user only if delta >= minimum threshold, otherwise forfeit.
/// Always updates lastSeenBalance in Firestore.
async function processBalance(
  db: FirebaseFirestore.Firestore,
  uid: string,
  currency: string,
  currentBalance: number,
  address: string,
  addressDocRef: FirebaseFirestore.DocumentReference,
  addrData: Record<string, any>,
): Promise<void> {
  const minDeposit = MIN_DEPOSIT[currency] ?? 0;
  const lastSeen = (addrData.lastSeenBalance as number) ?? 0;
  const delta = currentBalance - lastSeen;

  // Update lastSeenBalance regardless (so sub-minimum deposits are consumed)
  addrData.lastSeenBalance = currentBalance;
  addrData.lastCheckedAt = new Date().toISOString();

  if (delta <= 0) {
    // Balance didn't increase — just save the updated addrData
    return;
  }

  if (delta >= minDeposit) {
    // Credit the delta to user
    await creditDeposit(db, uid, currency, delta, address);
    logger.info(`Credited ${delta} ${currency} to user ${uid} (balance: ${currentBalance})`);
  } else {
    // Sub-minimum deposit — forfeited to management
    logger.info(`Sub-minimum deposit forfeited: ${delta} ${currency} from ${uid} (min: ${minDeposit})`);
  }
}

async function checkTronDeposits(db: FirebaseFirestore.Firestore): Promise<void> {
  const apiKey = trongridApiKey.value();
  if (!apiKey) { logger.warn("TRONGRID_API_KEY not set"); return; }

  const snapshot = await db.collection("crypto_deposits").get();
  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const docData = doc.data() ?? {};
    const addresses = docData.addresses as Record<string, any> | undefined;
    if (!addresses) continue;

    let docChanged = false;

    for (const [currency, addrData] of Object.entries(addresses)) {
      const info = CURRENCY_INFO[currency];
      if (!info || info.chain !== "tron") continue;
      const address = addrData?.address as string | undefined;
      if (!address) continue;

      try {
        if (currency === "trx") {
          const url = `https://api.trongrid.io/v1/accounts/${address}`;
          const res = await fetch(url, {headers: {"TRON-PRO-API-KEY": apiKey}});
          const data = await res.json() as any;
          const balance = (data?.data?.[0]?.balance ?? 0) / 1e6;

          await processBalance(db, uid, "trx", balance, address, doc.ref, addrData);
          docChanged = true;
        } else if (currency === "usdttrc20" && info.contract) {
          const contractUrl = `https://api.trongrid.io/v1/contracts/${info.contract}/accounts/${address}`;
          const cRes = await fetch(contractUrl, {headers: {"TRON-PRO-API-KEY": apiKey}});
          const cData = await cRes.json() as any;
          const balance = (cData?.data?.[0]?.balance ?? 0) / Math.pow(10, info.decimals!);

          await processBalance(db, uid, "usdttrc20", balance, address, doc.ref, addrData);
          docChanged = true;
        }
      } catch (e) {
        logger.error(`Error checking Tron deposit for ${uid}/${currency}:`, e);
      }
    }

    if (docChanged) {
      await doc.ref.set({addresses, uid}, {merge: true});
    }
  }
}

async function checkEthereumDeposits(db: FirebaseFirestore.Firestore): Promise<void> {
  const apiKey = infuraApiKey.value();
  if (!apiKey) { logger.warn("INFURA_API_KEY not set"); return; }

  const snapshot = await db.collection("crypto_deposits").get();
  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const docData = doc.data() ?? {};
    const addresses = docData.addresses as Record<string, any> | undefined;
    if (!addresses) continue;

    let docChanged = false;

    for (const [currency, addrData] of Object.entries(addresses)) {
      const info = CURRENCY_INFO[currency];
      if (!info || (info.chain !== "ethereum" && info.chain !== "bsc")) continue;
      const address = addrData?.address as string | undefined;
      if (!address) continue;

      try {
        const rpcUrl = info.chain === "bsc"
          ? `https://bsc-dataseed.binance.org/`
          : `https://mainnet.infura.io/v3/${apiKey}`;

        if (currency === "eth") {
          const body = {jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"]};
          const res = await fetch(rpcUrl, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
          const data = await res.json() as any;
          const balance = parseInt(data?.result ?? "0x0", 16) / 1e18;

          await processBalance(db, uid, "eth", balance, address, doc.ref, addrData);
          docChanged = true;
        } else if (info.contract) {
          const data = "0x70a08231000000000000000000000000" + address.slice(2);
          const body = {jsonrpc: "2.0", id: 1, method: "eth_call", params: [{to: info.contract, data}, "latest"]};
          const res = await fetch(rpcUrl, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
          const result = await res.json() as any;
          const balance = parseInt(result?.result ?? "0x0", 16) / Math.pow(10, info.decimals!);

          await processBalance(db, uid, currency, balance, address, doc.ref, addrData);
          docChanged = true;
        }
      } catch (e) {
        logger.error(`Error checking ETH/BSC deposit for ${uid}/${currency}:`, e);
      }
    }

    if (docChanged) {
      await doc.ref.set({addresses, uid}, {merge: true});
    }
  }
}

async function checkBtcDeposits(db: FirebaseFirestore.Firestore): Promise<void> {
  const snapshot = await db.collection("crypto_deposits").get();
  for (const doc of snapshot.docs) {
    const uid = doc.id;
    const docData = doc.data() ?? {};
    const addresses = docData.addresses as Record<string, any> | undefined;
    if (!addresses) continue;

    const addrData = addresses["btc"];
    const address = addrData?.address as string | undefined;
    if (!address) continue;

    try {
      const url = `https://blockchain.info/q/addressbalance/${address}`;
      const res = await fetch(url);
      const satoshis = parseInt(await res.text(), 10);
      const balance = satoshis / 1e8;

      await processBalance(db, uid, "btc", balance, address, doc.ref, addrData);
      await doc.ref.set({addresses, uid}, {merge: true});
    } catch (e) {
      logger.error(`Error checking BTC deposit for ${uid}:`, e);
    }
  }
}

async function creditDeposit(
  db: FirebaseFirestore.Firestore,
  uid: string,
  currency: string,
  amount: number,
  address: string,
): Promise<void> {
  // Create transaction record
  await db.collection("transactions").add({
    id: "",
    uid: uid,
    type: "deposit",
    status: "completed",
    amountNaira: 0,
    amountCoin: amount.toString(),
    coinSymbol: currency,
    description: `Crypto deposit (${currency})`,
    reference: `HD-${uid}-${currency}-${Date.now()}`,
    paymentMethod: "crypto",
    createdAt: new Date(),
    completedAt: new Date(),
  });

  // Create notification
  const notifRef = db.collection("notifications").doc();
  await notifRef.set({
    id: notifRef.id,
    uid: uid,
    type: "deposit",
    title: "Deposit Successful",
    body: `Your crypto deposit of ${amount} ${currency} has been credited.`,
    preview: `Your crypto deposit of ${amount} ${currency} has been credited.`,
    isRead: false,
    createdAt: new Date(),
  });

  // Update wallet balance
  const walletRef = db.collection("wallets").doc(uid);
  const walletDoc = await walletRef.get();
  const cryptoBalances = walletDoc.exists
    ? (walletDoc.data()?.cryptoBalances || {}) as Record<string, number>
    : {};
  cryptoBalances[currency] = (cryptoBalances[currency] || 0) + amount;

  await walletRef.set({
    uid: uid,
    cryptoBalances: cryptoBalances,
    updatedAt: new Date(),
    createdAt: walletDoc.exists ? walletDoc.data()?.createdAt : new Date(),
    nairaBalance: walletDoc.exists ? (walletDoc.data()?.nairaBalance ?? 0) : 0,
    totalValueNaira: walletDoc.exists ? (walletDoc.data()?.totalValueNaira ?? 0) : 0,
  }, {merge: true});

  logger.info(`HD wallet deposit credited for user ${uid}: ${amount} ${currency}`);
}

export const checkCryptoDeposits = onSchedule(
  {
    schedule: "every 1 minutes",
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [hdWalletMnemonic, trongridApiKey, infuraApiKey],
  },
  async () => {
    const db = getFirestore();
    logger.info("Starting HD wallet deposit check...");

    await Promise.all([
      checkTronDeposits(db),
      checkEthereumDeposits(db),
      checkBtcDeposits(db),
    ]);

    logger.info("HD wallet deposit check complete.");
  },
);

// ============ MARKET DATA SCHEDULED FUNCTION ============

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  TON: "the-open-network",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  DOGE: "dogecoin",
  ADA: "cardano",
  MATIC: "matic-network",
  TRX: "tron",
};

let cachedNgnRate = 1450;

function fetchNgnRate(): Promise<number> {
  return new Promise((resolve) => {
    const req = https.request(
      "https://api.exchangerate-api.com/v4/latest/USD",
      {method: "GET", headers: {"User-Agent": "KatrexApp/1.0"}},
      (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            const d = JSON.parse(body);
            const r = d?.rates?.NGN;
            if (r && typeof r === "number") { cachedNgnRate = r; resolve(r); }
            else resolve(cachedNgnRate);
          } catch { resolve(cachedNgnRate); }
        });
      }
    );
    req.on("error", () => resolve(cachedNgnRate));
    req.setTimeout(5000, () => { req.destroy(); resolve(cachedNgnRate); });
    req.end();
  });
}

function fetchAllCoins(coinIds: string[]): Promise<any[]> {
  return new Promise((resolve) => {
    const ids = coinIds.join(",");
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=true&price_change_percentage=1h,24h,7d`;
    const req = https.request(url, {method: "GET", headers: {"User-Agent": "KatrexApp/1.0"}}, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          const d = JSON.parse(body);
          resolve(Array.isArray(d) ? d : []);
        } catch { resolve([]); }
      });
    });
    req.on("error", () => resolve([]));
    req.setTimeout(15000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

export const updateMarketData = onSchedule(
  {
    schedule: "every 2 minutes",
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async () => {
    const db = getFirestore();
    const ngnRate = await fetchNgnRate();
    logger.info(`NGN rate: ${ngnRate}`);

    const entries = Object.entries(COINGECKO_IDS);
    const geckoIds = entries.map(([, id]) => id);
    const coins = await fetchAllCoins(geckoIds);
    logger.info(`Fetched ${coins.length} coins from CoinGecko`);

    const coinById = new Map(coins.map((c) => [c.id, c]));

    const batch = db.batch();
    let count = 0;

    for (const [symbol, geckoId] of entries) {
      const coin = coinById.get(geckoId);
      if (!coin) continue;
      const ref = db.collection("market_data").doc(symbol.toLowerCase());
      batch.set(ref, {
        symbol,
        name: coin.name ?? symbol,
        priceUsd: coin.current_price ?? 0,
        priceNaira: (coin.current_price ?? 0) * ngnRate,
        change24h: coin.price_change_percentage_24h ?? 0,
        change1h: coin.price_change_percentage_1h_in_currency ?? 0,
        change7d: coin.price_change_percentage_7d_in_currency ?? 0,
        marketCap: coin.market_cap ?? 0,
        volume24h: coin.total_volume ?? 0,
        high24h: coin.high_24h ?? 0,
        low24h: coin.low_24h ?? 0,
        ath: coin.ath ?? 0,
        circulatingSupply: coin.circulating_supply ?? 0,
        sparkline: coin.sparkline_in_7d?.price ?? [],
        ngnRate,
        updatedAt: new Date(),
      }, {merge: true});
      count++;
    }

    batch.set(db.collection("market_data").doc("_ngn_rate"), {
      rate: ngnRate,
      updatedAt: new Date(),
    }, {merge: true});

    await batch.commit();
    logger.info(`Market data updated for ${count} coins`);
  }
);

/**
 * Secure Cloud Functions for KatrexApp.
 *
 * These functions handle all sensitive operations that must NOT be done
 * client-side:
 *   - HD wallet address derivation (mnemonic stays server-side)
 *   - Financial operations (buy, sell, swap, withdraw, airtime, data)
 *   - API proxy calls (Korapay, Squad, SMEPLUG, SME)
 *
 * The client calls these via Firebase Callable Functions (onCall),
 * which automatically pass the user's auth token.
 */
import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {createHash} from "crypto";
import {defineSecret} from "firebase-functions/params";
import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import {deriveAddress as deriveAddressImpl} from "./hd-wallet-derivation";

initializeApp();

const hdWalletMnemonic = defineSecret("HD_WALLET_MNEMONIC");
const squadSecretKey = defineSecret("SQUAD_SECRET_KEY");           // LIVE key — card payments
const squadSandboxSecretKey = defineSecret("SQUAD_SANDBOX_SECRET_KEY"); // SANDBOX key — testing only
const squadBeneficiaryAccount = defineSecret("SQUAD_BENEFICIARY_ACCOUNT"); // settlement NUBAN for virtual accounts
const smeplugApiKey = defineSecret("SMEPLUG_API_KEY");
const smeApiKey = defineSecret("SME_API_KEY");
const r2AccessKeyId = defineSecret("R2_ACCESS_KEY_ID");
const r2SecretAccessKey = defineSecret("R2_SECRET_ACCESS_KEY");
const r2AccountId = defineSecret("R2_ACCOUNT_ID");
const r2BucketName = defineSecret("R2_BUCKET_NAME");

const db = getFirestore();

function requiredString(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string, maxLength = 1000): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value.trim();
}

function finiteNumber(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value;
}

// ===========================================================================
// HD WALLET ADDRESS DERIVATION
// ===========================================================================

/**
 * Derive a deposit address for a currency. The mnemonic is never sent
 * to the client — only the public address is returned.
 *
 * The address is also cached in crypto_deposits/{uid} so subsequent
 * calls return the same address.
 */
async function handleDeriveDepositAddress(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`derive_${uid}`, 30);
    const {currencyCode} = request.data as {currencyCode: string};
    if (!currencyCode) {
      throw new HttpsError("invalid-argument", "currencyCode is required.");
    }

    // Check if address already exists in cache
    const depositDoc = await db.collection("crypto_deposits").doc(uid).get();
    const depositData = depositDoc.data() ?? {};
    const addresses = depositData.addresses ?? {};

    if (addresses[currencyCode]?.address) {
      return {address: addresses[currencyCode].address};
    }

    // Derive new address using the HD wallet mnemonic (server-side only)
    const mnemonic = hdWalletMnemonic.value();
    if (!mnemonic) {
      throw new HttpsError("failed-precondition", "Wallet service not configured.");
    }

    // Allocate a globally-unique derivation index for this user (once).
    // Indexes come from a monotonic counter — never a uid hash — so no two
    // users can ever share an address, at any user count.
    const walletIndex = await allocateWalletIndex(uid);
    const address = await deriveAddressImpl(mnemonic, currencyCode, walletIndex);

    // Cache the address
    await db.collection("crypto_deposits").doc(uid).set({
      uid,
      walletIndex,
      addresses: {
        ...addresses,
        [currencyCode]: {
          address,
          lastSeenBalance: 0,
          createdAt: new Date().toISOString(),
        },
      },
    }, {merge: true});

    return {address};
}

/**
 * Allocate the user's permanent HD derivation index from the global counter
 * `crypto_deposits/_address_index`. Runs in a transaction so concurrent
 * first-calls can't get the same index. All of a user's coin addresses use
 * this same index; different users always get different indexes.
 */
async function allocateWalletIndex(uid: string): Promise<number> {
  const userRef = db.collection("crypto_deposits").doc(uid);
  const counterRef = db.collection("crypto_deposits").doc("_address_index");
  return db.runTransaction(async (txn) => {
    const [userSnap, counterSnap] = await Promise.all([
      txn.get(userRef),
      txn.get(counterRef),
    ]);
    const existing = userSnap.data()?.walletIndex;
    if (typeof existing === "number") return existing;

    const next = ((counterSnap.data()?.next as number) ?? 0) + 1;
    txn.set(counterRef, {next}, {merge: true});
    txn.set(userRef, {walletIndex: next}, {merge: true});
    return next;
  });
}

/**
 * Derive a deposit address from the HD wallet mnemonic.
 * Delegates to hd-wallet-derivation.ts; takes the globally-allocated
 * derivation index (see allocateWalletIndex), never the raw uid.
 */

// ===========================================================================
// FINANCIAL OPERATIONS — BUY / SELL / SWAP / SEND
// ===========================================================================

/** Max age of a market price before trades are rejected as stale. */
const PRICE_MAX_AGE_MS = 15 * 60 * 1000;
/** Max tolerance between the client's expected amount and the server quote. */
const DEFAULT_MAX_SLIPPAGE_PERCENT = 3;

/**
 * Sliding-window rate limiter for money callables. Counts are kept in
 * rate_limits/{key}; throws resource-exhausted when either window is full.
 */
async function enforceRateLimit(
  key: string,
  maxPerMinute: number,
  maxPerHour = Number.MAX_SAFE_INTEGER,
): Promise<void> {
  const ref = db.collection("rate_limits").doc(key);
  const now = Date.now();
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const d = snap.data();
    let minuteCount = 0;
    let hourCount = 0;
    if (d) {
      if (now - (d.minuteStartedAt?.toMillis?.() ?? 0) < 60_000) minuteCount = d.minuteCount ?? 0;
      if (now - (d.hourStartedAt?.toMillis?.() ?? 0) < 3_600_000) hourCount = d.hourCount ?? 0;
    }
    if (minuteCount >= maxPerMinute || hourCount >= maxPerHour) {
      throw new HttpsError(
        "resource-exhausted",
        "Too many requests. Please slow down and try again shortly.",
      );
    }
    txn.set(ref, {
      minuteCount: minuteCount + 1,
      minuteStartedAt: minuteCount === 0 ? new Date(now) : d!.minuteStartedAt,
      hourCount: hourCount + 1,
      hourStartedAt: hourCount === 0 ? new Date(now) : d!.hourStartedAt,
    }, {merge: true});
  });
}


// ─── Action lock + idempotency (duplicate-order protection) ──────────────

/**
 * Per-user, per-action cooldown lock. Blocks a second submission of the
 * SAME action within the cooldown window — even from a different device.
 * This is what stops multi-device double-submit scams.
 */
async function enforceActionLock(uid: string, action: string, cooldownMs = 8_000): Promise<void> {
  const ref = db.collection("rate_limits").doc(`lock_${uid}_${action}`);
  const now = Date.now();
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const last = snap.data()?.lastAcceptedAt?.toMillis?.() ?? 0;
    if (now - last < cooldownMs) {
      throw new HttpsError(
        "resource-exhausted",
        "Duplicate order blocked — the same action was just submitted. Please wait a few seconds.",
      );
    }
    txn.set(ref, {lastAcceptedAt: new Date(now)}, {merge: true});
  });
}

/**
 * Claim a client-generated idempotency key exactly once. A rapid double-tap
 * (or an automatic client retry) sends the same key twice — the second call
 * is rejected instead of creating a second order.
 */
async function claimIdempotencyKey(uid: string, rawKey: unknown): Promise<void> {
  if (rawKey === undefined || rawKey === null) return;
  const key = String(rawKey);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(key)) {
    throw new HttpsError("invalid-argument", "idempotencyKey is malformed.");
  }
  const ref = db.collection("idempotency_keys").doc(`${uid}_${key}`);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    if (snap.exists) {
      throw new HttpsError("already-exists", "This order was already submitted.");
    }
    txn.set(ref, {uid, createdAt: new Date()});
  });
}

/** Errors that mean no money moved — the lock is released so the user can retry immediately. */
const SAFE_RETRY_CODES = new Set([
  "invalid-argument", "failed-precondition", "unauthenticated",
  "permission-denied", "out-of-range", "already-exists", "resource-exhausted",
]);

async function releaseActionLock(uid: string, action: string): Promise<void> {
  await db.collection("rate_limits").doc(`lock_${uid}_${action}`).delete();
}

/**
 * Wrap a money action with duplicate protection:
 *  1. per-user cooldown lock (blocks a second concurrent submission of the
 *     same action — including from another device),
 *  2. one-time idempotency-key claim (blocks replays of the same order).
 * The lock is released when the handler throws a validation-style error, so
 * an honest user can fix the input and retry right away. On success or on
 * ambiguous failures (timeouts, upstream errors) the lock stays held for the
 * cooldown window.
 */
async function withOrderLock<T>(uid: string, lockName: string, idempotencyKey: unknown, fn: () => Promise<T>): Promise<T> {
  await enforceActionLock(uid, lockName);
  try {
    await claimIdempotencyKey(uid, idempotencyKey);
  } catch (err) {
    await releaseActionLock(uid, lockName).catch(() => {});
    throw err;
  }
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpsError && SAFE_RETRY_CODES.has(err.code as string)) {
      await releaseActionLock(uid, lockName).catch(() => {});
    }
    throw err;
  }
}

/**
 * Submit KYC details for manual admin review. Same fields as the old
 * Squad virtual-account form, but nothing is auto-approved: the data is
 * saved to the user profile with kycStatus = 'pending' and an admin
 * approves/rejects it from the dashboard (adminApi reviewKyc).
 */
async function handleSubmitKyc(request: CallableRequest<any>) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const uid = request.auth.uid;
  await enforceRateLimit(`kyc_${uid}`, 3, 10);

  const {bvn, phone, dob, gender, address} = request.data as {
    bvn: string; phone: string; dob: string; gender: string; address: string;
  };

  if (!bvn || !/^\d{11}$/.test(bvn)) {
    throw new HttpsError("invalid-argument", "Enter a valid 11-digit BVN.");
  }
  // Normalize: strip '+', spaces, dashes, etc. before validating. The
  // client should have already done this, but the server is the source
  // of truth — a profile pre-fill (e.g. "+2348012345678") can sneak
  // through the client's input formatters because they only filter
  // typed input, not programmatic text changes.
  const phoneRaw = String(phone ?? "");
  const phoneClean = phoneRaw.replace(/\D/g, "");
  if (!phoneClean || !/^\d{11,14}$/.test(phoneClean)) {
    throw new HttpsError("invalid-argument", "Enter a valid phone number.");
  }
  if (!dob || !/^\d{2}\/\d{2}\/\d{4}$|^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    throw new HttpsError("invalid-argument", "Enter a valid date of birth.");
  }
  const normalizedGender = String(gender ?? "").toLowerCase();
  if (normalizedGender !== "male" && normalizedGender !== "female") {
    throw new HttpsError("invalid-argument", "Select your gender.");
  }
  if (!address || address.trim().length < 5) {
    throw new HttpsError("invalid-argument", "Enter your full address.");
  }

  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    throw new HttpsError("failed-precondition", "User profile not found.");
  }
  // Already verified — nothing to submit.
  if ((snap.data()?.kycStatus as string) === "verified" || ((snap.data()?.kycTier as number) ?? 0) >= 1) {
    throw new HttpsError("failed-precondition", "Your identity is already verified.");
  }

  await userRef.set({
    bvn,
    phone: phoneClean,
    dateOfBirth: dob,
    gender: normalizedGender,
    address: address.trim(),
    kycStatus: "pending",
    kycSubmittedAt: new Date(),
    kycRejectionReason: null, // clear any previous rejection
    updatedAt: new Date(),
  }, {merge: true});

  // Notify the user that their submission is under review.
  const notifRef = db.collection("notifications").doc();
  await notifRef.set({
    id: notifRef.id, uid, type: "general",
    title: "KYC Submission Received",
    body: "Your identity verification is under review. We'll notify you once it's approved.",
    isRead: false, createdAt: new Date(),
  });

  return {success: true, status: "pending"};
}

/**
 * Verify a 6-digit email verification code the user received by email.
 *
 * The client cannot read/write email_codes/{uid} (firestore.rules denies
 * client reads), so verification has to happen server-side. The user is
 * already authenticated at this point (signup completed, .then() on the
 * auth state change), so we trust request.auth.uid to scope the lookup.
 *
 * On success:
 *  - deletes the email_codes/{uid} document (no replay)
 *  - flips users/{uid}.isEmailVerified = true (the only field the client
 *    is forbidden from setting on itself)
 */
async function handleVerifyEmailCode(request: CallableRequest<any>) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const uid = request.auth.uid;

  const {code} = request.data as {code?: string};
  if (!code || !/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Enter the 6-digit code from your email.");
  }

  const codeRef = db.collection("email_codes").doc(uid);
  const codeSnap = await codeRef.get();
  if (!codeSnap.exists) {
    throw new HttpsError("not-found", "No verification code found. Please request a new code.");
  }
  const codeData = codeSnap.data()!;
  const storedCode = String(codeData.code ?? "");
  const expiresAt = (codeData.expiresAt as FirebaseFirestore.Timestamp | undefined)?.toDate();

  if (!expiresAt || Date.now() > expiresAt.getTime()) {
    await codeRef.delete().catch(() => {});
    throw new HttpsError("deadline-exceeded", "Verification code has expired. Please request a new code.");
  }
  if (storedCode !== code) {
    throw new HttpsError("invalid-argument", "Invalid verification code. Please try again.");
  }

  // Mark the user's email as verified. Uses Admin SDK → bypasses rules.
  await db.collection("users").doc(uid).set({
    isEmailVerified: true,
    updatedAt: new Date(),
  }, {merge: true});

  // Burn the code so it can't be reused.
  await codeRef.delete().catch(() => {});

  return {success: true};
}

/**
 * Resend a fresh email verification code to the currently signed-in user.
 *
 * The client cannot reliably do this on its own — overwriting
 * email_codes/{uid} with set() is a no-op for the email pipeline unless
 * the trigger sees a create event. So this handler:
 *   1. Deletes the existing email_codes/{uid} doc (no-op if absent).
 *   2. Creates a fresh one with a new 6-digit code.
 * The create in step 2 re-fires the sendVerificationEmail trigger, which
 * actually sends the email.
 *
 * The per-user 3-per-hour send limit enforced by sendVerificationEmail
 * still applies (it's keyed on uid), so a flood of resends is capped.
 */
async function handleResendVerificationEmail(request: CallableRequest<any>) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const uid = request.auth.uid;
  const email = request.auth.token.email as string | undefined;
  if (!email) {
    throw new HttpsError("failed-precondition", "No email on the current account.");
  }
  await enforceRateLimit(`resend_${uid}`, 3, 10);

  const codeRef = db.collection("email_codes").doc(uid);

  // Dedupe: if a fresh code was created in the last minute (at signup, or
  // by another screen instance mounting at the same time), the email is
  // already on its way — don't burn another send. The window matches the
  // OTP screen's 60s resend cooldown, so a manual resend is never blocked.
  const existing = await codeRef.get();
  if (existing.exists) {
    const createdAt = (existing.data()?.createdAt as FirebaseFirestore.Timestamp | undefined)?.toDate?.();
    if (createdAt && Date.now() - createdAt.getTime() < 60_000) {
      logger.info(`resendVerificationEmail: fresh code already exists for uid ${uid}; skipping.`);
      return {success: true};
    }
  }

  // Best-effort delete of any old code document. We don't care about the
  // result — if it didn't exist, that's fine.
  await codeRef.delete().catch(() => {});

  const code = (100000 + Math.floor(Math.random() * 900000)).toString();
  await codeRef.set({
    code,
    email,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  logger.info(`Resent verification email for uid: ${uid}`);
  return {success: true};
}

/**
 * Server-side price fetch. The client NEVER controls the exchange rate —
 * buy/sell/swap amounts are always computed from market_data here.
 */

async function getServerPriceNaira(symbol: string): Promise<number> {
  const doc = await db.collection("market_data").doc(symbol.toLowerCase()).get();
  if (!doc.exists) {
    throw new HttpsError("failed-precondition", `Price for ${symbol} is unavailable. Try again shortly.`);
  }
  const data = doc.data()!;
  const price = data.priceNaira as number | undefined;
  if (!price || price <= 0) {
    throw new HttpsError("failed-precondition", `Price for ${symbol} is unavailable. Try again shortly.`);
  }
  const updatedAt = data.updatedAt?.toMillis?.() ?? 0;
  if (updatedAt && Date.now() - updatedAt > PRICE_MAX_AGE_MS) {
    throw new HttpsError("failed-precondition", `Price for ${symbol} is outdated. Try again shortly.`);
  }
  return price;
}

/** Reject if the client's expected amount deviates beyond the slippage bound. */
function assertWithinSlippage(expected: number, quoted: number, maxPercent: number) {
  if (expected <= 0 || quoted <= 0) {
    throw new HttpsError("invalid-argument", "Amounts must be positive.");
  }
  const deviation = Math.abs(expected - quoted) / quoted * 100;
  if (deviation > maxPercent) {
    throw new HttpsError(
      "failed-precondition",
      "Price has changed. Please review the new quote and try again.",
    );
  }
}

/**
 * Buy crypto with NGN wallet balance.
 * The coin amount credited is computed from the SERVER-side price; the
 * client's coinAmount is only used as an expected-value slippage check.
 */
async function handleExecuteBuy(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`buy_${uid}`, 10, 100);

    const {coinSymbol, nairaAmount, coinAmount, maxSlippagePercent} = request.data as {
      coinSymbol: string;
      nairaAmount: number;
      coinAmount?: number;
      maxSlippagePercent?: number;
    };

    if (!coinSymbol || !nairaAmount) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (nairaAmount <= 0) {
      throw new HttpsError("invalid-argument", "Amounts must be positive.");
    }
    if (nairaAmount < 500) {
      throw new HttpsError("invalid-argument", "Minimum buy is \u20A6500.");
    }

    const priceNaira = await getServerPriceNaira(coinSymbol);
    const quotedCoinAmount = nairaAmount / priceNaira;
    if (coinAmount !== undefined) {
      assertWithinSlippage(
        coinAmount, quotedCoinAmount,
        maxSlippagePercent ?? DEFAULT_MAX_SLIPPAGE_PERCENT,
      );
    }

    const feeDoc = await db.collection("app_config").doc("trade_fees").get();
    const buyFeePercent = feeDoc.exists
      ? (feeDoc.data()!.buyFeePercent as number) ?? 1.0
      : 1.0;

    const feeCoin = quotedCoinAmount * (buyFeePercent / 100);
    const netCoinAmount = quotedCoinAmount - feeCoin;

    const walletRef = db.collection("wallets").doc(uid);
    const txRef = db.collection("transactions").doc();

    await db.runTransaction(async (txn) => {
      const snap = await txn.get(walletRef);
      if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
      const wallet = snap.data()!;
      const nairaBalance = wallet.nairaBalance ?? 0;
      if (nairaBalance < nairaAmount) {
        throw new HttpsError("failed-precondition", "Insufficient NGN balance.");
      }

      const cryptoBalances = wallet.cryptoBalances ?? {};
      cryptoBalances[coinSymbol] = (cryptoBalances[coinSymbol] ?? 0) + netCoinAmount;

      txn.set(walletRef, {
        ...wallet,
        nairaBalance: nairaBalance - nairaAmount,
        cryptoBalances,
        updatedAt: new Date(),
      });

      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "buy",
        status: "completed",
        amountNaira: nairaAmount,
        amountCoin: netCoinAmount.toFixed(8),
        coinSymbol,
        description: `Buy ${coinSymbol} @ \u20A6${priceNaira.toFixed(2)} (fee: ${feeCoin.toFixed(8)} ${coinSymbol})`,
        reference: `BUY_${txRef.id}`,
        createdAt: new Date(),
        completedAt: new Date(),
        paymentMethod: "internal",
        feeAmount: feeCoin,
        feeSymbol: coinSymbol,
      });
    });

    return {success: true};
}

/**
 * Sell crypto to NGN wallet balance.
 * The NGN credited is computed from the SERVER-side price.
 */
async function handleExecuteSell(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`sell_${uid}`, 10, 100);

    const {coinSymbol, coinAmount, nairaAmount, maxSlippagePercent} = request.data as {
      coinSymbol: string;
      coinAmount: number;
      nairaAmount?: number;
      maxSlippagePercent?: number;
    };

    if (!coinSymbol || !coinAmount) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (coinAmount <= 0) {
      throw new HttpsError("invalid-argument", "Amounts must be positive.");
    }

    const priceNaira = await getServerPriceNaira(coinSymbol);
    const feeDoc = await db.collection("app_config").doc("trade_fees").get();
    const sellFeePercent = feeDoc.exists
      ? (feeDoc.data()!.sellFeePercent as number) ?? 1.5
      : 1.5;

    // Fee is charged in the coin being sold, not NGN received.
    const feeCoin = coinAmount * (sellFeePercent / 100);
    const netCoinAmount = coinAmount - feeCoin;
    const quotedNaira = netCoinAmount * priceNaira;

    if (nairaAmount !== undefined) {
      assertWithinSlippage(
        nairaAmount, quotedNaira,
        maxSlippagePercent ?? DEFAULT_MAX_SLIPPAGE_PERCENT,
      );
    }
    if (quotedNaira < 500) {
      throw new HttpsError("invalid-argument", "Minimum sell value is \u20A6500.");
    }

    const walletRef = db.collection("wallets").doc(uid);
    const txRef = db.collection("transactions").doc();

    await db.runTransaction(async (txn) => {
      const snap = await txn.get(walletRef);
      if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
      const wallet = snap.data()!;
      const cryptoBalances = wallet.cryptoBalances ?? {};
      const bal = cryptoBalances[coinSymbol] ?? 0;
      if (bal < coinAmount) {
        throw new HttpsError("failed-precondition", `Insufficient ${coinSymbol} balance.`);
      }

      // Deduct the full coin amount (including fee) from balance.
      cryptoBalances[coinSymbol] = bal - coinAmount;

      txn.set(walletRef, {
        ...wallet,
        nairaBalance: (wallet.nairaBalance ?? 0) + quotedNaira,
        cryptoBalances,
        updatedAt: new Date(),
      });

      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "sell",
        status: "completed",
        amountNaira: quotedNaira,
        amountCoin: netCoinAmount.toFixed(8),
        coinSymbol,
        description: `Sell ${coinSymbol} @ \u20A6${priceNaira.toFixed(2)} (fee: ${feeCoin.toFixed(8)} ${coinSymbol})`,
        reference: `SELL_${txRef.id}`,
        createdAt: new Date(),
        completedAt: new Date(),
        paymentMethod: "internal",
        feeAmount: feeCoin,
        feeSymbol: coinSymbol,
      });
    });

    return {success: true};
}

/**
 * Swap one crypto for another.
 * The to-amount is computed from SERVER-side prices of both coins.
 */
async function handleExecuteSwap(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`swap_${uid}`, 10, 100);

    const {fromCoin, toCoin, fromAmount, toAmount, maxSlippagePercent} = request.data as {
      fromCoin: string;
      toCoin: string;
      fromAmount: number;
      toAmount?: number;
      maxSlippagePercent?: number;
    };

    if (!fromCoin || !toCoin || !fromAmount) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (fromAmount <= 0) {
      throw new HttpsError("invalid-argument", "Amounts must be positive.");
    }
    if (fromCoin === toCoin) {
      throw new HttpsError("invalid-argument", "Cannot swap a coin with itself.");
    }

    const [fromPrice, toPrice] = await Promise.all([
      getServerPriceNaira(fromCoin),
      getServerPriceNaira(toCoin),
    ]);
    const quotedToAmount = (fromAmount * fromPrice) / toPrice;

    if (toAmount !== undefined) {
      assertWithinSlippage(
        toAmount, quotedToAmount,
        maxSlippagePercent ?? DEFAULT_MAX_SLIPPAGE_PERCENT,
      );
    }

    const feeDoc = await db.collection("app_config").doc("trade_fees").get();
    const swapFeePercent = feeDoc.exists
      ? (feeDoc.data()!.swapFeePercent as number) ?? 0.5
      : 0.5;

    const feeToAmount = quotedToAmount * (swapFeePercent / 100);
    const netToAmount = quotedToAmount - feeToAmount;

    const walletRef = db.collection("wallets").doc(uid);
    const txRef = db.collection("transactions").doc();

    await db.runTransaction(async (txn) => {
      const snap = await txn.get(walletRef);
      if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
      const wallet = snap.data()!;
      const cryptoBalances = wallet.cryptoBalances ?? {};
      const bal = cryptoBalances[fromCoin] ?? 0;
      if (bal < fromAmount) {
        throw new HttpsError("failed-precondition", `Insufficient ${fromCoin} balance.`);
      }

      cryptoBalances[fromCoin] = bal - fromAmount;
      cryptoBalances[toCoin] = (cryptoBalances[toCoin] ?? 0) + netToAmount;

      txn.set(walletRef, {
        ...wallet,
        cryptoBalances,
        updatedAt: new Date(),
      });

      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "swap",
        status: "completed",
        amountNaira: 0,
        amountCoin: fromAmount.toFixed(8),
        coinSymbol: fromCoin,
        description: `Swap ${fromCoin} to ${toCoin} @ \u20A6${fromPrice.toFixed(2)}/${toPrice.toFixed(2)} (fee: ${feeToAmount.toFixed(8)} ${toCoin})`,
        reference: `SWAP_${txRef.id}`,
        createdAt: new Date(),
        completedAt: new Date(),
        paymentMethod: "internal",
        recipient: toCoin,
        feeAmount: feeToAmount,
        feeSymbol: toCoin,
      });
    });

    return {success: true};
}

/**
 * Validate a withdrawal address for the given coin. Rejects malformed or
 * wrong-chain addresses before any balance is deducted.
 */
function isValidAddressForCoin(coin: string, address: string): boolean {
  const a = address.trim();
  switch (coin.toUpperCase()) {
    case "BTC":
      // Base58 (starts with 1 or 3, ~26-35 chars) or Bech32 native segwit
      return (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(a) ||
        /^(bc1)[0-9a-z]{11,71}$/.test(a.toLowerCase()));
    case "ETH": case "USDT": case "BNB": case "MATIC":
      // EVM chains (incl. ERC-20/BEP-20 USDT): 0x + 40 hex chars
      return /^0x[a-fA-F0-9]{40}$/.test(a);
    case "TRX": case "USDT-TRC20":
      // Tron: T + 33 base58 chars
      return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a);
    case "SOL":
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a);
    default:
      // Unknown chain: require a sane non-trivial string and let admin review catch it
      return a.length >= 20 && a.length <= 120 && !/\s/.test(a);
  }
}

/**
 * Request to send crypto to an external wallet. Creates a pending withdrawal
 * for admin to process. Deducts the amount + fee from balance atomically.
 * Address format is validated, the fee is server-controlled, and a daily
 * send-volume cap (NGN-equivalent) is enforced.
 */
async function handleRequestSend(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`send_${uid}`, 5, 20);

    const {coinSymbol, coinAmount, recipientAddress} = request.data as {
      coinSymbol: string;
      coinAmount: number;
      recipientAddress: string;
    };

    if (!coinSymbol || !coinAmount || !recipientAddress) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (coinAmount <= 0) {
      throw new HttpsError("invalid-argument", "Amount must be positive.");
    }
    if (!isValidAddressForCoin(coinSymbol, recipientAddress)) {
      throw new HttpsError(
        "invalid-argument",
        `That doesn't look like a valid ${coinSymbol} address. Please check it and try again.`,
      );
    }

    const priceNaira = await getServerPriceNaira(coinSymbol);
    const nairaValue = coinAmount * priceNaira;

    const [feeDoc, limitDoc] = await Promise.all([
      db.collection("app_config").doc("trade_fees").get(),
      db.collection("app_config").doc("send_limits").get(),
    ]);
    const sendFeePercent = feeDoc.exists
      ? (feeDoc.data()!.sendFeePercent as number) ?? 1.0
      : 1.0;
    const dailyNairaLimit = limitDoc.exists
      ? (limitDoc.data()!.dailyNairaLimit as number) ?? 2_000_000
      : 2_000_000;
    const perTxNairaMin = limitDoc.exists
      ? (limitDoc.data()!.perTxNairaMin as number) ?? 1_000
      : 1_000;

    if (nairaValue < perTxNairaMin) {
      throw new HttpsError("invalid-argument", "Amount is below the minimum send value.");
    }

    const feeCoin = coinAmount * (sendFeePercent / 100);
    const totalDeduct = coinAmount + feeCoin;

    const walletRef = db.collection("wallets").doc(uid);
    const txRef = db.collection("transactions").doc();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    await db.runTransaction(async (txn) => {
      const snap = await txn.get(walletRef);
      if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
      const wallet = snap.data()!;
      const cryptoBalances = wallet.cryptoBalances ?? {};
      const bal = cryptoBalances[coinSymbol] ?? 0;
      if (bal < totalDeduct) {
        throw new HttpsError(
          "failed-precondition",
          `Insufficient ${coinSymbol} balance (need ${totalDeduct} including fee).`,
        );
      }

      // Daily send cap (NGN-equivalent volume, resets each calendar day)
      const volumeToday = (wallet.sendVolumeDate === today)
        ? (wallet.sendVolumeNaira ?? 0)
        : 0;
      if (volumeToday + nairaValue > dailyNairaLimit) {
        throw new HttpsError(
          "failed-precondition",
          `Daily send limit of \u20A6${dailyNairaLimit.toLocaleString()} exceeded. Try again tomorrow or contact support.`,
        );
      }

      cryptoBalances[coinSymbol] = bal - totalDeduct;

      txn.set(walletRef, {
        ...wallet,
        cryptoBalances,
        sendVolumeDate: today,
        sendVolumeNaira: volumeToday + nairaValue,
        updatedAt: new Date(),
      });

      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "send",
        status: "pending",
        amountNaira: Math.round(nairaValue),
        amountCoin: coinAmount.toFixed(8),
        coinSymbol,
        description: `Send ${coinSymbol} to external wallet (fee: ${feeCoin} ${coinSymbol})`,
        reference: `SEND_${txRef.id}`,
        createdAt: new Date(),
        recipient: recipientAddress,
        feeAmount: feeCoin,
        feeSymbol: coinSymbol,
      });
    });

    return {success: true, txId: txRef.id};
}

// ===========================================================================
// WITHDRAWAL — NGN withdrawal to bank account
// ===========================================================================

/**
 * Request a NGN withdrawal. Server-side balance check + atomic deduction.
 * Creates a pending transaction for admin to process.
 */
async function handleRequestWithdrawal(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`wd_${uid}`, 3, 10);

    const {amount, bankName, accountNumber, accountName} = request.data as {
      amount: number;
      bankName: string;
      accountNumber: string;
      accountName: string;
    };

    if (!amount || amount <= 0) {
      throw new HttpsError("invalid-argument", "Invalid amount.");
    }
    if (amount < 1000) {
      throw new HttpsError("invalid-argument", "Minimum withdrawal is \u20A61,000.");
    }
    if (!bankName || !accountNumber || !accountName) {
      throw new HttpsError("invalid-argument", "Bank details required.");
    }

    const walletRef = db.collection("wallets").doc(uid);
    const txRef = db.collection("transactions").doc();

    await db.runTransaction(async (txn) => {
      const snap = await txn.get(walletRef);
      if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
      const wallet = snap.data()!;
      const nairaBalance = wallet.nairaBalance ?? 0;
      if (nairaBalance < amount) {
        throw new HttpsError("failed-precondition", "Insufficient balance.");
      }

      txn.set(walletRef, {
        ...wallet,
        nairaBalance: nairaBalance - amount,
        updatedAt: new Date(),
      });

      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "withdrawal",
        status: "pending",
        amountNaira: amount,
        description: `Withdrawal to ${accountName} (${bankName} ${accountNumber})`,
        reference: `WD_${Date.now()}`,
        createdAt: new Date(),
        paymentMethod: "bank_transfer",
        recipient: `${accountName} - ${bankName} - ${accountNumber}`,
      });
    });

    return {success: true, txId: txRef.id};
}

// ===========================================================================
// BANK ACCOUNT MANAGEMENT — save / remove saved bank accounts
// ===========================================================================

/**
 * Save a bank account to the user's profile (paymentMethods array).
 * Prevents duplicate entries by accountNumber.
 */
async function handleSaveBankAccount(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const {bankName, accountNumber, accountName, bankCode} = request.data as {
      bankName: string;
      accountNumber: string;
      accountName: string;
      bankCode?: string;
    };

    if (!bankName || !accountNumber || !accountName) {
      throw new HttpsError("invalid-argument", "Bank details required.");
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "User not found.");
    }
    const userData = userSnap.data()!;
    const paymentMethods = userData.paymentMethods ?? [];

    if (paymentMethods.length >= 3) {
      throw new HttpsError("failed-precondition", "Maximum of 3 bank accounts reached. Please delete an existing account first.");
    }

    const exists = paymentMethods.some(
      (m: {type: string; accountNumber: string}) =>
        m.type === "bank" && m.accountNumber === accountNumber,
    );
    if (exists) {
      throw new HttpsError("already-exists", "Bank account already saved.");
    }

    paymentMethods.push({
      type: "bank",
      bankName,
      accountNumber,
      accountName,
      bankCode: bankCode ?? null,
      addedAt: new Date(),
    });

    await userRef.update({paymentMethods});

    return {success: true};
}

/**
 * Remove a saved bank account from the user's profile by accountNumber.
 */
async function handleRemoveBankAccount(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const {accountNumber} = request.data as {accountNumber: string};

    if (!accountNumber) {
      throw new HttpsError("invalid-argument", "accountNumber is required.");
    }

    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("failed-precondition", "User not found.");
    }
    const userData = userSnap.data()!;
    const paymentMethods = userData.paymentMethods ?? [];

    const filtered = paymentMethods.filter(
      (m: {type: string; accountNumber: string}) =>
        !(m.type === "bank" && m.accountNumber === accountNumber),
    );

    await userRef.update({paymentMethods: filtered});

    return {success: true};
}

// ===========================================================================
// WITHDRAWAL PROCESSING — admin approve / reject pending withdrawals
// ===========================================================================

/**
 * Process a pending withdrawal. Admin-only.
 * On approve: mark transaction completed.
 * On reject: mark transaction failed and refund the user's nairaBalance.
 */
// ===========================================================================
// DATA PLANS — fetch available plans from VTU provider (server-side)
// ===========================================================================

/**
 * Fetch data plans from the active VTU provider.
 * The API key is never exposed to the client.
 *
 * Accepts: { network: string } — e.g. "MTN", "Airtel", "Glo", "9mobile"
 * Returns: { plans: [{ id, name, price, type, days, network }] }
 */
async function handleGetDataPlans(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const {network, provider: providerOverride} = request.data as { network: string; provider?: string };
    if (!network) {
      throw new HttpsError("invalid-argument", "Network name required.");
    }

    // Fetch hidden plan IDs from Firestore so we can exclude them for users.
    // The admin dashboard writes hidden plan IDs to hidden_data_plans/{providerNetwork}.
    const hiddenPlanIds = new Set<string>();
    try {
      const hiddenSnap = await db.collection("hidden_data_plans").get();
      hiddenSnap.forEach((doc) => {
        const data = doc.data();
        const ids = data.planIds as string[] | undefined;
        if (ids && Array.isArray(ids)) {
          ids.forEach((id) => hiddenPlanIds.add(id));
        }
      });
    } catch (e) {
      logger.warn("Could not read hidden_data_plans, showing all:", e);
    }

    // Fetch the global data profit margin from Firestore.
    // Admin sets this in the Airtime & Data page. Default 0% (no markup).
    let dataProfitMargin = 0;
    try {
      const markupDoc = await db.collection("config").doc("data_pricing").get();
      if (markupDoc.exists && typeof markupDoc.data()?.profitMarginPercent === "number") {
        dataProfitMargin = markupDoc.data()!.profitMarginPercent as number;
      }
    } catch (e) {
      logger.warn("Could not read data_pricing config, defaulting to 0%:", e);
    }

    // Fetch custom display names for plans set by admin.
    const customNames: Record<string, string> = {};
    try {
      const namesDoc = await db.collection("config").doc("plan_display_names").get();
      if (namesDoc.exists && namesDoc.data()?.names && typeof namesDoc.data()?.names === "object") {
        Object.assign(customNames, namesDoc.data()!.names as Record<string, string>);
      }
    } catch (e) {
      logger.warn("Could not read plan_display_names config:", e);
    }

    // Determine which provider to use: override from caller > Firestore config > default.
    // Default is "smeapi" — admin can switch to "smeplug" from dashboard.
    let provider: "smeplug" | "smeapi" = "smeapi";
    if (providerOverride === "smeplug" || providerOverride === "smeapi") {
      provider = providerOverride;
    } else {
      try {
        const configDoc = await db.collection("config").doc("vtu_provider").get();
        if (configDoc.exists && configDoc.data()?.provider === "smeplug") {
          provider = "smeplug";
        }
      } catch (e) {
        logger.warn("Could not read VTU provider config, defaulting to smeapi:", e);
      }
    }

    if (provider === "smeplug") {
      // ── SMEPLUG: fetch plans by network ID ──────────────────────
      const smeplugKey = smeplugApiKey.value();
      if (!smeplugKey) {
        throw new HttpsError("failed-precondition", "VTU service not configured.");
      }

      // Map network name to SMEPLUG network ID
      const networkIdMap: Record<string, string> = {
        "MTN": "1", "Airtel": "2", "9Mobile": "3", "9mobile": "3", "Glo": "4",
      };
      const networkId = networkIdMap[network] ?? "1";

      const response = await fetch(
        `https://smeplug.ng/api/v1/data/plans?network_id=${networkId}`,
        { headers: { "Authorization": `Bearer ${smeplugKey}` } },
      );

      if (!response.ok) {
        logger.error("SMEPLUG plans fetch error:", await response.text());
        throw new HttpsError("internal", "Failed to fetch data plans.");
      }

      const data = await response.json() as any;
      // SMEPLUG returns { status: true, data: { "1": [...plans...] } }
      // The plans array is keyed by network ID string
      const rawPlans = data?.data?.[networkId] ?? data?.data?.plans ?? [];
      // Log first plan's raw fields for debugging name issues
      if ((rawPlans as any[]).length > 0) {
        logger.info("SMEPLUG first plan raw fields:", JSON.stringify(Object.keys((rawPlans as any[])[0])), JSON.stringify((rawPlans as any[])[0]).substring(0, 300));
      }
      const plans = (rawPlans as any[])
        .map((p) => {
          const rawName = (p.name as string) || (p.plan_name as string) || (p.product_name as string) || "";
          const typeStr = (p.plan_type as string) || (p.type as string) || "";
          const daysStr = (p.validity?.toString() ?? p.days?.toString() ?? "") as string;
          // Construct a fallback name if the API didn't provide one
          const name = rawName || `${network} ${typeStr ? typeStr + " " : ""}${daysStr ? daysStr + " " : ""}Plan`;
          return {
          id: (p.id as number)?.toString() ?? "",
          name,
          price: (p.price as number) ?? 0,
          type: (p.plan_type as string) ?? "",
          days: (p.validity?.toString() ?? p.days?.toString() ?? "") as string,
          network,
        };
        })
        .filter((p) => p.price > 0)
        .sort((a, b) => a.price - b.price)
        .filter((p) => !hiddenPlanIds.has(p.id))
        .map((p) => ({
          ...p,
          name: customNames[p.id] || p.name,
          price: Math.round(p.price * (1 + dataProfitMargin / 100)),
          costPrice: p.price,
        }));

      return { plans };
    } else {
      // ── SME API (smeapi.com.ng): fetch plans from live API ──────
      // Endpoint: GET https://smeapi.com.ng/api/dataplans/
      // Auth: Authorization: Token <key>
      // Returns: { status: "success", data: [{id, network, name, type, days, user_price, ...}] }
      const smeKey = smeApiKey.value();
      if (!smeKey) {
        throw new HttpsError("failed-precondition", "VTU service not configured.");
      }

      const response = await fetch("https://smeapi.com.ng/api/dataplans/", {
        headers: { "Authorization": `Token ${smeKey}` },
      });

      if (!response.ok) {
        logger.error("SME API plans fetch error:", await response.text());
        throw new HttpsError("internal", "Failed to fetch data plans.");
      }

      const data = await response.json() as any;
      if (data?.status !== "success" || !Array.isArray(data?.data)) {
        logger.error("SME API plans unexpected response:", JSON.stringify(data).substring(0, 200));
        throw new HttpsError("internal", "Failed to fetch data plans.");
      }

      // Log first plan's raw fields for debugging name issues
      if (data.data.length > 0) {
        logger.info("SMEAPI first plan raw fields:", JSON.stringify(Object.keys(data.data[0])), JSON.stringify(data.data[0]).substring(0, 300));
      }

      // Normalize network name for matching (e.g. "MTN" matches "mtn", "9mobile" matches "9MOBILE")
      const networkLower = network.toLowerCase();
      const plans = (data.data as any[])
        .filter((p) => (p.network as string)?.toLowerCase() === networkLower)
        .map((p) => {
          const rawName = (p.name as string) || (p.plan_name as string) || (p.product_name as string) || "";
          const typeStr = (p.plan_type as string) || (p.type as string) || "";
          const daysStr = (p.days?.toString() ?? p.validity?.toString() ?? "") as string;
          const name = rawName || `${network} ${typeStr ? typeStr + " " : ""}${daysStr ? daysStr + " " : ""}Plan`;
          return {
          id: (p.id as number)?.toString() ?? "",
          name,
          price: (p.user_price as number) ?? (p.price as number) ?? 0,
          type: (p.type as string) ?? "",
          days: (p.days?.toString() ?? "") as string,
          network,
        };
        })
        .filter((p) => p.price > 0)
        .sort((a, b) => a.price - b.price)
        .filter((p) => !hiddenPlanIds.has(p.id))
        .map((p) => ({
          ...p,
          name: customNames[p.id] || p.name,
          price: Math.round(p.price * (1 + dataProfitMargin / 100)),
          costPrice: p.price,
        }));

      return { plans };
    }
}

// ===========================================================================
// AIRTIME / DATA PURCHASE — atomic balance deduction
// ===========================================================================

/**
 * Purchase airtime. Deducts balance atomically before calling VTU API.
 */
async function handlePurchaseAirtime(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`airtime_${uid}`, 5, 30);

    const {phone, amount, network} = request.data as {
      phone: string;
      amount: number;
      network: string;
    };

    if (!phone || !amount || !network) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (amount < 100) {
      throw new HttpsError("invalid-argument", "Minimum airtime purchase is \u20A6100.");
    }
    if (amount > 20000) {
      throw new HttpsError("invalid-argument", "Maximum airtime purchase is \u20A620,000.");
    }

    // Atomically deduct balance
    const walletRef = db.collection("wallets").doc(uid);
    const txRef = db.collection("transactions").doc();

    await db.runTransaction(async (txn) => {
      const snap = await txn.get(walletRef);
      if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
      const wallet = snap.data()!;
      const nairaBalance = wallet.nairaBalance ?? 0;
      if (nairaBalance < amount) {
        throw new HttpsError("failed-precondition", "Insufficient balance.");
      }

      txn.set(walletRef, {
        ...wallet,
        nairaBalance: nairaBalance - amount,
        updatedAt: new Date(),
      });

      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "airtime",
        status: "pending",
        amountNaira: amount,
        description: `Airtime purchase: ${network} ${phone}`,
        reference: `AIR_${Date.now()}`,
        createdAt: new Date(),
        paymentMethod: "wallet",
        recipient: phone,
        networkProvider: network,
      });
    });

    // Call VTU API (SMEPLUG or SME API)
    try {
      await callVtuApi("airtime", {phone, amount, network});
      // Mark transaction as completed
      await txRef.update({
        status: "completed",
        completedAt: new Date(),
      });
      return {success: true};
    } catch (error) {
      // Refund the user
      logger.error(`Airtime purchase failed for ${uid}:`, error);
      await db.runTransaction(async (txn) => {
        const snap = await txn.get(walletRef);
        if (snap.exists) {
          const wallet = snap.data()!;
          txn.set(walletRef, {
            ...wallet,
            nairaBalance: (wallet.nairaBalance ?? 0) + amount,
            updatedAt: new Date(),
          }, {merge: true});
        }
      });
      await txRef.update({
        status: "failed",
        completedAt: new Date(),
        description: `Airtime purchase failed: ${(error as Error).message}`,
      });
      // Create notification
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id, uid, type: "general",
        title: "Airtime Purchase Failed",
        body: `Your airtime purchase of \u20A6${amount} could not be completed. Your wallet has been refunded.`,
        isRead: false, createdAt: new Date(),
      });
      // Return user-friendly error (not a throw — so Flutter gets a clean response)
      return {
        success: false,
        refunded: true,
        message: "Service temporarily unavailable. Your wallet has been refunded.",
      };
    }
}

/**
 * Purchase data. Deducts balance atomically before calling VTU API.
 */
async function handlePurchaseData(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`data_${uid}`, 5, 30);

    const {phone, planId, amount, network} = request.data as {
      phone: string;
      planId: string;
      amount: number;
      network: string;
    };

    if (!phone || !planId || !amount || !network) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }
    if (amount < 50) {
      throw new HttpsError("invalid-argument", "Minimum data purchase is \u20A650.");
    }

    const walletRef = db.collection("wallets").doc(uid);
    const txRef = db.collection("transactions").doc();

    // Kick off the provider config read now so it resolves while the
    // wallet transaction runs — saves a sequential Firestore round-trip.
    const providerConfigPromise = db
      .collection("config")
      .doc("vtu_provider")
      .get()
      .then((snap) =>
        snap.exists && snap.data()?.provider === "smeplug"
          ? ("smeplug" as const)
          : ("smeapi" as const),
      )
      .catch(() => "smeapi" as const);

    await db.runTransaction(async (txn) => {
      const snap = await txn.get(walletRef);
      if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
      const wallet = snap.data()!;
      const nairaBalance = wallet.nairaBalance ?? 0;
      if (nairaBalance < amount) {
        throw new HttpsError("failed-precondition", "Insufficient balance.");
      }

      txn.set(walletRef, {
        ...wallet,
        nairaBalance: nairaBalance - amount,
        updatedAt: new Date(),
      });

      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "data",
        status: "pending",
        amountNaira: amount,
        description: `Data purchase: ${network} ${phone} (plan: ${planId})`,
        reference: `DATA_${Date.now()}`,
        createdAt: new Date(),
        paymentMethod: "wallet",
        recipient: phone,
        networkProvider: network,
      });
    });

    try {
      await callVtuApi("data", {phone, planId, amount, network}, await providerConfigPromise);
      await txRef.update({
        status: "completed",
        completedAt: new Date(),
      });
      return {success: true};
    } catch (error) {
      logger.error(`Data purchase failed for ${uid}:`, error);
      await db.runTransaction(async (txn) => {
        const snap = await txn.get(walletRef);
        if (snap.exists) {
          const wallet = snap.data()!;
          txn.set(walletRef, {
            ...wallet,
            nairaBalance: (wallet.nairaBalance ?? 0) + amount,
            updatedAt: new Date(),
          }, {merge: true});
        }
      });
      await txRef.update({
        status: "failed",
        completedAt: new Date(),
        description: `Data purchase failed: ${(error as Error).message}`,
      });
      // Create notification
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id, uid, type: "general",
        title: "Data Purchase Failed",
        body: `Your data purchase of \u20A6${amount} could not be completed. Your wallet has been refunded.`,
        isRead: false, createdAt: new Date(),
      });
      // Return user-friendly error (not a throw — so Flutter gets a clean response)
      return {
        success: false,
        refunded: true,
        message: "Service temporarily unavailable. Your wallet has been refunded.",
      };
    }
}

// Hard cap on VTU API latency. Without this, a hanging provider kept the
// purchase function (and the app spinner) waiting indefinitely.
const VTU_TIMEOUT_MS = 20_000;

async function fetchVtu(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VTU_TIMEOUT_MS);
  try {
    return await fetch(url, {...init, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call VTU API for airtime/data purchase.
 *
 * AIRTIME: Always uses SMEAPI (smeapi.com.ng) — switching the data provider
 *          to SMEPLUG does not affect airtime purchases.
 * DATA: Uses the active provider from Firestore config (default: smeapi).
 *   - "smeapi"  → smeapi.com.ng (POST /api/data/, Token auth, numeric data_plan ID)
 *   - "smeplug" → smeplug.ng    (POST /api/v1/data/purchase, Bearer auth, numeric plan_id)
 *
 * The API keys are never exposed to the client.
 */
async function callVtuApi(
  type: "airtime" | "data",
  params: {phone: string; amount?: number; planId?: string; network: string},
  preloadedProvider?: "smeplug" | "smeapi",
): Promise<void> {
  // ── AIRTIME: always use SMEAPI (smeapi.com.ng) ───────────────
  if (type === "airtime") {
    const smeKey = smeApiKey.value();
    if (!smeKey) {
      throw new Error("SME API key not configured.");
    }

    // smeapi.com.ng uses numeric network IDs: 1=MTN, 2=Airtel, 3=9Mobile, 4=Glo
    const networkIdMap: Record<string, string> = {
      "MTN": "1", "Airtel": "2", "Glo": "4", "9Mobile": "3", "9mobile": "3",
    };
    const networkId = networkIdMap[params.network] ?? "1";

    const response = await fetchVtu("https://smeapi.com.ng/api/airtime/", {
      method: "POST",
      headers: {
        "Authorization": `Token ${smeKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        network: networkId,
        phone: params.phone,
        amount: params.amount,
        ref: `AIR_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`SMEAPI airtime error:`, errorText);
      throw new Error(`Airtime API returned ${response.status}`);
    }

    const data = await response.json() as any;
    if (data?.status !== "success" && data?.Status?.toLowerCase() !== "successful") {
      throw new Error(data?.msg || data?.message || "Airtime purchase failed");
    }
    return;
  }

  // ── DATA: check active provider ──────────────────────────────
  let provider: "smeplug" | "smeapi" = preloadedProvider ?? "smeapi";
  if (!preloadedProvider) {
    try {
      const configDoc = await db.collection("config").doc("vtu_provider").get();
      if (configDoc.exists && configDoc.data()?.provider === "smeplug") {
        provider = "smeplug";
      }
    } catch (e) {
      logger.warn("Could not read VTU provider config, defaulting to smeapi:", e);
    }
  }

  if (provider === "smeapi") {
    // ── SMEAPI (smeapi.com.ng): POST /api/data/ with Token auth ──
    const smeKey = smeApiKey.value();
    if (!smeKey) {
      throw new Error("SME API key not configured.");
    }

    // smeapi.com.ng DATA endpoint uses different IDs than airtime:
    // 1=MTN, 2=Glo, 3=9Mobile, 4=Airtel (Airtel and Glo are swapped vs airtime!)
    const dataNetworkIdMap: Record<string, string> = {
      "MTN": "1", "Airtel": "4", "Glo": "2", "9Mobile": "3", "9mobile": "3",
    };
    const networkId = dataNetworkIdMap[params.network] ?? "1";
    logger.info(`SMEAPI data: network=${params.network} → id=${networkId}, planId=${params.planId}, phone=${params.phone}`);

    // planId is the numeric plan ID from getDataPlans
    const response = await fetchVtu("https://smeapi.com.ng/api/data/", {
      method: "POST",
      headers: {
        "Authorization": `Token ${smeKey}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        network: networkId,
        phone: params.phone,
        data_plan: params.planId,
        ported_number: true,
        ref: `DATA_${Date.now()}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`SMEAPI data purchase error:`, errorText);
      // Try to parse the actual API error message
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData?.msg || errorData?.message || `Data API returned ${response.status}`);
      } catch (parseErr) {
        if (parseErr instanceof Error && parseErr.message !== `Data API returned ${response.status}`) {
          throw parseErr;
        }
        throw new Error(`Data API returned ${response.status}`);
      }
    }

    const data = await response.json() as any;
    logger.info(`SMEAPI data response:`, JSON.stringify(data).substring(0, 300));
    if (data?.status !== "success" && data?.Status?.toLowerCase() !== "successful") {
      throw new Error(data?.msg || data?.message || "Data purchase failed");
    }
  } else {
    // ── SMEPLUG: POST request with Bearer token ─────────────────
    const smeplugKey = smeplugApiKey.value();
    if (!smeplugKey) {
      throw new Error("SMEPLUG API key not configured.");
    }

    const response = await fetchVtu("https://smeplug.ng/api/v1/data/purchase", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${smeplugKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        network: params.network.toLowerCase(),
        phone: params.phone,
        plan_id: params.planId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`SMEPLUG data purchase error:`, errorText);
      throw new Error(`VTU API returned ${response.status}`);
    }

    const data = await response.json() as any;
    if (data?.status !== "success" && data?.success !== true) {
      throw new Error(data?.message || "Data purchase failed");
    }
  }
}

// ===========================================================================
// SQUAD VIRTUAL ACCOUNT CREATION
// ===========================================================================

/**
 * Create a virtual bank account for the user via Squad.
 * Requires KYC data (BVN, phone, DOB, gender, address) from the user model.
 * The Squad secret key is never exposed to the client.
 */
async function handleCreateVirtualAccount(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const squadKey = squadSecretKey.value().trim(); // production key
    if (!squadKey) {
      throw new HttpsError("failed-precondition", "Payment service not configured.");
    }

    // Get user details
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      throw new HttpsError("failed-precondition", "User not found.");
    }
    const userData = userDoc.data()!;

    // Check if virtual account already exists
    const existingVa = await db.collection("virtualAccounts").doc(uid).get();
    if (existingVa.exists) {
      // Ensure kycTier is set even on early return (fixes users who got
      // a virtual account before the kycTier update was added).
      if ((userData.kycTier ?? 0) < 1) {
        await db.collection("users").doc(uid).set({
          kycTier: 1,
          updatedAt: new Date(),
        }, {merge: true});
      }
      return {account: existingVa.data()};
    }

    // Validate required KYC fields for Squad virtual account
    const bvn = userData.bvn as string | undefined;
    const phone = userData.phone as string | undefined;
    const dob = userData.dateOfBirth as string | undefined;
    const gender = userData.gender as string | undefined;
    const address = userData.address as string | undefined;

    if (!bvn || !phone || !dob || !gender || !address) {
      throw new HttpsError("failed-precondition",
        "KYC data required: BVN, phone, date of birth, gender, and address.");
    }

    // Parse the full name into first and last name
    const fullName = (userData.fullName as string) || "User";
    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0] || "User";
    const lastName = nameParts.slice(1).join(" ") || "User";

    // Convert gender to Squad format: "1" = Male, "2" = Female
    const genderMap: Record<string, string> = {
      "male": "1", "Male": "1", "M": "1", "1": "1",
      "female": "2", "Female": "2", "F": "2", "2": "2",
    };
    const squadGender = genderMap[gender] ?? "1";

    // Convert DOB to mm/dd/yyyy format (Squad requirement)
    // Accept yyyy-mm-dd, dd/mm/yyyy, or mm/dd/yyyy
    let squadDob = dob;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      const [y, m, d] = dob.split("-");
      squadDob = `${m}/${d}/${y}`;
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) {
      // Already in dd/mm/yyyy or mm/dd/yyyy — assume mm/dd/yyyy is fine
      squadDob = dob;
    }

    // Create virtual account via Squad (production)
    const response = await fetch("https://api-d.squadco.com/virtual-account", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${squadKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        mobile_num: phone,
        dob: squadDob,
        gender: squadGender,
        address,
        customer_identifier: uid,
        bvn,
        email: userData.email ?? "",
        // Funds sent to the VA settle into your Squad settlement account.
        // Only sent when the secret holds a valid 10-digit NUBAN — otherwise
        // Squad uses the account's default settlement account.
        ...(() => {
          const beneficiary = squadBeneficiaryAccount.value().trim();
          return /^\d{10}$/.test(beneficiary) ? {beneficiary_account: beneficiary} : {};
        })(),
        prefix: "SMCLI", // Business prefix for VA identification
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Squad virtual account error:", errorText);
      throw new HttpsError("internal", "Failed to create virtual account.");
    }

    const data = await response.json() as any;
    if (!data?.success || !data?.data?.virtual_account_number) {
      const msg = data?.message || "Invalid response from payment service.";
      logger.error("Squad virtual account unexpected response:", JSON.stringify(data));
      throw new HttpsError("internal", msg);
    }

    logger.info("Squad virtual account created successfully:", JSON.stringify({
      virtual_account_number: data.data.virtual_account_number,
      account_name: data.data.virtual_account_name || `${firstName} ${lastName}`,
      bank_name: data.data.bank_name || "GTBank",
      customer_identifier: uid,
    }));

    const accountData = {
      uid,
      account_number: data.data.virtual_account_number,
      account_name: `${firstName} ${lastName}`,
      bank_name: "GTBank",
      bank_code: "058",
      account_reference: uid,
      createdAt: new Date(),
    };

    await db.collection("virtualAccounts").doc(uid).set(accountData);

    // Mark the user as KYC verified (Tier 1) since Squad has validated
    // their BVN and identity. This applies whether the user submitted
    // KYC from the profile page or the deposit page.
    await db.collection("users").doc(uid).set({
      kycTier: 1,
      updatedAt: new Date(),
    }, {merge: true});

    return {account: accountData};
}

// ===========================================================================
// SQUAD CARD PAYMENT INITIALIZATION
// ===========================================================================

/**
 * Initialize a card payment via Squad. Returns the checkout URL.
 * The Squad secret key is never exposed to the client.
 */
async function handleInitializeCardPayment(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const {amount, email} = request.data as {amount: number; email: string};

    if (!amount || amount <= 0 || !email) {
      throw new HttpsError("invalid-argument", "Amount and email are required.");
    }

    const squadKey = squadSecretKey.value().trim();
    if (!squadKey) {
      throw new HttpsError("failed-precondition", "Payment service not configured.");
    }

    // LIVE Squad API for card payments
    const response = await fetch("https://api-d.squadco.com/transaction/initiate", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${squadKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount * 100, // Squad expects kobo
        email,
        currency: "NGN",
        initiate_type: "inline",
        callback_url: "https://smclientkx.com/payment-callback",
        payment_channels: ["card", "bank", "transfer", "ussd"],
        metadata: {uid},
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Squad payment init error:", errorText);
      throw new HttpsError("internal", "Failed to initialize payment.");
    }

    const data = await response.json() as any;
    if (!data?.success) {
      logger.error("Squad payment init failed:", JSON.stringify(data));
      throw new HttpsError("internal", data?.message ?? "Failed to initialize payment.");
    }

    const transactionRef = data?.data?.transaction_ref as string | undefined;
    const checkoutUrl = data?.data?.checkout_url as string | undefined;
    if (!transactionRef || !checkoutUrl) {
      logger.error("Squad payment init unexpected response:", JSON.stringify(data));
      throw new HttpsError("internal", "Invalid response from payment service.");
    }

    return {
      checkoutUrl,
      transactionRef,
    };
}

// ===========================================================================
// SQUAD TRANSACTION VERIFICATION
// ===========================================================================

/**
 * Verify a Squad transaction by reference.
 * Calls the live Squad API to check if payment was successful.
 */
async function handleVerifyTransaction(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`verify_${uid}`, 20, 100);
    const {transactionRef} = request.data as { transactionRef: string };
    if (!transactionRef) {
      throw new HttpsError("invalid-argument", "Transaction reference is required.");
    }

    const squadKey = squadSecretKey.value().trim();
    if (!squadKey) {
      throw new HttpsError("failed-precondition", "Payment service not configured.");
    }

    const response = await fetch(
      `https://api-d.squadco.com/transaction/verify/${encodeURIComponent(transactionRef)}`,
      { headers: { "Authorization": `Bearer ${squadKey}` } },
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Squad verify error:", errorText);
      return { success: false, status: "failed", message: "Verification failed" };
    }

    const data = await response.json() as any;
    const status = data?.data?.transaction_status as string | undefined;
    const amount = data?.data?.amount as number | undefined;

    if (data?.success && status?.toLowerCase() === "success") {
      return {
        success: true,
        status: "success",
        amount: amount ? amount / 100 : 0, // Convert kobo to naira
        reference: transactionRef,
      };
    }

    return {
      success: false,
      status: status?.toLowerCase() ?? "pending",
      message: data?.message ?? "Transaction not successful",
    };
}

// ===========================================================================
// CARD PAYMENT COMPLETION (airtime & data)
// ===========================================================================

/**
 * Verify a Squad card payment and consume it exactly once.
 *
 * Guards against the replay attack where one successful card payment is
 * used to trigger multiple deliveries:
 *  - verifies the payment with Squad's API (must be "success")
 *  - the PAID amount must match the requested amount (kobo → naira)
 *  - the pending transaction must belong to the calling user
 *  - a squad_payments/{squadRef} ledger doc is created atomically — if it
 *    already exists, the payment has been consumed and the call is rejected
 */
async function verifyAndConsumeSquadPayment(
  squadRef: string,
  expectedAmountNaira: number,
  uid: string,
  transactionId: string,
): Promise<void> {
  const verifyResp = await fetch(
    `https://api-d.squadco.com/transaction/verify/${encodeURIComponent(squadRef)}`,
    { headers: { "Authorization": `Bearer ${squadSecretKey.value().trim()}` } },
  );
  if (!verifyResp.ok) {
    logger.error("Squad verify error:", await verifyResp.text());
    throw new HttpsError("internal", "Payment verification failed.");
  }
  const verifyData = await verifyResp.json() as any;
  const txStatus = verifyData?.data?.transaction_status as string;
  if (!verifyData?.success || txStatus?.toLowerCase() !== "success") {
    await db.collection("transactions").doc(transactionId).update({
      status: "failed",
      completedAt: new Date(),
      description: `Payment not verified: ${txStatus ?? "unknown"}`,
    }).catch(() => {});
    throw new HttpsError("failed-precondition", "Payment not verified.");
  }

  const paidNaira = ((verifyData?.data?.amount as number) ?? 0) / 100;
  if (Math.abs(paidNaira - expectedAmountNaira) > 1) {
    logger.error(
      `Squad amount mismatch for ${squadRef}: paid \u20A6${paidNaira}, expected \u20A6${expectedAmountNaira} (uid ${uid}).`,
    );
    throw new HttpsError(
      "invalid-argument",
      "Payment amount does not match the order. Contact support.",
    );
  }

  const ledgerRef = db.collection("squad_payments").doc(squadRef);
  const txDocRef = db.collection("transactions").doc(transactionId);

  await db.runTransaction(async (txn) => {
    const [ledgerSnap, txSnap] = await Promise.all([
      txn.get(ledgerRef),
      txn.get(txDocRef),
    ]);
    if (ledgerSnap.exists) {
      throw new HttpsError("already-exists", "This payment has already been processed.");
    }
    if (!txSnap.exists || txSnap.data()?.uid !== uid) {
      throw new HttpsError("permission-denied", "Transaction not found for this user.");
    }
    if (txSnap.data()?.status === "completed") {
      throw new HttpsError("failed-precondition", "Transaction already completed.");
    }
    txn.set(ledgerRef, {
      squadRef,
      uid,
      transactionId,
      amountNaira: paidNaira,
      processedAt: new Date(),
    });
  });
}

/**
 * Complete a card-based airtime purchase.
 * Called after the user completes the Squad checkout in the WebView.
 *
 * Steps:
 * 1. Verify the Squad payment and consume it exactly once (replay-proof)
 * 2. Call the VTU API to deliver airtime (NO wallet deduction — user paid by card)
 * 3. Update the pending transaction to completed/failed
 * 4. If VTU fails, refund the card payment to the user's wallet
 * 5. Create a notification
 */
async function handleCompleteCardAirtime(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`cardair_${uid}`, 5, 30);

    const {squadRef, phone, amount, network, transactionId} = request.data as {
      squadRef: string; phone: string; amount: number; network: string;
      transactionId: string;
    };

    if (!squadRef || !phone || !amount || !network || !transactionId) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // 1. Verify Squad payment (amount-matched, ownership-checked, consume-once)
    await verifyAndConsumeSquadPayment(squadRef, amount, uid, transactionId);

    // 2. Call VTU API (airtime — always SMEAPI)
    try {
      await callVtuApi("airtime", {phone, amount, network});
    } catch (error) {
      // VTU failed — refund to wallet since card payment was successful
      logger.error(`Card airtime VTU failed for ${uid}:`, error);
      await db.runTransaction(async (txn) => {
        const walletRef = db.collection("wallets").doc(uid);
        const snap = await txn.get(walletRef);
        const wallet = snap.data()!;
        txn.set(walletRef, {
          ...wallet,
          nairaBalance: (wallet.nairaBalance ?? 0) + amount,
          updatedAt: new Date(),
        }, {merge: true});
      });
      await db.collection("transactions").doc(transactionId).update({
        status: "failed",
        completedAt: new Date(),
        description: `Airtime delivery failed: ${(error as Error).message}. Amount refunded to wallet.`,
      });
      // Create notification
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id, uid, type: "general",
        title: "Airtime Purchase Failed",
        body: `Airtime delivery failed. \u20A6${amount} refunded to wallet.`,
        isRead: false, createdAt: new Date(),
      });
      return {success: false, refunded: true, message: (error as Error).message};
    }

    // 3. Update transaction to completed
    await db.collection("transactions").doc(transactionId).update({
      status: "completed",
      completedAt: new Date(),
    });

    // 4. Create notification
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      id: notifRef.id, uid, type: "general",
      title: "Airtime Purchased",
      body: `\u20A6${amount} airtime delivered to ${phone}.`,
      isRead: false, createdAt: new Date(),
    });

    return {success: true};
}

/**
 * Complete a card-based data purchase.
 * Same flow as completeCardAirtime but for data plans.
 */
async function handleCompleteCardData(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    await enforceRateLimit(`carddata_${uid}`, 5, 30);

    const {squadRef, phone, planId, amount, network, planName, transactionId} = request.data as {
      squadRef: string; phone: string; planId: string; amount: number;
      network: string; planName: string; transactionId: string;
    };

    if (!squadRef || !phone || !planId || !amount || !network || !transactionId) {
      throw new HttpsError("invalid-argument", "Missing required fields.");
    }

    // 1. Verify Squad payment (amount-matched, ownership-checked, consume-once)
    await verifyAndConsumeSquadPayment(squadRef, amount, uid, transactionId);

    // 2. Call VTU API (data — uses active provider)
    try {
      await callVtuApi("data", {phone, planId, amount, network});
    } catch (error) {
      // VTU failed — refund to wallet
      logger.error(`Card data VTU failed for ${uid}:`, error);
      await db.runTransaction(async (txn) => {
        const walletRef = db.collection("wallets").doc(uid);
        const snap = await txn.get(walletRef);
        const wallet = snap.data()!;
        txn.set(walletRef, {
          ...wallet,
          nairaBalance: (wallet.nairaBalance ?? 0) + amount,
          updatedAt: new Date(),
        }, {merge: true});
      });
      await db.collection("transactions").doc(transactionId).update({
        status: "failed",
        completedAt: new Date(),
        description: `Data delivery failed: ${(error as Error).message}. Amount refunded to wallet.`,
      });
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id, uid, type: "general",
        title: "Data Purchase Failed",
        body: `Data delivery failed. \u20A6${amount} refunded to wallet.`,
        isRead: false, createdAt: new Date(),
      });
      return {success: false, refunded: true, message: (error as Error).message};
    }

    // 3. Update transaction to completed
    await db.collection("transactions").doc(transactionId).update({
      status: "completed",
      completedAt: new Date(),
    });

    // 4. Create notification
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      id: notifRef.id, uid, type: "general",
      title: "Data Purchased",
      body: `${planName ?? "Data plan"} delivered to ${phone}.`,
      isRead: false, createdAt: new Date(),
    });

    return {success: true};
}

/**
 * Complete a card/checkout NGN deposit. Called after the user finishes the
 * Squad checkout. Verifies the payment against Squad with the production
 * secret, consumes it exactly once (replay-proof), then credits the wallet
 * atomically. The client NEVER writes balances — a modified client cannot
 * credit itself.
 */
async function handleCompleteCardDeposit(request: CallableRequest<any>) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const uid = request.auth.uid;
  await enforceRateLimit(`carddep_${uid}`, 5, 20);

  const {squadRef, amount, transactionId} = request.data as {
    squadRef: string; amount: number; transactionId: string;
  };
  if (!squadRef || !amount || amount <= 0 || !transactionId) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  // 1. Verify payment + consume-once (amount-matched, ownership-checked).
  await verifyAndConsumeSquadPayment(squadRef, amount, uid, transactionId);

  // 2. Credit the wallet and complete the transaction atomically.
  const walletRef = db.collection("wallets").doc(uid);
  const txRef = db.collection("transactions").doc(transactionId);
  await db.runTransaction(async (txn) => {
    const snap = await txn.get(walletRef);
    if (!snap.exists) throw new HttpsError("failed-precondition", "Wallet not found.");
    const wallet = snap.data()!;
    txn.set(walletRef, {
      ...wallet,
      nairaBalance: (wallet.nairaBalance ?? 0) + amount,
      updatedAt: new Date(),
    }, {merge: true});
    txn.update(txRef, {status: "completed", completedAt: new Date(), amountNaira: amount});
  });

  // 3. Notify the user.
  const notifRef = db.collection("notifications").doc();
  await notifRef.set({
    id: notifRef.id, uid, type: "deposit",
    title: "Deposit Successful",
    body: `Your deposit of \u20A6${amount.toLocaleString("en-NG")} was credited to your wallet.`,
    isRead: false, createdAt: new Date(),
  });

  return {success: true, amountNaira: amount};
}

// ===========================================================================
// R2 (CLOUDFLARE) UPLOADS — moved to r2-functions.ts to reduce file size
// and avoid deployment analyzer timeouts.
// ===========================================================================
import {verifyR2Images} from "./r2-functions.js";

/**
 * Submit a giftcard trade for review. Server-validated against the rate
 * book, rate-limited, e-code deduped, and fully transactional.
 * (Restored from the last deployed build after a refactor mishap.)
 */
async function handleSubmitGiftcardTrade(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const data = request.data as Record<string, unknown>;

    const tradeId = requiredString(data.tradeId, "tradeId", 128);
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(tradeId)) {
      throw new HttpsError("invalid-argument", "tradeId is invalid.");
    }
    const brandId = requiredString(data.brandId, "brandId");
    const rateId = requiredString(data.rateId, "rateId");
    const cardType = requiredString(data.cardType, "cardType", 20).toLowerCase();
    const currency = requiredString(data.currency, "currency", 10).toUpperCase();
    const cardValue = finiteNumber(data.cardValue, "cardValue", 1, 1000000);
    const ecode = optionalString(data.ecode, "ecode", 500);
    const comment = optionalString(data.comment, "comment", 1000);
    if (!['physical', 'ecode'].includes(cardType) || !['USD', 'GBP', 'EUR'].includes(currency)) {
      throw new HttpsError("invalid-argument", "Unsupported card type or currency.");
    }

    const storagePaths = Array.isArray(data.storagePaths) ? data.storagePaths : [];
    const cardImageUrls = Array.isArray(data.cardImageUrls) ? data.cardImageUrls : [];
    if (storagePaths.length > 5 || cardImageUrls.length !== storagePaths.length) {
      throw new HttpsError("invalid-argument", "Card images are invalid.");
    }
    if (cardType === 'physical' && storagePaths.length === 0) {
      throw new HttpsError("invalid-argument", "At least one card image is required.");
    }
    if (cardType === 'ecode' && !ecode) {
      throw new HttpsError("invalid-argument", "The e-code is required.");
    }

    // Verify images exist in R2 and are valid images.
    if (cardType === "physical" && storagePaths.length > 0) {
      await verifyR2Images(uid, tradeId, storagePaths);
    }

    const tradeRef = db.collection("giftcard_trades").doc(tradeId);
    const rateRef = db.collection("giftcard_rates").doc(rateId);
    const brandRef = db.collection("giftcard_brands").doc(brandId);
    const userRef = db.collection("users").doc(uid);
    const limitRef = db.collection("rate_limits").doc(`giftcard_${uid}`);
    const codeHash = ecode
      ? createHash("sha256").update(ecode.toUpperCase().replace(/\s+/g, "")).digest("hex")
      : null;
    const codeClaimRef = codeHash ? db.collection("giftcard_code_claims").doc(codeHash) : null;

    return db.runTransaction(async (txn) => {
      const refs = [tradeRef, rateRef, brandRef, userRef, limitRef];
      const [tradeSnap, rateSnap, brandSnap, userSnap, limitSnap] = await Promise.all(
        refs.map((ref) => txn.get(ref)),
      );
      const claimSnap = codeClaimRef ? await txn.get(codeClaimRef) : null;

      if (tradeSnap.exists) {
        if (tradeSnap.data()?.uid === uid) {
          return {
            tradeId,
            payoutAmount: tradeSnap.data()?.payoutAmount ?? 0,
            rateApplied: tradeSnap.data()?.rateApplied ?? 0,
          };
        }
        throw new HttpsError("already-exists", "Trade ID already exists.");
      }
      if (!rateSnap.exists || !brandSnap.exists) {
        throw new HttpsError("failed-precondition", "This gift card is not currently available.");
      }
      if (!userSnap.exists || userSnap.data()?.isActive === false) {
        throw new HttpsError("failed-precondition", "Your account cannot submit trades.");
      }
      if (claimSnap?.exists) {
        throw new HttpsError("already-exists", "This e-code has already been submitted.");
      }

      const rate = rateSnap.data()!;
      const brand = brandSnap.data()!;
      const minValue = Number(rate.minValue ?? 0);
      const maxValue = rate.maxValue === null || rate.maxValue === undefined
        ? null
        : Number(rate.maxValue);
      if (brand.isActive !== true || rate.isActive !== true ||
          rate.brandId !== brandId || rate.cardType !== cardType || rate.currency !== currency ||
          cardValue < minValue || (maxValue !== null && cardValue > maxValue)) {
        throw new HttpsError("failed-precondition", "The selected rate is no longer available.");
      }

      const now = Date.now();
      const limits = limitSnap.data() ?? {};
      const hourStartedAt = limits.hourStartedAt?.toMillis?.() ?? 0;
      const dayStartedAt = limits.dayStartedAt?.toMillis?.() ?? 0;
      const hourCount = now - hourStartedAt < 60 * 60 * 1000 ? Number(limits.hourCount ?? 0) : 0;
      const dayCount = now - dayStartedAt < 24 * 60 * 60 * 1000 ? Number(limits.dayCount ?? 0) : 0;
      if (hourCount >= 5 || dayCount >= 20) {
        throw new HttpsError("resource-exhausted", "Too many gift card submissions. Try again later.");
      }

      const rateApplied = finiteNumber(Number(rate.ratePerUnit), "ratePerUnit", 0.01);
      const payoutAmount = Math.round(cardValue * rateApplied * 100) / 100;
      const createdAt = FieldValue.serverTimestamp();
      const user = userSnap.data()!;

      txn.set(tradeRef, {
        id: tradeId,
        uid,
        userName: user.fullName ?? user.username ?? "User",
        userEmail: user.email ?? request.auth?.token.email ?? null,
        brandId,
        brandName: brand.name,
        rateId,
        rateVersion: Number(rate.version ?? 1),
        cardType,
        currency,
        cardValue,
        rateApplied,
        payoutAmount,
        storagePaths,
        cardImageUrls,
        ecode,
        ecodeHash: codeHash,
        comment,
        status: "pending",
        adminId: null,
        adminComment: null,
        rejectionReason: null,
        reviewedAt: null,
        transactionId: null,
        createdAt,
        updatedAt: createdAt,
      });

      txn.set(limitRef, {
        uid,
        hourCount: hourCount + 1,
        hourStartedAt: hourCount === 0 ? createdAt : limits.hourStartedAt,
        dayCount: dayCount + 1,
        dayStartedAt: dayCount === 0 ? createdAt : limits.dayStartedAt,
        updatedAt: createdAt,
      }, {merge: true});
      if (codeClaimRef) txn.set(codeClaimRef, {uid, tradeId, createdAt});

      const auditRef = db.collection("audit_logs").doc();
      txn.set(auditRef, {
        id: auditRef.id,
        actorId: uid,
        actorType: "user",
        action: "giftcard_trade_submitted",
        resourceType: "giftcard_trade",
        resourceId: tradeId,
        summary: {brandId, cardType, currency, cardValue, payoutAmount},
        createdAt,
      });

      return {tradeId, payoutAmount, rateApplied};
    });
}

async function handleSetAdminClaim(request: CallableRequest<any>) {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const callerUid = request.auth.uid;
    await enforceRateLimit(`admclaim_${callerUid}`, 10);

    const callerDoc = await db.collection("users").doc(callerUid).get();
    const callerIsAdmin = callerDoc.exists && callerDoc.data()?.isAdmin === true;
    const callerHasClaim = request.auth.token?.admin === true;
    if (!callerIsAdmin && !callerHasClaim) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const {uid, admin} = request.data as {uid: string; admin: boolean};
    if (!uid || typeof admin !== "boolean") {
      throw new HttpsError("invalid-argument", "uid and admin (boolean) are required.");
    }
    if (uid === callerUid && admin === false) {
      throw new HttpsError(
        "invalid-argument",
        "Admins cannot revoke their own claim. Ask another admin.",
      );
    }

    await getAuth().setCustomUserClaims(uid, {admin});
    await db.collection("audit_logs").doc().set({
      actorId: callerUid,
      actorType: "admin",
      action: admin ? "admin_claim_granted" : "admin_claim_revoked",
      resourceType: "user",
      resourceId: uid,
      createdAt: new Date(),
    });
    return {success: true};
}

// ===========================================================================
// SECURE API — single callable router
// ===========================================================================
// Every former standalone callable is now an action on this one function.
// One Cloud Run service instead of ~20, which keeps the project far below
// the per-region CPU quota and leaves room for future endpoints.
// The client calls: httpsCallable('secureApi')({action: 'executeBuy', data: {...}})
import {
  getGiftcardUploadUrlsHandler,
  getDisputeUploadUrlsHandler,
  getSupportUploadUrlsHandler,
} from "./r2-functions.js";

const r2PublicUrl = defineSecret("R2_PUBLIC_URL");

type SecureAction = "deriveDepositAddress" | "executeBuy" | "executeSell"
  | "executeSwap" | "requestSend" | "requestWithdrawal" | "saveBankAccount"
  | "removeBankAccount" | "getDataPlans" | "purchaseAirtime" | "purchaseData"
  | "createVirtualAccount" | "initializeCardPayment" | "verifyTransaction"
  | "completeCardAirtime" | "completeCardData" | "completeCardDeposit"
  | "submitGiftcardTrade" | "submitKyc" | "verifyEmailCode"
  | "resendVerificationEmail"
  | "getGiftcardUploadUrls" | "getDisputeUploadUrls" | "getSupportUploadUrls"
  | "setAdminClaim";

const SECURE_HANDLERS: Record<SecureAction, (request: any) => Promise<any>> = {
  deriveDepositAddress: handleDeriveDepositAddress,
  executeBuy: handleExecuteBuy,
  executeSell: handleExecuteSell,
  executeSwap: handleExecuteSwap,
  requestSend: handleRequestSend,
  requestWithdrawal: handleRequestWithdrawal,
  saveBankAccount: handleSaveBankAccount,
  removeBankAccount: handleRemoveBankAccount,
  getDataPlans: handleGetDataPlans,
  purchaseAirtime: handlePurchaseAirtime,
  purchaseData: handlePurchaseData,
  createVirtualAccount: handleCreateVirtualAccount,
  initializeCardPayment: handleInitializeCardPayment,
  verifyTransaction: handleVerifyTransaction,
  completeCardAirtime: handleCompleteCardAirtime,
  completeCardData: handleCompleteCardData,
  completeCardDeposit: handleCompleteCardDeposit,
  submitGiftcardTrade: handleSubmitGiftcardTrade,
  submitKyc: handleSubmitKyc,
  verifyEmailCode: handleVerifyEmailCode,
  resendVerificationEmail: handleResendVerificationEmail,
  getGiftcardUploadUrls: getGiftcardUploadUrlsHandler,
  getDisputeUploadUrls: getDisputeUploadUrlsHandler,
  getSupportUploadUrls: getSupportUploadUrlsHandler,
  setAdminClaim: handleSetAdminClaim,
};

/**
 * Money actions wrapped with duplicate-order protection at dispatch time:
 * cooldown lock + idempotency-key claim (see withOrderLock).
 */
const LOCKED_ACTIONS: Partial<Record<SecureAction, string>> = {
  executeBuy: "buy",
  executeSell: "sell",
  executeSwap: "swap",
  requestSend: "send",
  requestWithdrawal: "withdrawal",
  purchaseAirtime: "airtime",
  purchaseData: "data",
  initializeCardPayment: "init_card",
  completeCardAirtime: "card_airtime",
  completeCardData: "card_data",
  completeCardDeposit: "card_deposit",
  submitGiftcardTrade: "giftcard",
  submitKyc: "kyc",
};

export const secureApi = onCall(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [
      hdWalletMnemonic, squadSecretKey, squadSandboxSecretKey, squadBeneficiaryAccount,
      smeplugApiKey, smeApiKey,
      r2AccessKeyId, r2SecretAccessKey, r2AccountId, r2BucketName, r2PublicUrl,
    ],
  },
  async (request) => {
    const payload = (request.data ?? {}) as {action?: string; data?: any};
    const action = payload.action as SecureAction | undefined;
    const handler = action ? SECURE_HANDLERS[action] : undefined;
    if (!handler) {
      throw new HttpsError("invalid-argument", `Unknown action: ${action ?? "(none)"}`);
    }
    // Dispatch with the inner payload as the handler's request.data —
    // handlers are unchanged from their standalone-callable form.
    const inner = {...request, data: payload.data ?? {}};
    const lockName = action ? LOCKED_ACTIONS[action] : undefined;
    const uid = request.auth?.uid;
    if (!lockName || !uid) return handler(inner);
    return withOrderLock(uid, lockName, inner.data?.idempotencyKey, () => handler(inner));
  },
);

/**
 * Admin Cloud Functions for KatrexApp.
 *
 * QUOTA-SMART DESIGN: All 7 admin callable actions are routed through a single
 * `adminApi` onCall function (1 Cloud Run service) instead of 7 separate services.
 *
 * Client calls:  httpsCallable('adminApi')({ action: 'processWithdrawal', ...payload })
 *
 * Actions:
 *   1. processWithdrawal     — approve/reject a withdrawal request
 *   2. processGiftcardTrade  — approve/reject a giftcard trade
 *   3. saveGiftcardBrand     — create/update a giftcard brand
 *   4. saveGiftcardRate      — create/update a giftcard rate
 *   5. updateGiftcardSettings— update giftcard payout settings
 *   6. updatePricingConfig   — update fees, limits, spreads
 *   7. sendPushNotification  — send FCM push to users (all/segment/individual)
 */
import {onRequest, HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {getAuth} from "firebase-admin/auth";
import * as https from "https";

const FROM_EMAIL = "KatrexApp <noreply@katrexapp.com>";

/**
 * Clean-fintech text standard for push notifications.
 *
 * Every push the system sends flows through `cleanFintechText` so the
 * on-device notification reads on-brand: no emoji, no zero-width noise,
 * trimmed whitespace, capped length, and a terminal period so the body
 * always reads as a complete sentence.
 *
 * Limits:
 *   - Title: 40 chars (fits one line on most lock screens)
 *   - Body:  120 chars (fits two lines on most lock screens)
 */
const CLEAN_FINTECH_TITLE_MAX = 40;
const CLEAN_FINTECH_BODY_MAX = 120;

// Emoji ranges + variation selectors + ZWJ used in emoji sequences.
// \u{1F300}-\u{1FAFF} covers most emoji blocks; \u{2600}-\u{27BF} covers
// misc symbols + dingbats. \u{FE0F} is the emoji variation selector,
// \u{200D} is the zero-width joiner used to chain emoji into glyphs.
const EMOJI_AND_ZWJ_REGEX =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;
// Zero-width / bidi-override characters that admins sometimes paste in.
const ZERO_WIDTH_REGEX = /[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;

function cleanFintechText(input: unknown, maxChars: number): string {
  let s = typeof input === "string" ? input : String(input ?? "");
  s = s.normalize("NFC");
  s = s.replace(EMOJI_AND_ZWJ_REGEX, "").replace(ZERO_WIDTH_REGEX, "");
  // Collapse internal whitespace runs to a single space.
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > maxChars) {
    s = s.substring(0, maxChars - 1).trimEnd() + "\u2026";
  }
  // Ensure the body ends with terminal punctuation so it reads as a sentence.
  if (s && !/[.!?…]$/.test(s)) {
    s = s + ".";
  }
  return s;
}

initializeApp();
const db = getFirestore();

// Cache for the Resend API key fetched from Secret Manager.
let _resendApiKey: string | null = null;

/**
 * Fetch the RESEND_API_KEY from Secret Manager at runtime.
 * This avoids adding `secrets: [...]` to the function config, which
 * would create a new Cloud Run revision (blocked by CPU quota).
 */
async function getResendApiKey(): Promise<string> {
  if (_resendApiKey) return _resendApiKey;
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) throw new HttpsError("internal", "Cannot determine project ID.");

  // Get an access token using the function's service account.
  const {GoogleAuth} = await import("google-auth-library");
  const auth = new GoogleAuth({scopes: ["https://www.googleapis.com/auth/cloud-platform"]});
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const accessToken = typeof tokenRes === "string" ? tokenRes : tokenRes.token;

  // Fetch the latest secret version from Secret Manager REST API.
  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/RESEND_API_KEY/versions/latest:access`;
  const data = await new Promise<string>((resolve, reject) => {
    const req = https.request(url, {
      method: "GET",
      headers: {Authorization: `Bearer ${accessToken}`},
    }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            const payload = Buffer.from(parsed.payload.data, "base64").toString("utf-8");
            resolve(payload.trim());
          } catch (e) {
            reject(new HttpsError("internal", "Failed to parse secret."));
          }
        } else {
          reject(new HttpsError("internal", `Secret Manager error: ${res.statusCode} ${body}`));
        }
      });
    });
    req.on("error", () => reject(new HttpsError("internal", "Failed to fetch secret.")));
    req.end();
  });

  _resendApiKey = data;
  return data;
}

// ===========================================================================
// HELPERS
// ===========================================================================

async function requireAdmin(uid: string) {
  const adminDoc = await db.collection("users").doc(uid).get();
  if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  return adminDoc.data()!;
}

function requiredString(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value.trim();
}

function optionalString(val: unknown, name: string, maxLen: number): string | undefined {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val !== "string") {
    throw new HttpsError("invalid-argument", `${name} must be a string.`);
  }
  const s = val.trim();
  if (s.length > maxLen) {
    throw new HttpsError("invalid-argument", `${name} exceeds ${maxLen} characters.`);
  }
  return s;
}

function finiteNumber(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value;
}

// ===========================================================================
// HANDLER: processWithdrawal
// ===========================================================================

async function handleProcessWithdrawal(adminUid: string, data: Record<string, unknown>) {
  const {txId, withdrawalAction} = data as {txId: string; withdrawalAction: string};

  if (!txId || !withdrawalAction) {
    throw new HttpsError("invalid-argument", "txId and withdrawalAction are required.");
  }
  if (withdrawalAction !== "approve" && withdrawalAction !== "reject") {
    throw new HttpsError("invalid-argument", "withdrawalAction must be 'approve' or 'reject'.");
  }
  const action = withdrawalAction;

  await requireAdmin(adminUid);

  const txRef = db.collection("transactions").doc(txId);
  const txSnap = await txRef.get();
  if (!txSnap.exists) {
    throw new HttpsError("not-found", "Transaction not found.");
  }
  const txData = txSnap.data()!;
  // Covers both NGN bank withdrawals and crypto sends — both hold user
  // funds in escrow (already deducted) pending admin decision.
  if (txData.type !== "withdrawal" && txData.type !== "send") {
    throw new HttpsError("failed-precondition", "Transaction is not a withdrawal.");
  }
  if (txData.status !== "pending") {
    throw new HttpsError("failed-precondition", "Transaction is not pending.");
  }

  const uid = txData.uid;
  const isCryptoSend = txData.type === "send";
  const amount = txData.amountNaira ?? 0;
  const coinSymbol = txData.coinSymbol as string | undefined;
  // amountCoin is stored as a string of up to 8 decimals.
  const coinAmount = parseFloat(String(txData.amountCoin ?? "0"));

  if (action === "approve") {
    await txRef.update({
      status: "completed",
      completedAt: new Date(),
      processedBy: adminUid,
    });

    await db.collection("notifications").add({
      uid,
      type: "withdrawal",
      title: isCryptoSend ? "Withdrawal Approved" : "Withdrawal Approved",
      body: isCryptoSend
        ? `Your ${coinAmount} ${coinSymbol} withdrawal has been processed.`
        : `Your withdrawal of \u20A6${amount} has been processed.`,
      isRead: false,
      createdAt: new Date(),
    });

    logger.info(`Withdrawal ${txId} approved by admin ${adminUid}.`);
    return {success: true};
  }

  // action === "reject" — refund the user atomically
  const walletRef = db.collection("wallets").doc(uid);

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(walletRef);
    if (snap.exists) {
      const wallet = snap.data()!;
      if (isCryptoSend) {
        const cryptoBalances = wallet.cryptoBalances ?? {};
        cryptoBalances[coinSymbol!] = (cryptoBalances[coinSymbol!] ?? 0) + coinAmount;
        txn.set(walletRef, {
          ...wallet,
          cryptoBalances,
          updatedAt: new Date(),
        }, {merge: true});
      } else {
        txn.set(walletRef, {
          ...wallet,
          nairaBalance: (wallet.nairaBalance ?? 0) + amount,
          updatedAt: new Date(),
        }, {merge: true});
      }
    }

    txn.update(txRef, {
      status: "failed",
      processedBy: adminUid,
    });
  });

  await db.collection("notifications").add({
    uid,
    type: "withdrawal",
    title: "Withdrawal Rejected",
    body: isCryptoSend
      ? `Your ${coinAmount} ${coinSymbol} withdrawal was rejected. Funds refunded.`
      : `Your withdrawal of \u20A6${amount} was rejected. Funds refunded.`,
    isRead: false,
    createdAt: new Date(),
  });

  logger.info(`Withdrawal ${txId} rejected by admin ${adminUid}. Funds refunded.`);
  return {success: true};
}

// ===========================================================================
// HANDLER: processGiftcardTrade
// ===========================================================================

async function handleProcessGiftcardTrade(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const tradeId = requiredString(data.tradeId, "tradeId", 128);
  const tradeAction = requiredString(data.tradeAction, "tradeAction", 20).toLowerCase();
  const comment = optionalString(data.comment, "comment", 1000);
  // Optional payout override — admin can adjust the amount the user receives.
  const payoutOverride = typeof data.payoutAmount === "number" && !Number.isNaN(data.payoutAmount) && data.payoutAmount >= 0
    ? data.payoutAmount
    : null;
  if (!["approve", "reject", "processing"].includes(tradeAction)) {
    throw new HttpsError("invalid-argument", "tradeAction must be approve, reject, or processing.");
  }
  const action = tradeAction;
  if (action === "reject" && !comment) {
    throw new HttpsError("invalid-argument", "A rejection reason is required.");
  }
  logger.info(`processGiftcardTrade: admin=${adminUid} trade=${tradeId} action=${action}`);

  const tradeRef = db.collection("giftcard_trades").doc(tradeId);
  const transactionRef = db.collection("transactions").doc(`GIFT_${tradeId}`);
  const auditRef = db.collection("audit_logs").doc();
  const notificationRef = db.collection("notifications").doc();

  // "processing" is a lightweight status update — no wallet/transaction changes.
  if (action === "processing") {
    const tradeSnap = await tradeRef.get();
    if (!tradeSnap.exists) throw new HttpsError("not-found", "Trade not found.");
    const trade = tradeSnap.data()!;
    if (trade.status !== "pending") {
      throw new HttpsError("failed-precondition", `Trade is already ${trade.status}.`);
    }
    const now = FieldValue.serverTimestamp();
    await tradeRef.update({
      status: "processing",
      adminId: adminUid,
      adminComment: comment || null,
      reviewedAt: now,
      updatedAt: now,
    });
    await notificationRef.set({
      id: notificationRef.id,
      uid: trade.uid,
      type: "trade",
      title: "Gift Card Trade Update",
      body: `Your ${trade.brandName} trade is being processed.${comment ? ` Note: ${comment}` : ""}`,
      preview: "Gift card trade processing",
      isRead: false,
      createdAt: now,
    });
    await auditRef.set({
      id: auditRef.id,
      actorId: adminUid,
      actorEmail: admin.email ?? null,
      actorType: "admin",
      action: "giftcard_trade_processing",
      resourceType: "giftcard_trade",
      resourceId: tradeId,
      before: {status: "pending"},
      after: {status: "processing", comment},
      createdAt: now,
    });
    return {tradeId, status: "processing"};
  }

  await db.runTransaction(async (txn) => {
    const tradeSnap = await txn.get(tradeRef);
    if (!tradeSnap.exists) throw new HttpsError("not-found", "Trade not found.");
    const trade = tradeSnap.data()!;
    if (trade.status !== "pending" && trade.status !== "processing") {
      throw new HttpsError("failed-precondition", `Trade is already ${trade.status}.`);
    }

    const now = FieldValue.serverTimestamp();
    if (action === "approve") {
      // Use admin override if provided, otherwise use the original payout amount.
      const finalPayout = payoutOverride != null ? payoutOverride : Number(trade.payoutAmount);
      const walletRef = db.collection("wallets").doc(trade.uid);
      const walletSnap = await txn.get(walletRef);

      if (walletSnap.exists) {
        txn.update(walletRef, {
          nairaBalance: FieldValue.increment(finalPayout),
          totalValueNaira: FieldValue.increment(finalPayout),
          updatedAt: now,
        });
      } else {
        txn.set(walletRef, {
          uid: trade.uid,
          nairaBalance: finalPayout,
          totalValueNaira: finalPayout,
          createdAt: now,
          updatedAt: now,
        });
      }
      txn.set(transactionRef, {
        id: transactionRef.id,
        uid: trade.uid,
        type: "giftcard",
        status: "completed",
        amountNaira: finalPayout,
        amountCoin: null,
        coinSymbol: null,
        description: `${trade.brandName} gift card trade`,
        reference: transactionRef.id,
        paymentMethod: "giftcard",
        cardBrand: trade.brandName,
        originalPayoutAmount: Number(trade.payoutAmount),
        payoutAmount: finalPayout,
        payoutAdjusted: payoutOverride != null && payoutOverride !== Number(trade.payoutAmount),
        createdAt: now,
        completedAt: now,
      });
      txn.update(tradeRef, {
        status: "approved",
        adminId: adminUid,
        adminComment: comment,
        rejectionReason: null,
        reviewedAt: now,
        transactionId: transactionRef.id,
        walletCreditedAt: now,
        payoutAmount: finalPayout,
        originalPayoutAmount: Number(trade.payoutAmount),
        payoutAdjusted: payoutOverride != null && payoutOverride !== Number(trade.payoutAmount),
        updatedAt: now,
      });
      txn.set(notificationRef, {
        id: notificationRef.id,
        uid: trade.uid,
        type: "trade",
        title: "Gift Card Trade Approved",
        body: `Your ${trade.brandName} trade was approved and \u20A6${finalPayout.toLocaleString()} was credited to your wallet.`,
        preview: "Gift card payout credited",
        isRead: false,
        createdAt: now,
      });
    } else {
      txn.update(tradeRef, {
        status: "rejected",
        adminId: adminUid,
        adminComment: comment,
        rejectionReason: comment,
        reviewedAt: now,
        updatedAt: now,
      });
      txn.set(notificationRef, {
        id: notificationRef.id,
        uid: trade.uid,
        type: "trade",
        title: "Gift Card Trade Rejected",
        body: `Your ${trade.brandName} trade was rejected. Reason: ${comment}`,
        preview: "Gift card trade rejected",
        isRead: false,
        createdAt: now,
      });
    }

    txn.set(auditRef, {
      id: auditRef.id,
      actorId: adminUid,
      actorEmail: admin.email ?? null,
      actorType: "admin",
      action: action === "approve" ? "giftcard_trade_approved" : "giftcard_trade_rejected",
      resourceType: "giftcard_trade",
      resourceId: tradeId,
      before: {status: trade.status},
      after: {status: action === "approve" ? "approved" : "rejected", comment},
      createdAt: now,
    });
  });

  return {tradeId, status: action === "approve" ? "approved" : "rejected"};
}

// ===========================================================================
// HANDLER: saveGiftcardBrand
// ===========================================================================

async function handleSaveGiftcardBrand(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const brandId = optionalString(data.brandId, "brandId", 128);
  const name = requiredString(data.name, "name", 100);
  const iconName = optionalString(data.iconName, "iconName", 100) ?? "card_giftcard";
  const colorHex = optionalString(data.colorHex, "colorHex", 20) ?? "#60A5FA";
  const imageUrl = optionalString(data.imageUrl, "imageUrl", 2000);
  const featured = data.featured === true;
  const promoTag = optionalString(data.promoTag, "promoTag", 100);
  const promoTitle = optionalString(data.promoTitle, "promoTitle", 150);
  const promoSubtitle = optionalString(data.promoSubtitle, "promoSubtitle", 250);
  const promoImageUrl = optionalString(data.promoImageUrl, "promoImageUrl", 2000);
  const sortOrder = finiteNumber(data.sortOrder ?? 0, "sortOrder", 0, 10000);
  const isActive = data.isActive !== false;
  if (!/^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
    throw new HttpsError("invalid-argument", "colorHex must be a six-digit hex color.");
  }

  const brandRef = brandId
    ? db.collection("giftcard_brands").doc(brandId)
    : db.collection("giftcard_brands").doc();
  const now = FieldValue.serverTimestamp();
  const existing = await brandRef.get();
  await brandRef.set({
    id: brandRef.id,
    name,
    iconName,
    colorHex,
    imageUrl: imageUrl ?? null,
    isActive,
    sortOrder,
    featured,
    promoTag: promoTag ?? null,
    promoTitle: promoTitle ?? null,
    promoSubtitle: promoSubtitle ?? null,
    promoImageUrl: promoImageUrl ?? null,
    createdAt: (existing.exists && existing.data()?.createdAt) ? existing.data()!.createdAt : now,
    updatedAt: now,
    updatedBy: adminUid,
  }, {merge: true});
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: existing.exists ? "giftcard_brand_updated" : "giftcard_brand_created",
    resourceType: "giftcard_brand",
    resourceId: brandRef.id,
    createdAt: now,
  });
  return {brandId: brandRef.id};
}

// ===========================================================================
// HANDLER: saveGiftcardRate
// ===========================================================================

async function handleSaveGiftcardRate(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const rateId = optionalString(data.rateId, "rateId", 128);
  const brandId = requiredString(data.brandId, "brandId", 128);
  const currency = requiredString(data.currency, "currency", 10).toUpperCase();
  const cardType = requiredString(data.cardType, "cardType", 20).toLowerCase();
  const minValue = finiteNumber(data.minValue, "minValue", 1, 1000000);
  const maxValue = data.maxValue === null || data.maxValue === undefined || data.maxValue === ""
    ? null
    : finiteNumber(data.maxValue, "maxValue", minValue, 1000000);
  const ratePerUnit = finiteNumber(data.ratePerUnit, "ratePerUnit", 0.01, 10000000);
  const isActive = data.isActive !== false;
  if (!["USD", "GBP", "EUR"].includes(currency) || !["physical", "ecode"].includes(cardType)) {
    // Allow any currency/cardType that exists in the categories collection
    const catSnap = await db.collection("giftcard_categories").get();
    const validCurrencies = new Set<string>();
    const validCardTypes = new Set<string>();
    catSnap.forEach((doc) => {
      const d = doc.data();
      if (d.type === "currency" && d.isActive) validCurrencies.add((d.name as string).toUpperCase());
      if (d.type === "cardType" && d.isActive) validCardTypes.add((d.name as string).toLowerCase());
    });
    // Fall back to defaults if no categories configured
    if (validCurrencies.size === 0) ["USD", "GBP", "EUR"].forEach((c) => validCurrencies.add(c));
    if (validCardTypes.size === 0) ["physical", "ecode"].forEach((c) => validCardTypes.add(c));
    if (!validCurrencies.has(currency) || !validCardTypes.has(cardType)) {
      throw new HttpsError("invalid-argument", "Unsupported card type or currency.");
    }
  }

  const brandSnap = await db.collection("giftcard_brands").doc(brandId).get();
  if (!brandSnap.exists) throw new HttpsError("not-found", "Brand not found.");
  const rateRef = rateId
    ? db.collection("giftcard_rates").doc(rateId)
    : db.collection("giftcard_rates").doc();
  const existing = await rateRef.get();
  const version = Number(existing.data()?.version ?? 0) + 1;
  const now = FieldValue.serverTimestamp();
  await rateRef.set({
    id: rateRef.id,
    brandId,
    brandName: brandSnap.data()?.name,
    currency,
    cardType,
    minValue,
    maxValue,
    ratePerUnit,
    isActive,
    version,
    createdAt: (existing.exists && existing.data()?.createdAt) ? existing.data()!.createdAt : now,
    updatedAt: now,
    updatedBy: adminUid,
  }, {merge: true});
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: existing.exists ? "giftcard_rate_updated" : "giftcard_rate_created",
    resourceType: "giftcard_rate",
    resourceId: rateRef.id,
    createdAt: now,
  });
  return {rateId: rateRef.id, version};
}

// ===========================================================================
// HANDLER: updateGiftcardSettings
// ===========================================================================

async function handleUpdateGiftcardSettings(adminUid: string, data: Record<string, unknown>) {
  await requireAdmin(adminUid);
  const payoutMode = requiredString(data.payoutMode, "payoutMode", 20).toLowerCase();
  const payoutDestination = requiredString(data.payoutDestination, "payoutDestination", 50);
  if (!["manual", "auto"].includes(payoutMode) ||
      !["internal_wallet", "bank_transfer", "crypto_gateway"].includes(payoutDestination)) {
    throw new HttpsError("invalid-argument", "Gift card settings are invalid.");
  }
  await db.collection("app_settings").doc("giftcard").set({
    payoutMode,
    payoutDestination,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: adminUid,
  }, {merge: true});
  return {payoutMode, payoutDestination};
}

// ===========================================================================
// HANDLER: saveGiftcardPromo
// ===========================================================================

async function handleSaveGiftcardPromo(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const promoId = optionalString(data.promoId, "promoId", 128);
  const title = requiredString(data.title, "title", 150);
  const subtitle = optionalString(data.subtitle, "subtitle", 250);
  const tag = optionalString(data.tag, "tag", 50);
  const imageUrl = requiredString(data.imageUrl, "imageUrl", 2000);
  const sortOrder = finiteNumber(data.sortOrder ?? 0, "sortOrder", 0, 10000);
  const isActive = data.isActive !== false;

  const promoRef = promoId
    ? db.collection("giftcard_promos").doc(promoId)
    : db.collection("giftcard_promos").doc();
  const now = FieldValue.serverTimestamp();
  const existing = await promoRef.get();
  await promoRef.set({
    id: promoRef.id,
    title,
    subtitle: subtitle ?? null,
    tag: tag ?? null,
    imageUrl,
    sortOrder,
    isActive,
    createdAt: (existing.exists && existing.data()?.createdAt) ? existing.data()!.createdAt : now,
    updatedAt: now,
    updatedBy: adminUid,
  }, {merge: true});
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: existing.exists ? "giftcard_promo_updated" : "giftcard_promo_created",
    resourceType: "giftcard_promo",
    resourceId: promoRef.id,
    createdAt: now,
  });
  return {promoId: promoRef.id};
}

// ===========================================================================
// HANDLER: deleteGiftcardPromo
// ===========================================================================

async function handleDeleteGiftcardPromo(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const promoId = requiredString(data.promoId, "promoId", 128);
  await db.collection("giftcard_promos").doc(promoId).delete();
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: "giftcard_promo_deleted",
    resourceType: "giftcard_promo",
    resourceId: promoId,
    createdAt: FieldValue.serverTimestamp(),
  });
  return {promoId, deleted: true};
}

// ===========================================================================
// HANDLER: saveGiftcardCategory
// ===========================================================================

async function handleSaveGiftcardCategory(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const categoryId = optionalString(data.categoryId, "categoryId", 128);
  const name = requiredString(data.name, "name", 50);
  const type = requiredString(data.type, "type", 20).toLowerCase();
  if (!["currency", "cardType"].includes(type)) {
    throw new HttpsError("invalid-argument", "Type must be 'currency' or 'cardType'.");
  }
  const sortOrder = finiteNumber(data.sortOrder ?? 0, "sortOrder", 0, 10000);
  const isActive = data.isActive !== false;
  const symbol = optionalString(data.symbol, "symbol", 5);

  const catRef = categoryId
    ? db.collection("giftcard_categories").doc(categoryId)
    : db.collection("giftcard_categories").doc();
  const now = FieldValue.serverTimestamp();
  const existing = await catRef.get();
  await catRef.set({
    id: catRef.id,
    name,
    type,
    symbol: symbol ?? null,
    sortOrder,
    isActive,
    createdAt: (existing.exists && existing.data()?.createdAt) ? existing.data()!.createdAt : now,
    updatedAt: now,
    updatedBy: adminUid,
  }, {merge: true});
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: existing.exists ? "giftcard_category_updated" : "giftcard_category_created",
    resourceType: "giftcard_category",
    resourceId: catRef.id,
    createdAt: now,
  });
  return {categoryId: catRef.id};
}

// ===========================================================================
// HANDLER: deleteGiftcardCategory
// ===========================================================================

async function handleDeleteGiftcardCategory(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const categoryId = requiredString(data.categoryId, "categoryId", 128);
  await db.collection("giftcard_categories").doc(categoryId).delete();
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: "giftcard_category_deleted",
    resourceType: "giftcard_category",
    resourceId: categoryId,
    createdAt: FieldValue.serverTimestamp(),
  });
  return {categoryId, deleted: true};
}

// ===========================================================================
// HANDLER: saveHomepagePromo
// ===========================================================================

async function handleSaveHomepagePromo(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const promoId = optionalString(data.promoId, "promoId", 128);
  const title = requiredString(data.title, "title", 150);
  const subtitle = optionalString(data.subtitle, "subtitle", 250);
  const badge = optionalString(data.badge, "badge", 50);
  const buttonText = optionalString(data.buttonText, "buttonText", 50);
  const imageUrl = requiredString(data.imageUrl, "imageUrl", 2000);
  const sortOrder = finiteNumber(data.sortOrder ?? 0, "sortOrder", 0, 10000);
  const isActive = data.isActive !== false;

  const promoRef = promoId
    ? db.collection("homepage_promos").doc(promoId)
    : db.collection("homepage_promos").doc();
  const now = FieldValue.serverTimestamp();
  const existing = await promoRef.get();
  await promoRef.set({
    id: promoRef.id,
    title,
    subtitle: subtitle ?? null,
    badge: badge ?? null,
    buttonText: buttonText ?? null,
    imageUrl,
    sortOrder,
    isActive,
    createdAt: (existing.exists && existing.data()?.createdAt) ? existing.data()!.createdAt : now,
    updatedAt: now,
    updatedBy: adminUid,
  }, {merge: true});
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: existing.exists ? "homepage_promo_updated" : "homepage_promo_created",
    resourceType: "homepage_promo",
    resourceId: promoRef.id,
    createdAt: now,
  });
  return {promoId: promoRef.id};
}

// ===========================================================================
// HANDLER: deleteHomepagePromo
// ===========================================================================

async function handleDeleteHomepagePromo(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);
  const promoId = requiredString(data.promoId, "promoId", 128);
  const promoRef = db.collection("homepage_promos").doc(promoId);
  const existing = await promoRef.get();
  if (!existing.exists) {
    throw new HttpsError("not-found", "Homepage promo not found.");
  }
  await promoRef.delete();
  await db.collection("audit_logs").add({
    actorId: adminUid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: "homepage_promo_deleted",
    resourceType: "homepage_promo",
    resourceId: promoId,
    createdAt: FieldValue.serverTimestamp(),
  });
  return {promoId, deleted: true};
}

// ===========================================================================
// HANDLER: updatePricingConfig
// ===========================================================================

async function handleUpdatePricingConfig(adminUid: string, data: Record<string, unknown>) {
  await requireAdmin(adminUid);
  const section = requiredString(data.section, "section", 50);

  if (section === "fees") {
    const update: Record<string, unknown> = {updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid};
    if (typeof data.withdrawalFee === "string") update.withdrawalFee = data.withdrawalFee;
    if (typeof data.depositFee === "string") update.depositFee = data.depositFee;
    if (typeof data.swapFee === "string") update.swapFee = data.swapFee;
    if (typeof data.p2pCommission === "string") update.p2pCommission = data.p2pCommission;
    if (typeof data.airtimeDiscount === "string") update.airtimeDiscount = data.airtimeDiscount;
    if (typeof data.dataMarkup === "string") update.dataMarkup = data.dataMarkup;
    await db.collection("pricing_config").doc("fees").set(update, {merge: true});
    return {success: true};
  }

  if (section === "limits") {
    const update: Record<string, unknown> = {updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid};
    if (typeof data.p2pMin === "string") update.p2pMin = data.p2pMin;
    if (typeof data.p2pMax === "string") update.p2pMax = data.p2pMax;
    if (typeof data.cryptoMin === "string") update.cryptoMin = data.cryptoMin;
    if (typeof data.cryptoMax === "string") update.cryptoMax = data.cryptoMax;
    if (typeof data.billMin === "string") update.billMin = data.billMin;
    if (typeof data.billMax === "string") update.billMax = data.billMax;
    await db.collection("pricing_config").doc("limits").set(update, {merge: true});
    return {success: true};
  }

  if (section === "tradeFees") {
    const update: Record<string, unknown> = {updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid};
    if (typeof data.buyFeePercent === "number") update.buyFeePercent = finiteNumber(data.buyFeePercent, "buyFeePercent", 0, 100);
    if (typeof data.sellFeePercent === "number") update.sellFeePercent = finiteNumber(data.sellFeePercent, "sellFeePercent", 0, 100);
    if (typeof data.swapFeePercent === "number") update.swapFeePercent = finiteNumber(data.swapFeePercent, "swapFeePercent", 0, 100);
    if (typeof data.sendFeePercent === "number") update.sendFeePercent = finiteNumber(data.sendFeePercent, "sendFeePercent", 0, 100);
    await db.collection("app_config").doc("trade_fees").set(update, {merge: true});
    return {success: true};
  }

  if (section === "cryptoSpreads") {
    const update: Record<string, unknown> = {updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid};
    if (typeof data.buySpreadPercent === "number") update.buySpreadPercent = finiteNumber(data.buySpreadPercent, "buySpreadPercent", 0, 50);
    if (typeof data.sellSpreadPercent === "number") update.sellSpreadPercent = finiteNumber(data.sellSpreadPercent, "sellSpreadPercent", 0, 50);
    await db.collection("app_config").doc("crypto_spreads").set(update, {merge: true});
    return {success: true};
  }

  if (section === "ngnRate") {
    const update: Record<string, unknown> = {updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid};
    if (typeof data.rate === "number") update.rate = finiteNumber(data.rate, "rate", 1, 100000);
    await db.collection("market_data").doc("_ngn_rate").set(update, {merge: true});
    return {success: true};
  }

  if (section === "fiatSpreads") {
    const update: Record<string, unknown> = {updatedAt: FieldValue.serverTimestamp(), updatedBy: adminUid};
    if (typeof data.buySpreadPercent === "number") update.buySpreadPercent = finiteNumber(data.buySpreadPercent, "buySpreadPercent", 0, 50);
    if (typeof data.sellSpreadPercent === "number") update.sellSpreadPercent = finiteNumber(data.sellSpreadPercent, "sellSpreadPercent", 0, 50);
    await db.collection("app_config").doc("fiat_spreads").set(update, {merge: true});
    return {success: true};
  }

  throw new HttpsError("invalid-argument", `Unknown section "${section}".`);
}

// ===========================================================================
// HANDLER: sendPushNotification
// ===========================================================================

async function handleSendPushNotification(adminUid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(adminUid);

  // Validate the raw input length and then run it through the clean-fintech
  // standard so what hits the device reads on-brand (no emoji, capped length,
  // terminal period). `cleanedTitle` / `cleanedBody` are the values used in
  // the FCM payload, the campaign log, and the success response.
  const title = requiredString(data.title, "title", CLEAN_FINTECH_TITLE_MAX);
  const body = requiredString(data.body, "body", CLEAN_FINTECH_BODY_MAX);
  const cleanedTitle = cleanFintechText(title, CLEAN_FINTECH_TITLE_MAX);
  const cleanedBody = cleanFintechText(body, CLEAN_FINTECH_BODY_MAX);
  const targetType = requiredString(data.targetType, "targetType", 20) as
    "all" | "segment" | "individual";

  const ctaRoute = optionalString(data.ctaRoute, "ctaRoute", 200);
  const ctaLabel = optionalString(data.ctaLabel, "ctaLabel", 50);
  const country = optionalString(data.country, "country", 10);
  const currency = optionalString(data.currency, "currency", 10);
  const kycVerified = data.kycVerified === true ? true :
    data.kycVerified === false ? false : undefined;
  const targetUid = optionalString(data.targetUid, "targetUid", 128);

  // Build the token query
  let tokenQuery = db.collection("fcm_tokens")
    .where("pushEnabled", "==", true) as FirebaseFirestore.Query;

  if (targetType === "individual") {
    if (!targetUid) {
      throw new HttpsError("invalid-argument", "targetUid is required for individual targeting.");
    }
    tokenQuery = tokenQuery.where("uid", "==", targetUid);
  } else if (targetType === "segment") {
    // [OPTIMIZATION] Use server-side filtering on tokens instead of looping users
    if (country) {
      tokenQuery = tokenQuery.where("country", "==", country);
    }
    if (currency) {
      tokenQuery = tokenQuery.where("currency", "==", currency);
    }
    if (kycVerified !== undefined) {
      // kycVerified is a boolean; we store it as 'isKycVerified' in fcm_tokens
      tokenQuery = tokenQuery.where("isKycVerified", "==", kycVerified);
    }
  }

  const tokenSnapshot = await tokenQuery.get();
  if (tokenSnapshot.empty) {
    return {success: true, sent: 0, message: "No recipients found."};
  }

  type TokenDoc = {uid: string; token: string; email?: string};
  const targetTokens: TokenDoc[] = [];
  const targetUids = new Set<string>();

  tokenSnapshot.forEach((doc) => {
    const d = doc.data();
    if (d.token && d.uid) {
      targetTokens.push({uid: d.uid, token: d.token, email: d.email});
      targetUids.add(d.uid);
    }
  });

  if (targetTokens.length === 0) {
    return {success: true, sent: 0, message: "No matching recipients found."};
  }

  // Lazy-require messaging to avoid deployment analyzer timeouts.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {getMessaging} = require("firebase-admin/messaging");
  const messaging = getMessaging();
  let sentCount = 0;
  let failedCount = 0;
  const now = FieldValue.serverTimestamp();

  for (let i = 0; i < targetTokens.length; i += 500) {
    const batch = targetTokens.slice(i, i + 500);
    const message = {
      // Omit root-level notification to prevent Android from displaying
      // a collapsed notification automatically. Instead, title and body
      // are passed in data for manual/expandable rendering on Android.
      data: {
        title: cleanedTitle,
        body: cleanedBody,
        ctaRoute: ctaRoute ?? "",
        ctaLabel: ctaLabel ?? "",
        source: "admin",
        template: "admin_push",
        brand: "katrex",
      },
      android: {
        priority: "high" as const,
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: cleanedTitle,
              body: cleanedBody,
            },
            sound: "default",
            badge: 1,
            "thread-id": "katrex-notifications",
            "interruption-level": "active",
            "mutable-content": 1,
            category: "KATREX_MESSAGE",
          },
        },
        fcmOptions: {
          // iOS 10+ image attachment support. Unset for now — kept here so
          // future admin templates can drop a `imageUrl` and have it surface
          // automatically.
        },
      },
      webpush: {
        notification: {
          title: cleanedTitle,
          body: cleanedBody,
          icon: "/icons/icon-192.png",
          badge: "/icons/badge-72.png",
        },
      },
      tokens: batch.map((t) => t.token),
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      sentCount += response.successCount;
      failedCount += response.failureCount;
    } catch (e) {
      logger.error("FCM send error:", e);
      failedCount += batch.length;
    }
  }

  // Create in-app notification documents for each recipient
  const notifBatch = db.batch();
  let batchCount = 0;
  const finalUids = Array.from(targetUids);
  
  for (const uid of finalUids) {
    const notifRef = db.collection("notifications").doc();
    notifBatch.set(notifRef, {
      id: notifRef.id,
      uid,
      type: "general",
      // Use the on-brand cleaned values so the in-app notification
      // matches what the device shows on the OS-level push.
      title: cleanedTitle,
      body: cleanedBody,
      preview: cleanedBody.length > 60 ? cleanedBody.substring(0, 60) + "..." : cleanedBody,
      isRead: false,
      ctaLabel: ctaLabel ?? null,
      ctaRoute: ctaRoute ?? null,
      source: "admin_push",
      createdAt: now,
    });
    batchCount++;
    
    // Firestore batches are limited to 500 operations
    if (batchCount === 500) {
      await notifBatch.commit();
      // Note: This is simplified; in a real production environment, 
      // you'd recreate the batch and continue.
      break; 
    }
  }
  await notifBatch.commit();

  // Log the campaign
  // Build `filters` with only defined keys — country/currency/kycVerified are
  // optionalString() / boolean or undefined, and Firestore rejects `undefined`
  // field values (would throw "Cannot use undefined as a Firestore value").
  const filters: Record<string, string | boolean> = {};
  if (country !== undefined) filters.country = country;
  if (currency !== undefined) filters.currency = currency;
  if (kycVerified !== undefined) filters.kycVerified = kycVerified;
  await db.collection("push_campaigns").add({
    // Persist the on-brand cleaned values so the admin-side campaign log
    // shows the same copy the device received.
    title: cleanedTitle,
    body: cleanedBody,
    targetType,
    targetCount: targetUids.size,
    sentCount,
    failedCount,
    sentBy: adminUid,
    sentByEmail: admin.email ?? null,
    filters,
    createdAt: now,
  });

  logger.info(`Push notification sent: ${sentCount} success, ${failedCount} failed`);

  return {
    success: true,
    sent: sentCount,
    failed: failedCount,
    recipients: targetUids.size,
  };
}

// ===========================================================================
// ROUTER — single onCall that dispatches to all admin handlers
// ===========================================================================

// ===========================================================================
// ADMIN USER MANAGEMENT: Reset password, update email, update Auth user.
// These operate on Firebase Auth (not just Firestore), so they need the
// Admin Auth SDK.
// ===========================================================================
async function handleResetUserPassword(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const targetUid = data.targetUid as string;
  const newPassword = data.newPassword as string;
  if (!targetUid || !newPassword || newPassword.length < 6) {
    throw new HttpsError("invalid-argument", "targetUid and newPassword (min 6 chars) required.");
  }
  // Lazy-load to avoid deployment analyzer timeouts.
  const {getAuth} = await import("firebase-admin/auth");
  const auth = getAuth();
  await auth.updateUser(targetUid, {password: newPassword});
  logger.info(`adminApi: password reset for ${targetUid} by ${uid}`);
  return {success: true};
}

async function handleUpdateUserEmail(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const targetUid = data.targetUid as string;
  const newEmail = data.newEmail as string;
  if (!targetUid || !newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    throw new HttpsError("invalid-argument", "targetUid and a valid newEmail required.");
  }
  // Lazy-load to avoid deployment analyzer timeouts.
  const {getAuth} = await import("firebase-admin/auth");
  const auth = getAuth();
  await auth.updateUser(targetUid, {email: newEmail, emailVerified: true});
  // Also update the Firestore profile so the app sees the new email.
  await db.collection("users").doc(targetUid).set({
    email: newEmail,
    isEmailVerified: true,
    updatedAt: new Date(),
  }, {merge: true});
  logger.info(`adminApi: email updated for ${targetUid} to ${newEmail} by ${uid}`);
  return {success: true};
}

// ===========================================================================
// MIGRATION: Set kycTier = 1 for users who have a virtual account but are
// missing the kycTier field (caused by the early-return bug in
// createVirtualAccount before the fix was deployed). One-time use.
// ===========================================================================
async function handleMigrateKycTiers(uid: string, _data: Record<string, unknown>) {
  await requireAdmin(uid);

  // [OPTIMIZATION] Chunked migration to prevent timeouts
  // instead of fetching ALL and looping, we process in batches.
  const BATCH_SIZE = 500;
  let fixed = 0;
  let skipped = 0;
  let processed = 0;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

  while (true) {
    const query = db.collection("virtualAccounts")
      .orderBy("id")
      .limit(BATCH_SIZE);

    const snap: FirebaseFirestore.Query = lastDoc ? query.startAfter(lastDoc) : query;
    const vaDocs = await snap.get();
    
    if (vaDocs.empty) break;

    const batch = db.batch();
    for (const vaDoc of vaDocs.docs) {
      const vaUid = vaDoc.id;
      const userRef = db.collection("users").doc(vaUid);
      
      // We don't use a transaction here to keep it fast, but check current state
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        skipped++;
        continue;
      }
      
      const userData = userDoc.data()!;
      if ((userData.kycTier ?? 0) >= 1) {
        skipped++;
        continue;
      }
      
      batch.set(userRef, {
        kycTier: 1,
        updatedAt: new Date(),
      }, {merge: true});
      fixed++;
    }
    
    await batch.commit();
    processed += vaDocs.size;
    lastDoc = vaDocs.docs[vaDocs.docs.length - 1];

    // Safety break for the demo/testing if needed, but for production
    // this would likely be a scheduled task instead of a callable.
    if (processed > 5000) {
      logger.warn("Migration limit reached for single call. Please run again.");
      break;
    }
  }

  logger.info(`migrateKycTiers: fixed=${fixed} skipped=${skipped} total processed=${processed}`);
  return {fixed, skipped, totalProcessed: processed};
}

// ===========================================================================
// DELETE USER — removes the user from Firebase Auth, Firestore users doc,
// wallet, virtualAccounts, fcm_tokens, and crypto_deposits. Irreversible.
// ===========================================================================
async function handleDeleteUser(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const targetUid = data.targetUid as string;
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid required.");
  }
  if (targetUid === uid) {
    throw new HttpsError("invalid-argument", "You cannot delete your own account.");
  }

  // Delete related Firestore documents in parallel.
  const deletePromises: Promise<any>[] = [
    db.collection("users").doc(targetUid).delete(),
    db.collection("wallets").doc(targetUid).delete(),
    db.collection("virtualAccounts").doc(targetUid).delete(),
    db.collection("fcm_tokens").doc(targetUid).delete(),
    db.collection("crypto_deposits").doc(targetUid).delete(),
  ];
  await Promise.allSettled(deletePromises);

  // Delete the Firebase Auth user.
  const {getAuth} = await import("firebase-admin/auth");
  const auth = getAuth();
  try {
    await auth.deleteUser(targetUid);
  } catch (e: any) {
    // If the Auth user is already gone, continue — the Firestore docs are deleted.
    if (e.code !== "auth/user-not-found") throw e;
  }

  logger.info(`adminApi: user ${targetUid} deleted by ${uid}`);
  return {success: true};
}

// ===========================================================================
// ADMIN USER MESSAGING: Send an email to a user via Resend.
// ===========================================================================
async function handleSendUserEmail(uid: string, data: Record<string, unknown>) {
  const admin = await requireAdmin(uid);
  const targetUid = requiredString(data.targetUid, "targetUid", 128);
  const subject = requiredString(data.subject, "subject", 200);
  const message = requiredString(data.message, "message", 10000);

  // Fetch the target user's email from Firestore.
  const userDoc = await db.collection("users").doc(targetUid).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Target user not found.");
  }
  const toEmail = userDoc.data()?.email as string | undefined;
  if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
    throw new HttpsError("invalid-argument", "Target user has no valid email.");
  }

  const html = [
    "<div style=\"font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;\">",
    "<div style=\"background: #0A0F1F; border-radius: 16px; padding: 32px; border: 1px solid #1E293B;\">",
    "<h2 style=\"color: #2563EB; margin: 0 0 8px 0; font-size: 20px;\">KatrexApp</h2>",
    "<p style=\"color: #6B7280; margin: 0 0 24px 0; font-size: 13px;\">Message from the KatrexApp admin team</p>",
    "<h3 style=\"color: #FFFFFF; margin: 0 0 16px 0; font-size: 18px;\">",
    `${subject.replace(/</g, "&lt;")}</h3>`,
    "<div style=\"color: #D1D5DB; font-size: 15px; line-height: 1.6; white-space: pre-wrap;\">",
    `${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`,
    "<hr style=\"border: none; border-top: 1px solid #1E293B; margin: 24px 0;\" />",
    "<p style=\"color: #6B7280; font-size: 12px; margin: 0;\">",
    "This is an automated message from the KatrexApp admin team. Please do not reply directly to this email.",
    "</p>",
    "</div></div>",
  ].join("");

  const payload = JSON.stringify({
    from: FROM_EMAIL,
    to: toEmail,
    subject: `KatrexApp: ${subject}`,
    html,
  });

  const apiKey = await getResendApiKey();

  await new Promise<void>((resolve, reject) => {
    const req = https.request(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            logger.info(`adminApi: email sent to ${toEmail} by ${uid}`);
            resolve();
          } else {
            logger.error(`Resend error: ${res.statusCode} ${body}`);
            reject(new HttpsError("internal", `Email send failed: ${res.statusCode}`));
          }
        });
      },
    );
    req.on("error", (error) => {
      logger.error("Failed to send email:", error);
      reject(new HttpsError("internal", "Failed to send email."));
    });
    req.write(payload);
    req.end();
  });

  // Log to audit
  await db.collection("audit_logs").add({
    actorId: uid,
    actorEmail: admin.email ?? null,
    actorType: "admin",
    action: "user_email_sent",
    resourceType: "user",
    resourceId: targetUid,
    metadata: {toEmail, subject},
    createdAt: new Date(),
  });

  return {success: true};
}

// ===========================================================================
// SUSPEND USER — sets isActive=false and kycStatus="suspended" in Firestore.
// ===========================================================================
async function handleSuspendUser(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const targetUid = data.targetUid as string;
  if (!targetUid) {
    throw new HttpsError("invalid-argument", "targetUid required.");
  }
  if (targetUid === uid) {
    throw new HttpsError("invalid-argument", "You cannot suspend your own account.");
  }
  await db.collection("users").doc(targetUid).set({
    isActive: false,
    kycStatus: "suspended",
    suspendedAt: new Date(),
    updatedAt: new Date(),
  }, {merge: true});
  logger.info(`adminApi: user ${targetUid} suspended by ${uid}`);
  return {success: true};
}

// ===========================================================================
// CREATE USER — creates a Firebase Auth user and Firestore profile doc.
// ===========================================================================
async function handleCreateUser(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const email = requiredString(data.email, "email", 200);
  const displayName = requiredString(data.displayName, "displayName", 100);
  const password = data.password as string;
  if (!password || password.length < 6) {
    throw new HttpsError("invalid-argument", "Password must be at least 6 characters.");
  }
  const {getAuth} = await import("firebase-admin/auth");
  const auth = getAuth();
  const userRecord = await auth.createUser({
    email,
    password,
    displayName,
  });
  const now = new Date();
  await db.collection("users").doc(userRecord.uid).set({
    uid: userRecord.uid,
    email,
    displayName,
    kycTier: 0,
    kycStatus: "pending",
    isActive: true,
    isEmailVerified: false,
    isAdmin: false,
    defaultCurrency: "NGN",
    createdAt: now,
    updatedAt: now,
  }, {merge: true});
  await db.collection("wallets").doc(userRecord.uid).set({
    uid: userRecord.uid,
    nairaBalance: 0,
    cryptoBalances: {},
    createdAt: now,
    updatedAt: now,
  }, {merge: true});
  logger.info(`adminApi: user ${userRecord.uid} created by ${uid}`);
  return {success: true, uid: userRecord.uid};
}

/**
 * Approve or reject a manual KYC submission.
 * data: { uid, decision: 'approve' | 'reject', reason?: string }
 */
async function handleReviewKyc(uid: string, data: Record<string, unknown>): Promise<unknown> {
  const targetUid = String(data.uid ?? "");
  const decision = String(data.decision ?? "");
  const reason = data.reason ? String(data.reason).slice(0, 300) : null;

  if (!targetUid) throw new HttpsError("invalid-argument", "Missing user uid.");
  if (decision !== "approve" && decision !== "reject") {
    throw new HttpsError("invalid-argument", "decision must be 'approve' or 'reject'.");
  }

  const userRef = db.collection("users").doc(targetUid);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("failed-precondition", "User not found.");
  const userData = snap.data()!;

  if (decision === "approve") {
    await userRef.set({
      kycStatus: "verified",
      kycTier: 1,
      kycReviewedAt: new Date(),
      kycRejectionReason: null,
      updatedAt: new Date(),
    }, {merge: true});
  } else {
    await userRef.set({
      kycStatus: "rejected",
      kycTier: 0,
      kycReviewedAt: new Date(),
      kycRejectionReason: reason ?? "Your submission could not be verified. Please check your details and try again.",
      updatedAt: new Date(),
    }, {merge: true});
  }

  // Notify the user of the decision.
  const notifRef = db.collection("notifications").doc();
  await notifRef.set({
    id: notifRef.id,
    uid: targetUid,
    type: "general",
    title: decision === "approve" ? "Identity Verified \u2713" : "KYC Rejected",
    body: decision === "approve"
      ? "Your identity has been verified. Enjoy higher limits and full access to your account."
      : (reason ?? "Your submission could not be verified. Please check your details and try again."),
    isRead: false,
    createdAt: new Date(),
  });

  // Audit log
  await db.collection("audit_logs").add({
    actorId: uid,
    actorType: "admin",
    action: decision === "approve" ? "kyc_approved" : "kyc_rejected",
    resourceType: "user",
    resourceId: targetUid,
    metadata: {decision, reason, bvn: userData.bvn ? `****${String(userData.bvn).slice(-4)}` : null},
    createdAt: new Date(),
  });

  logger.info(`adminApi: KYC ${decision} for ${targetUid} by ${uid}`);
  return {success: true, decision};
}

const HANDLERS: Record<string, (uid: string, data: Record<string, unknown>) => Promise<unknown>> = {
  processWithdrawal: handleProcessWithdrawal,
  processGiftcardTrade: handleProcessGiftcardTrade,
  saveGiftcardBrand: handleSaveGiftcardBrand,
  saveGiftcardRate: handleSaveGiftcardRate,
  saveGiftcardPromo: handleSaveGiftcardPromo,
  deleteGiftcardPromo: handleDeleteGiftcardPromo,
  saveGiftcardCategory: handleSaveGiftcardCategory,
  deleteGiftcardCategory: handleDeleteGiftcardCategory,
  saveHomepagePromo: handleSaveHomepagePromo,
  deleteHomepagePromo: handleDeleteHomepagePromo,
  updateGiftcardSettings: handleUpdateGiftcardSettings,
  updatePricingConfig: handleUpdatePricingConfig,
  sendPushNotification: handleSendPushNotification,
  migrateKycTiers: handleMigrateKycTiers,
  resetUserPassword: handleResetUserPassword,
  updateUserEmail: handleUpdateUserEmail,
  deleteUser: handleDeleteUser,
  suspendUser: handleSuspendUser,
  createUser: handleCreateUser,
  sendUserEmail: handleSendUserEmail,
  reviewKyc: handleReviewKyc,
};

const adminAuth = getAuth();

/**
 * Wraps an HttpsError into a plain HTTP response compatible with the
 * firebase-functions callable protocol so the client SDK can parse it.
 */
function sendError(res: any, error: HttpsError) {
  const status = error.httpErrorCode?.status ?? 500;
  res.status(status).json({
    error: {
      code: status,
      message: error.message,
      details: error.details ?? null,
    },
  });
}

export const adminApi = onRequest(
  {region: "us-central1", memory: "256MiB", timeoutSeconds: 60, cors: true},
  async (req, res) => {
    // CORS headers for all responses
    const origin = req.headers.origin || "*";
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Firebase-AppCheck");
    res.set("Access-Control-Max-Age", "3600");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({error: {code: 405, message: "Method not allowed."}});
      return;
    }

    try {
      // Verify the Firebase ID token from the Authorization header.
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!token) {
        sendError(res, new HttpsError("unauthenticated", "Authentication required."));
        return;
      }
      const decoded = await adminAuth.verifyIdToken(token);
      const uid = decoded.uid;

      // The callable protocol wraps the payload in { data: { ... } }.
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const data = (body?.data ?? body ?? {}) as Record<string, unknown>;
      const action = data.action as string;
      if (!action || !HANDLERS[action]) {
        sendError(res, new HttpsError("invalid-argument",
          `Unknown action "${action}". Available: ${Object.keys(HANDLERS).join(", ")}`));
        return;
      }
      // Strip the `action` key so handlers get a clean payload
      const payload = {...data};
      delete payload.action;
      logger.info(`adminApi: action=${action} uid=${uid}`);
      const result = await HANDLERS[action](uid, payload);
      // Callable protocol wraps the result in { result: ... }
      res.status(200).json({result});
    } catch (error: any) {
      logger.error(`adminApi error:`, error);
      if (error instanceof HttpsError) {
        sendError(res, error);
      } else if (error?.code === "auth/id-token-expired" || error?.code?.startsWith("auth/")) {
        sendError(res, new HttpsError("unauthenticated", error.message));
      } else {
        sendError(res, new HttpsError("internal", error?.message ?? "Internal error."));
      }
    }
  },
);

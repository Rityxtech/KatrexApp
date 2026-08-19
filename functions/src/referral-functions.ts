/**
 * Referral System Cloud Functions.
 *
 * Lifecycle:
 *  1. User signs up with a referral code → onUserCreated creates a pending referral
 *  2. Referred user makes their first completed transaction → onTransactionCompleted
 *     marks the referral as qualified and notifies the referrer
 *  3. Referrer claims rewards → claimReferralRewards credits their wallet
 *  4. Admin can configure bonus amount, approve/reject payouts, flag fraud
 */
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {isPotentialSybilAttack} from "./referral-utils";

initializeApp();
const db = getFirestore();

// ===========================================================================
// SHARED HELPERS
// ===========================================================================

/// Fallback NGN→USD rate used when `market_data/_ngn_rate` hasn't been
/// written yet (e.g. cold start of the `updateMarketData` schedule). Kept
/// in sync with the cached rate in `functions/src/index.ts`.
const FALLBACK_NGN_PER_USD = 1450;

/// Default minimum spend (in USD) for a referred user's transaction to
/// qualify a referral. Overridable per-environment via
/// `referral_config/minimumQualifyingSpendUsd`.
const DEFAULT_MIN_QUALIFYING_SPEND_USD = 5;

/** Read the live NGN-per-USD rate from `market_data/_ngn_rate`. Falls
 *  back to a hardcoded constant if the document is missing or stale. */
async function getNgnPerUsd(): Promise<number> {
  try {
    const snap = await db.collection("market_data").doc("_ngn_rate").get();
    if (snap.exists) {
      const rate = snap.data()?.rate as number | undefined;
      if (typeof rate === "number" && rate > 0) return rate;
    }
  } catch (e) {
    logger.warn("Failed to fetch NGN rate from market_data/_ngn_rate:", e);
  }
  return FALLBACK_NGN_PER_USD;
}

/** Convert a transaction's amount to NGN so the qualification check can
 *  compare it against a USD threshold.
 *
 *  Resolution order:
 *    1. `amountNaira` if > 0 (covers fiat deposits, giftcard trades,
 *       withdrawals, P2P, referral bonuses, etc.)
 *    2. `amountCoin` × `market_data/{coinSymbol}.priceNaira` for crypto
 *       transactions where the writer only stored the coin amount.
 *    3. 0 if neither resolves (caller should treat as "below threshold").
 */
async function getTransactionNgnValue(txData: any): Promise<number> {
  const amountNaira = (txData.amountNaira as number | undefined) ?? 0;
  if (amountNaira > 0) return amountNaira;

  const amountCoinRaw = txData.amountCoin;
  const coinSymbol = (txData.coinSymbol as string | undefined)?.toLowerCase();
  if (amountCoinRaw !== undefined && amountCoinRaw !== null && coinSymbol) {
    const amountCoin = parseFloat(String(amountCoinRaw));
    if (amountCoin > 0) {
      try {
        const snap = await db.collection("market_data").doc(coinSymbol).get();
        if (snap.exists) {
          const priceNaira = snap.data()?.priceNaira as number | undefined;
          if (typeof priceNaira === "number" && priceNaira > 0) {
            return amountCoin * priceNaira;
          }
        }
      } catch (e) {
        logger.warn(`Failed to fetch priceNaira for ${coinSymbol}:`, e);
      }
    }
  }
  return 0;
}

// ===========================================================================
// 1. ON USER CREATED — create pending referral record
// ===========================================================================

export const onUserCreated = onDocumentCreated(
  {
    document: "users/{uid}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;
    const uid = event.params.uid;
    const referredBy = data.referredBy as string | undefined;
    const referralCode = data.referralCode as string | undefined;
    const newUserFullName = (data.fullName as string) || "New User";
    const newUserUsername = (data.username as string) || "user";

    // Provision the user's wallet server-side. Firestore rules deny client
    // wallet writes entirely, so this trigger is the ONLY place a wallet is
    // born — zero balances, idempotent.
    const walletRef = db.collection("wallets").doc(uid);
    if (!(await walletRef.get()).exists) {
      await walletRef.set({
        uid,
        nairaBalance: 0,
        cryptoBalances: {},
        totalValueNaira: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      logger.info(`Provisioned wallet for new user ${uid}.`);
    }

    // No referral code used — nothing to do
    if (!referredBy || referredBy.trim().length === 0) {
      logger.info(`User ${uid} signed up without a referral code.`);
      return;
    }

    // Block self-referral (referredBy should be a referralCode, not a uid,
    // but just in case)
    if (referredBy === uid || referredBy === referralCode) {
      logger.warn(`Self-referral blocked for user ${uid}.`);
      return;
    }

    // Find the referrer by their referral code
    // referredBy can be either a referral code (e.g. "KAT-JOH-1234") or a uid
    let referrerSnap;
    // Try by referralCode first
    const byCode = await db.collection("users")
      .where("referralCode", "==", referredBy)
      .limit(1)
      .get();
    if (!byCode.empty) {
      referrerSnap = byCode.docs[0];
    } else {
      // Try by uid (in case referredBy was stored as a uid)
      const byUid = await db.collection("users").doc(referredBy).get();
      if (byUid.exists) referrerSnap = byUid;
    }

    if (!referrerSnap || !referrerSnap.exists) {
      logger.warn(`Referrer not found for code "${referredBy}". Ignoring.`);
      return;
    }

    const referrerUid = referrerSnap.id;
    const referrerData = referrerSnap.data()!;
    const referrerName = (referrerData.fullName as string) || "Someone";

    // Double-check self-referral
    if (referrerUid === uid) {
      logger.warn(`Self-referral blocked for user ${uid} (matched by code).`);
      return;
    }

    // Check if a referral record already exists (idempotency)
    const existing = await db.collection("referrals")
      .where("referredUid", "==", uid)
      .limit(1)
      .get();
    if (!existing.empty) {
      logger.info(`Referral record already exists for user ${uid}.`);
      return;
    }

    // Create the pending referral record
    const referralRef = db.collection("referrals").doc();
    await referralRef.set({
      id: referralRef.id,
      referrerUid,
      referrerName,
      referredUid: uid,
      referredName: newUserFullName,
      referredUsername: newUserUsername,
      referralCode: referredBy,
      status: "pending",
      bonusAmount: 0, // Set at qualification time
      qualifiedAt: null,
      claimedAt: null,
      createdAt: new Date(),
    });

    // Notify the referrer
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      id: notifRef.id,
      uid: referrerUid,
      type: "general",
      title: "New Referral!",
      body: `${newUserFullName} just signed up with your referral code. You'll earn a bonus once they make a single completed transaction of $${DEFAULT_MIN_QUALIFYING_SPEND_USD} or more.`,
      isRead: false,
      createdAt: new Date(),
    });

    logger.info(`Referral created: ${referrerUid} → ${uid}`);
  },
);

// ===========================================================================
// 2. ON TRANSACTION COMPLETED — qualify referral on first transaction
// ===========================================================================

export const onTransactionCompleted = onDocumentCreated(
  {
    document: "transactions/{txId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const status = data.status as string;
    const txUid = data.uid as string;

    // Only process completed transactions
    if (status !== "completed") return;

    // Check if this user has a pending referral
    const pendingSnap = await db.collection("referrals")
      .where("referredUid", "==", txUid)
      .where("status", "==", "pending")
      .limit(1)
      .get();
    
    if (pendingSnap.empty) return; // No pending referral for this user
    
    const referralDoc = pendingSnap.docs[0];
    const referralId = referralDoc.id;
    const referralData = referralDoc.data();
    const referrerUid = referralData.referrerUid as string;

    // [OPTIMIZATION] Short-circuit if THIS referral is already qualified
    // (the trigger can re-fire on subsequent transactions, but the
    // pendingSnap query only matches status == "pending", so this guard
    // is belt-and-braces against any race).
    if (referralData.status === "qualified" || referralData.status === "claimed") {
      logger.info(`Referral ${referralId} already ${referralData.status}. Skipping.`);
      return;
    }

    // [OPTIMIZATION] Skip users whose referral already qualified. The
    // trigger fires for every new transaction, so without this guard a
    // second qualifying transaction would re-run the whole pipeline.
    const userRef = db.collection("users").doc(txUid);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    if (userData?.hasQualifiedReferral === true) {
      logger.info(`User ${txUid} already qualified a referral. Skipping.`);
      return;
    }

    // [ANTI-FRAUD] Check verification and identity
    const referrerSnap = await db.collection("users").doc(referrerUid).get();
    const referrerData = referrerSnap.data();

    if (!referrerData || !userData) {
      logger.warn(`Missing user data for referral ${referralId}.`);
      return;
    }

    // Condition: Both must be verified
    const isRefereeVerified = userData.isEmailVerified === true && userData.kycStatus === "verified";
    const isReferrerVerified = referrerData.isEmailVerified === true && referrerData.kycStatus === "verified";

    if (!isRefereeVerified || !isReferrerVerified) {
      logger.info(`Referral ${referralId} blocked: One or both parties not verified.`);
      return;
      // Note: We leave it 'pending' until they verify, or we could mark it 'flagged'
    }

    // Condition: Name matching (Sybil Attack)
    if (isPotentialSybilAttack(userData.fullName || "", referrerData.fullName || "")) {
      await referralDoc.ref.update({ status: "flagged" });
      logger.warn(`Referral ${referralId} flagged as potential Sybil attack (name match).`);
      return;
    }

    // Read referral config for bonus amount AND minimum spend
    const configSnap = await db.collection("referral_config").doc("config").get();
    const config = configSnap.exists ? configSnap.data() : null;
    const bonusAmount = config?.bonusAmount ?? 1000; // default ₦1,000
    const programActive = config?.active ?? true;
    const minimumQualifyingSpendUsd = typeof config?.minimumQualifyingSpendUsd === "number"
      ? (config.minimumQualifyingSpendUsd as number)
      : DEFAULT_MIN_QUALIFYING_SPEND_USD;

    if (!programActive) {
      logger.info("Referral program is inactive. Not qualifying referral.");
      return;
    }

    // [STRICT-AMOUNT] Compute the transaction's USD equivalent and require
    // it to clear the configured minimum (default $5) before qualifying.
    // A small first transaction (e.g. a $0.50 deposit) leaves the
    // referral pending so a later, larger transaction can still unlock
    // the bonus instead of letting the referred user sneak through with
    // dust.
    const txNgnValue = await getTransactionNgnValue(data);
    const ngnPerUsd = await getNgnPerUsd();
    const txUsdValue = ngnPerUsd > 0 ? txNgnValue / ngnPerUsd : 0;
    if (txUsdValue < minimumQualifyingSpendUsd) {
      logger.info(
        `Referral ${referralId} held pending: tx $${txUsdValue.toFixed(2)} ` +
        `< $${minimumQualifyingSpendUsd} minimum (txId=${event.params.txId}).`,
      );
      return;
    }

    // Qualify the referral
    await referralDoc.ref.update({
      status: "qualified",
      bonusAmount,
      qualifyingTxId: event.params.txId,
      qualifyingTxNgn: txNgnValue,
      qualifyingTxUsd: Number(txUsdValue.toFixed(4)),
      qualifyingNgnPerUsd: ngnPerUsd,
      minimumQualifyingSpendUsd,
      qualifiedAt: new Date(),
    });

    // [OPTIMIZATION] Set the per-user flag so the trigger short-circuits
    // for any later transactions instead of re-running the full pipeline.
    await userRef.update({ hasQualifiedReferral: true });

    // [OPTIMIZATION] Increment global stats for qualified referrals
    const statsRef = db.collection("referral_stats").doc("global");
    await statsRef.set({
      totalQualifiedReferrals: FieldValue.increment(1),
      lastUpdatedAt: new Date(),
    }, {merge: true});

    // Notify the referrer
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      id: notifRef.id,
      uid: referrerUid,
      type: "general",
      title: "Referral Qualified!",
      body: `Your referral just made a qualifying transaction of $${txUsdValue.toFixed(2)}. \u20A6${bonusAmount} is now claimable in your referral dashboard.`,
      isRead: false,
      createdAt: new Date(),
    });

    logger.info(`Referral ${referralId} qualified with bonus \u20A6${bonusAmount}`);
  },
);

// ===========================================================================
// 3. CLAIM REFERRAL REWARDS — callable (auth)
// ===========================================================================

export const claimReferralRewards = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;

    // Get all qualified referrals for this user
    const qualifiedSnap = await db.collection("referrals")
      .where("referrerUid", "==", uid)
      .where("status", "==", "qualified")
      .get();

    if (qualifiedSnap.empty) {
      return {
        success: false,
        message: "No claimable rewards available.",
        amountClaimed: 0,
      };
    }

    // Calculate total
    let totalAmount = 0;
    const referralIds: string[] = [];
    qualifiedSnap.forEach((doc) => {
      totalAmount += (doc.data().bonusAmount as number) || 0;
      referralIds.push(doc.id);
    });

    if (totalAmount <= 0) {
      return {
        success: false,
        message: "No claimable rewards available.",
        amountClaimed: 0,
      };
    }

    // Atomically: credit wallet + mark referrals as claimed + create transaction
    await db.runTransaction(async (txn) => {
      // Credit wallet
      const walletRef = db.collection("wallets").doc(uid);
      const walletSnap = await txn.get(walletRef);
      if (!walletSnap.exists) {
        throw new HttpsError("failed-precondition", "Wallet not found.");
      }
      const wallet = walletSnap.data()!;
      txn.set(walletRef, {
        ...wallet,
        nairaBalance: (wallet.nairaBalance ?? 0) + totalAmount,
        updatedAt: new Date(),
      }, {merge: true});

      // Mark all qualified referrals as claimed
      const now = new Date();
      
      // Use a Batch for updates if we have a large number of referrals, 
      // but since we are in a transaction and need the wallet update to be atomic,
      // we perform these here. For >500, we would need to split.
      for (const refId of referralIds) {
        const refRef = db.collection("referrals").doc(refId);
        txn.update(refRef, {
          status: "claimed",
          claimedAt: now,
        });
      }

      // Create referralBonus transaction
      const txRef = db.collection("transactions").doc();
      txn.set(txRef, {
        id: txRef.id,
        uid,
        type: "referral_bonus",
        status: "completed",
        amountNaira: totalAmount,
        description: `Referral bonus claimed (${referralIds.length} referral${referralIds.length > 1 ? "s" : ""})`,
        reference: `REF_CLAIM_${Date.now()}`,
        createdAt: now,
        completedAt: now,
        paymentMethod: "referral",
      });

      // [OPTIMIZATION] Increment global stats
      const statsRef = db.collection("referral_stats").doc("global");
      txn.set(statsRef, {
        totalBonusesPaid: FieldValue.increment(totalAmount),
        totalQualifiedReferrals: FieldValue.increment(0), // updated during qualification
        totalClaimed: FieldValue.increment(referralIds.length),
        lastUpdatedAt: now,
      }, {merge: true});
    });

    // Create notification (outside transaction to avoid rule issues)
    const notifRef = db.collection("notifications").doc();
    await notifRef.set({
      id: notifRef.id,
      uid,
      type: "general",
      title: "Referral Rewards Claimed",
      body: `\u20A6${totalAmount} has been credited to your wallet from ${referralIds.length} referral${referralIds.length > 1 ? "s" : ""}.`,
      isRead: false,
      createdAt: new Date(),
    });

    logger.info(`User ${uid} claimed \u20A6${totalAmount} from ${referralIds.length} referrals.`);

    return {
      success: true,
      amountClaimed: totalAmount,
      count: referralIds.length,
    };
  },
);

// ===========================================================================
// 4. UPDATE REFERRAL CONFIG — callable (admin)
// ===========================================================================

export const updateReferralConfig = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;

    // Verify admin
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const {bonusAmount, active, minimumQualifyingSpendUsd} = request.data as {
      bonusAmount?: number;
      active?: boolean;
      minimumQualifyingSpendUsd?: number;
    };

    const updates: Record<string, unknown> = {updatedAt: new Date()};
    if (typeof bonusAmount === "number" && bonusAmount >= 0) {
      updates.bonusAmount = bonusAmount;
    }
    if (typeof active === "boolean") {
      updates.active = active;
    }
    if (typeof minimumQualifyingSpendUsd === "number" && minimumQualifyingSpendUsd >= 0) {
      // Clamp to a sane upper bound so a typo doesn't brick the program.
      updates.minimumQualifyingSpendUsd = Math.min(minimumQualifyingSpendUsd, 10000);
    }

    await db.collection("referral_config").doc("config").set(updates, {merge: true});

    logger.info(`Referral config updated by admin ${uid}:`, updates);
    return {success: true};
  },
);

// ===========================================================================
// 5. PROCESS REFERRAL PAYOUT — callable (admin)
// ===========================================================================

export const processReferralPayout = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;

    // Verify admin
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const {referralId, action} = request.data as {
      referralId: string;
      action: "approve" | "reject";
    };

    if (!referralId || !action) {
      throw new HttpsError("invalid-argument", "Missing referralId or action.");
    }

    const referralRef = db.collection("referrals").doc(referralId);
    const referralSnap = await referralRef.get();
    if (!referralSnap.exists) {
      throw new HttpsError("not-found", "Referral not found.");
    }

    const referral = referralSnap.data()!;

    if (action === "approve") {
      // Read config for bonus amount
      const configSnap = await db.collection("referral_config").doc("config").get();
      const bonusAmount = configSnap.exists ? (configSnap.data()?.bonusAmount ?? 1000) : 1000;

      // Mark as qualified and credit referrer's wallet
      await db.runTransaction(async (txn) => {
        const walletRef = db.collection("wallets").doc(referral.referrerUid);
        const walletSnap = await txn.get(walletRef);
        if (walletSnap.exists) {
          const wallet = walletSnap.data()!;
          txn.set(walletRef, {
            ...wallet,
            nairaBalance: (wallet.nairaBalance ?? 0) + bonusAmount,
            updatedAt: new Date(),
          }, {merge: true});
        }
        txn.update(referralRef, {
          status: "qualified",
          bonusAmount,
          qualifiedAt: new Date(),
        });
      });

      // Notify referrer
      const notifRef = db.collection("notifications").doc();
      await notifRef.set({
        id: notifRef.id,
        uid: referral.referrerUid,
        type: "general",
        title: "Referral Approved",
        body: `Your referral has been approved. \u20A6${bonusAmount} is now claimable.`,
        isRead: false,
        createdAt: new Date(),
      });

      logger.info(`Admin ${uid} approved referral ${referralId}`);
      return {success: true, action: "approved"};
    } else {
      // Reject — mark as flagged
      await referralRef.update({
        status: "flagged",
        qualifiedAt: new Date(),
      });

      logger.info(`Admin ${uid} rejected referral ${referralId}`);
      return {success: true, action: "rejected"};
    }
  },
);

// ===========================================================================
// 7. BACKFILL REFERRAL MIN-SPEND — callable (admin)
// ===========================================================================

/** One-time backfill to re-evaluate already-qualified referrals under the
 *  new $5 minimum-spend rule. See `backfill-referral-min-spend.js` for the
 *  local-script equivalent with the same logic.
 *
 *  Request: { mode: "dry-run" | "live", limit?: number }
 *  Response: { mode, processed, reverted, flagged, kept, skipped, errors,
 *              minSpendUsd, ngnPerUsd, referrals: [{id, action, detail}] }
 *
 *  Dry-run returns the same shape but performs no writes. Use `mode:"live"`
 *  after reviewing a dry-run summary. */
export const backfillReferralMinSpend = onCall(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const {mode, limit} = (request.data || {}) as {
      mode?: "dry-run" | "live";
      limit?: number;
    };
    const liveMode = mode === "live";
    const maxItems = typeof limit === "number" && limit > 0 ? Math.min(limit, 5000) : 500;

    const ngnPerUsd = await getNgnPerUsd();
    const configSnap = await db.collection("referral_config").doc("config").get();
    const minSpendUsd = (configSnap.exists &&
      typeof configSnap.data()?.minimumQualifyingSpendUsd === "number")
      ? (configSnap.data()?.minimumQualifyingSpendUsd as number)
      : DEFAULT_MIN_QUALIFYING_SPEND_USD;

    // Paginate the qualified/claimed referrals.
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
    let processed = 0;
    const counts = {reverted: 0, flagged: 0, kept: 0, skipped: 0, errors: 0};
    const sample: Array<{id: string; action: string; detail: string}> = [];
    const SAMPLE_CAP = 200;

    while (processed < maxItems) {
      let q = db.collection("referrals")
        .where("status", "in", ["qualified", "claimed"])
        .orderBy("qualifiedAt", "desc")
        .limit(Math.min(100, maxItems - processed));
      if (lastDoc) q = q.startAfter(lastDoc);
      const snap = await q.get();
      if (snap.empty) break;
      lastDoc = snap.docs[snap.docs.length - 1];

      for (const refDoc of snap.docs) {
        if (processed >= maxItems) break;
        processed++;
        const ref = refDoc.data();
        const referredUid = ref.referredUid as string | undefined;
        const referralId = refDoc.id;

        if (!referredUid) {
          counts.skipped++;
          if (sample.length < SAMPLE_CAP) sample.push({id: referralId, action: "skip", detail: "no referredUid"});
          continue;
        }

        try {
          const txSnap = await db.collection("transactions")
            .where("uid", "==", referredUid)
            .where("status", "==", "completed")
            .orderBy("createdAt", "asc")
            .limit(50)
            .get();

          if (txSnap.empty) {
            counts.skipped++;
            if (sample.length < SAMPLE_CAP) sample.push({id: referralId, action: "skip", detail: "no completed tx for user"});
            continue;
          }

          let bestTx: {id: string; data: FirebaseFirestore.DocumentData; ngn: number; usd: number} | null = null;
          let allUnderThreshold = true;
          for (const txDoc of txSnap.docs) {
            const txData = txDoc.data();
            const ngn = await getTransactionNgnValue(txData);
            const usd = ngnPerUsd > 0 ? ngn / ngnPerUsd : 0;
            if (usd >= minSpendUsd && (bestTx === null || ngn > bestTx.ngn)) {
              bestTx = {id: txDoc.id, data: txData, ngn, usd};
              allUnderThreshold = false;
            }
          }

          if (ref.status === "claimed") {
            if (allUnderThreshold) {
              counts.flagged++;
              if (sample.length < SAMPLE_CAP) sample.push({id: referralId, action: "flag", detail: "claimed; max past tx < $" + minSpendUsd});
              if (liveMode) {
                await refDoc.ref.update({
                  backfillReviewRequired: true,
                  backfillReviewedAt: null,
                  backfillNote: "Original qualifying transaction was under the new $" +
                    minSpendUsd + " minimum. Bonus already paid; admin may claw back.",
                });
              }
            } else {
              counts.kept++;
              if (sample.length < SAMPLE_CAP) sample.push({id: referralId, action: "keep", detail: "claimed; has qualifying tx $" + (bestTx?.usd.toFixed(2) ?? "?")});
            }
            continue;
          }

          // status == "qualified"
          if (allUnderThreshold) {
            counts.reverted++;
            if (sample.length < SAMPLE_CAP) sample.push({id: referralId, action: "revert", detail: "qualified; max past tx < $" + minSpendUsd});
            if (liveMode) {
              await refDoc.ref.update({
                status: "pending",
                bonusAmount: 0,
                qualifiedAt: null,
                qualifyingTxId: null,
                qualifyingTxNgn: null,
                qualifyingTxUsd: null,
                qualifyingNgnPerUsd: null,
                minimumQualifyingSpendUsd: null,
                revertedAt: FieldValue.serverTimestamp(),
                revertedReason: "Backfill: no past transaction cleared $" + minSpendUsd +
                  " USD. A later transaction may still qualify.",
              });
              await db.collection("users").doc(referredUid).update({
                hasQualifiedReferral: false,
                hasMadeFirstTransaction: false,
              });
            }
          } else {
            counts.kept++;
            if (sample.length < SAMPLE_CAP) {
              sample.push({
                id: referralId,
                action: "keep",
                detail: "qualified; has qualifying tx $" + (bestTx?.usd.toFixed(2) ?? "?") + " (tx " + (bestTx?.id.slice(0, 8) ?? "?") + "…)",
              });
            }
            if (liveMode && bestTx) {
              await refDoc.ref.update({
                qualifyingTxId: bestTx.id,
                qualifyingTxNgn: bestTx.ngn,
                qualifyingTxUsd: Number(bestTx.usd.toFixed(4)),
                qualifyingNgnPerUsd: ngnPerUsd,
                minimumQualifyingSpendUsd: minSpendUsd,
              });
            }
          }
        } catch (e) {
          counts.errors++;
          const msg = e instanceof Error ? e.message : String(e);
          logger.error("Backfill error on " + referralId + ": " + msg);
          if (sample.length < SAMPLE_CAP) sample.push({id: referralId, action: "error", detail: msg});
        }
      }
    }

    logger.info(
      `Backfill (${liveMode ? "LIVE" : "DRY"}) by ${uid}: ` +
      `processed=${processed} reverted=${counts.reverted} flagged=${counts.flagged} ` +
      `kept=${counts.kept} skipped=${counts.skipped} errors=${counts.errors}`,
    );

    return {
      mode: liveMode ? "live" : "dry-run",
      processed,
      ...counts,
      minSpendUsd,
      ngnPerUsd,
      referrals: sample,
    };
  },
);

// ===========================================================================
// 6. FLAG REFERRAL — callable (admin)
// ===========================================================================

export const flagReferral = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;

    // Verify admin
    const adminDoc = await db.collection("users").doc(uid).get();
    if (!adminDoc.exists || adminDoc.data()?.isAdmin !== true) {
      throw new HttpsError("permission-denied", "Admin access required.");
    }

    const {referralId, flagged} = request.data as {
      referralId: string;
      flagged?: boolean;
    };

    if (!referralId) {
      throw new HttpsError("invalid-argument", "Missing referralId.");
    }

    const referralRef = db.collection("referrals").doc(referralId);
    const referralSnap = await referralRef.get();
    if (!referralSnap.exists) {
      throw new HttpsError("not-found", "Referral not found.");
    }

    const newStatus = flagged === false ? "qualified" : "flagged";
    await referralRef.update({
      status: newStatus,
    });

    logger.info(`Admin ${uid} ${newStatus === "flagged" ? "flagged" : "unflagged"} referral ${referralId}`);
    return {success: true, status: newStatus};
  },
);

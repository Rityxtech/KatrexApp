/**
 * One-time backfill for the referral $5 minimum-spend rule.
 *
 *   $ node backfill-referral-min-spend.js --dry-run     # preview only
 *   $ node backfill-referral-min-spend.js --live        # apply
 *   $ node backfill-referral-min-spend.js --live --limit 100
 *
 * Re-evaluates every already-qualified referral under the new rule:
 *
 *   - status == "qualified"  → scan referred user's full completed-tx
 *                              history. If ANY tx is >= $5 USD, keep
 *                              qualified and stamp the new audit fields
 *                              (qualifyingTxId, etc.). If NONE clear the
 *                              threshold, revert to "pending" and reset
 *                              hasQualifiedReferral / hasMadeFirstTransaction
 *                              on the user doc so the trigger can
 *                              re-qualify them on a future transaction.
 *
 *   - status == "claimed"    → don't touch (bonus already paid out). If
 *                              the original qualifying tx was < $5, mark
 *                              `backfillReviewRequired = true` so an admin
 *                              can decide whether to claw back manually.
 *
 *   - status == "pending"    → already in the right state, skip.
 *
 * Setup:
 *   1. Download a service account key from
 *      https://console.firebase.google.com/project/katrexapp-83cde/settings/serviceaccounts/adminsdk
 *      and save it as `serviceAccountKey.json` in the project root.
 *   2. From this directory (`functions/`):
 *        npm install                 # firebase-admin is already a dep
 *        node backfill-referral-min-spend.js --dry-run
 *        node backfill-referral-min-spend.js --live
 *
 *   Or set GOOGLE_APPLICATION_CREDENTIALS=<path-to-key.json> in the env.
 */
const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// ─── CLI flags ───────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const LIVE = args.has("--live");
const LIMIT = (() => {
  const i = process.argv.indexOf("--limit");
  return i >= 0 ? parseInt(process.argv[i + 1], 10) : 500;
})();
const PROJECT_ID = (() => {
  const i = process.argv.indexOf("--project");
  return i >= 0 ? process.argv[i + 1] : "katrexapp-83cde";
})();

// ─── Auth: prefer GOOGLE_APPLICATION_CREDENTIALS, fall back to a
//     serviceAccountKey.json sitting in the project root.
function initAdmin() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({credential: admin.credential.applicationDefault()});
    return;
  }
  const projectRootKey = path.resolve(__dirname, "..", "serviceAccountKey.json");
  const fnDirKey = path.resolve(__dirname, "serviceAccountKey.json");
  const keyPath = fs.existsSync(fnDirKey) ? fnDirKey :
    fs.existsSync(projectRootKey) ? projectRootKey : null;
  if (!keyPath) {
    console.error(
      "✗ No credentials found. Either:\n" +
      "  1. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json in the env\n" +
      "  2. Save the key as " + projectRootKey + "\n" +
      "Download from: https://console.firebase.google.com/project/" +
      PROJECT_ID + "/settings/serviceaccounts/adminsdk",
    );
    process.exit(1);
  }
  console.log("→ Using service account key: " + keyPath);
  admin.initializeApp({
    credential: admin.credential.cert(require(keyPath)),
    projectId: PROJECT_ID,
  });
}

initAdmin();
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─── Mirror the Cloud Function helpers so the backfill uses the
//     same conversion logic as production. If these drift, the
//     backfill and the trigger will disagree on which transactions
//     qualify, which is exactly what we want to avoid. ────────────
const FALLBACK_NGN_PER_USD = 1450;
const DEFAULT_MIN_QUALIFYING_SPEND_USD = 5;

async function getNgnPerUsd() {
  try {
    const snap = await db.collection("market_data").doc("_ngn_rate").get();
    if (snap.exists) {
      const rate = snap.data().rate;
      if (typeof rate === "number" && rate > 0) return rate;
    }
  } catch (e) {
    console.warn("  warn: failed to fetch market_data/_ngn_rate:", e.message);
  }
  return FALLBACK_NGN_PER_USD;
}

async function getTransactionNgnValue(txData) {
  const amountNaira = (txData.amountNaira != null) ? Number(txData.amountNaira) : 0;
  if (amountNaira > 0) return amountNaira;
  const amountCoinRaw = txData.amountCoin;
  const coinSymbol = (txData.coinSymbol || "").toLowerCase();
  if (amountCoinRaw != null && coinSymbol) {
    const amountCoin = parseFloat(String(amountCoinRaw));
    if (amountCoin > 0) {
      try {
        const snap = await db.collection("market_data").doc(coinSymbol).get();
        if (snap.exists) {
          const priceNaira = snap.data().priceNaira;
          if (typeof priceNaira === "number" && priceNaira > 0) {
            return amountCoin * priceNaira;
          }
        }
      } catch (e) {
        console.warn("  warn: failed to fetch priceNaira for " + coinSymbol + ":", e.message);
      }
    }
  }
  return 0;
}

// ─── Backfill ────────────────────────────────────────────────────────
async function backfill() {
  console.log("─── KatrexApp referral $5-min backfill ───");
  console.log("Mode:     " + (LIVE ? "LIVE" : "DRY RUN (no writes)"));
  console.log("Project:  " + PROJECT_ID);
  console.log("Limit:    " + LIMIT);
  console.log("");

  const ngnPerUsd = await getNgnPerUsd();
  const configSnap = await db.collection("referral_config").doc("config").get();
  const minSpendUsd = (configSnap.exists && typeof configSnap.data().minimumQualifyingSpendUsd === "number")
    ? configSnap.data().minimumQualifyingSpendUsd
    : DEFAULT_MIN_QUALIFYING_SPEND_USD;
  console.log("NGN/USD:  " + ngnPerUsd);
  console.log("Min:      $" + minSpendUsd + " USD");
  console.log("");

  // Paginate so we don't run out of memory on large datasets.
  let lastDoc = null;
  let processed = 0;
  let kept = 0;
  let reverted = 0;
  let flagged = 0;
  let skipped = 0;
  let errors = 0;

  while (processed < LIMIT) {
    let q = db.collection("referrals")
      .where("status", "in", ["qualified", "claimed"])
      .orderBy("qualifiedAt", "desc")
      .limit(Math.min(100, LIMIT - processed));
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    lastDoc = snap.docs[snap.docs.length - 1];

    for (const refDoc of snap.docs) {
      if (processed >= LIMIT) break;
      processed++;
      const ref = refDoc.data();
      const referredUid = ref.referredUid;
      const referralId = refDoc.id;
      const referrerUid = ref.referrerUid;

      if (!referredUid) {
        console.log("  skip " + referralId + " (no referredUid)");
        skipped++;
        continue;
      }

      try {
        // Pull all completed transactions for the referred user, oldest first.
        const txSnap = await db.collection("transactions")
          .where("uid", "==", referredUid)
          .where("status", "==", "completed")
          .orderBy("createdAt", "asc")
          .limit(50)
          .get();

        if (txSnap.empty) {
          console.log("  skip " + referralId + " (user " + referredUid.slice(0, 8) +
            "… has no completed transactions)");
          skipped++;
          continue;
        }

        // Find the FIRST transaction that meets the $5 threshold.
        let bestTx = null;
        let bestUsd = 0;
        let allUnderThreshold = true;
        for (const txDoc of txSnap.docs) {
          const txData = txDoc.data();
          const ngn = await getTransactionNgnValue(txData);
          const usd = ngnPerUsd > 0 ? ngn / ngnPerUsd : 0;
          if (usd >= minSpendUsd && (bestTx === null || ngn > bestUsd * ngnPerUsd)) {
            bestTx = {id: txDoc.id, data: txData, ngn, usd};
            bestUsd = usd;
            allUnderThreshold = false;
          }
        }

        if (ref.status === "claimed") {
          // Don't touch the wallet/claim ledger. Just mark for admin review
          // if the original qualifying tx would have failed the new rule.
          if (allUnderThreshold) {
            console.log("  flag " + referralId + " (claimed; max past tx < $" +
              minSpendUsd + ")");
            if (LIVE) {
              await refDoc.ref.update({
                backfillReviewRequired: true,
                backfillReviewedAt: null,
                backfillNote: "Original qualifying transaction was under the new $" +
                  minSpendUsd + " minimum. Bonus already paid; admin may claw back.",
              });
            }
            flagged++;
          } else {
            console.log("  keep " + referralId + " (claimed; has qualifying tx $" +
              bestUsd.toFixed(2) + ")");
            kept++;
          }
          continue;
        }

        // status == "qualified": revert or backfill the audit fields.
        if (allUnderThreshold) {
          console.log("  revert " + referralId + " (user " + referredUid.slice(0, 8) +
            "…; max past tx < $" + minSpendUsd + ")");
          if (LIVE) {
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
            // Reset both flags so the trigger can re-evaluate.
            const userRef = db.collection("users").doc(referredUid);
            await userRef.update({
              hasQualifiedReferral: false,
              hasMadeFirstTransaction: false,
            });
            // Don't spam the referrer with a notification — they may have
            // already seen the original "qualified" message. If they re-
            // qualify on a future tx, they'll get a fresh one then.
          }
          reverted++;
        } else {
          console.log("  keep   " + referralId + " (user " + referredUid.slice(0, 8) +
            "…; qualifying tx $" + bestUsd.toFixed(2) + " / txId " + bestTx.id.slice(0, 8) + "…)");
          if (LIVE) {
            await refDoc.ref.update({
              qualifyingTxId: bestTx.id,
              qualifyingTxNgn: bestTx.ngn,
              qualifyingTxUsd: Number(bestUsd.toFixed(4)),
              qualifyingNgnPerUsd: ngnPerUsd,
              minimumQualifyingSpendUsd: minSpendUsd,
              // Leave status="qualified", bonusAmount, qualifiedAt alone.
            });
          }
          kept++;
        }
      } catch (e) {
        console.error("  ERROR " + referralId + ": " + e.message);
        errors++;
      }
    }
  }

  console.log("");
  console.log("─── Summary ───");
  console.log("Processed:  " + processed);
  console.log("Reverted:   " + reverted + "  (qualified → pending)");
  console.log("Flagged:    " + flagged + "   (claimed, needs admin review)");
  console.log("Kept:       " + kept);
  console.log("Skipped:    " + skipped);
  console.log("Errors:     " + errors);
  console.log("");
  if (!LIVE) {
    console.log("Re-run with --live to apply.");
  } else {
    console.log("Backfill applied. Run again with --dry-run to confirm no more changes.");
  }
}

backfill().then(() => process.exit(0)).catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

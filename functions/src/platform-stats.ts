/**
 * Platform Statistics Aggregation System
 * 
 * This module maintains real-time aggregated statistics to eliminate
 * expensive client-side calculations in the Admin Dashboard.
 * 
 * Aggregated Document: `platform_stats/global`
 * - totalUsers
 * - verifiedUsers (kycTier >= 1)
 * - totalTransactions
 * - completedTransactions
 * - pendingTransactions
 * - totalVolumeNaira
 * - totalNairaBalance (system liability)
 * - lastUpdatedAt
 */

import {onDocumentCreated, onDocumentUpdated, onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue} from "firebase-admin/firestore";

const db = getFirestore();

// ============================================================================
// USER AGGREGATION — Increment on user creation, track verified users
// ============================================================================

export const onUserCreatedStats = onDocumentCreated(
  {
    document: "users/{uid}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const kycTier = (data.kycTier ?? 0) as number;
    const isVerified = kycTier >= 1;

    const statsRef = db.collection("platform_stats").doc("global");
    await statsRef.set({
      totalUsers: FieldValue.increment(1),
      verifiedUsers: FieldValue.increment(isVerified ? 1 : 0),
      lastUpdatedAt: new Date(),
    }, {merge: true});

    logger.info(`Platform stats updated: +1 user (verified: ${isVerified})`);
  },
);

export const onUserUpdatedStats = onDocumentUpdated(
  {
    document: "users/{uid}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const wasTier0 = (before.kycTier ?? 0) < 1;
    const isTier1Plus = (after.kycTier ?? 0) >= 1;

    // Only increment verifiedUsers if they upgraded from unverified to verified
    if (wasTier0 && isTier1Plus) {
      const statsRef = db.collection("platform_stats").doc("global");
      await statsRef.set({
        verifiedUsers: FieldValue.increment(1),
        lastUpdatedAt: new Date(),
      }, {merge: true});

      logger.info(`Platform stats updated: +1 verified user`);
    }
  },
);

// ============================================================================
// TRANSACTION AGGREGATION — Track counts and volume
// ============================================================================

export const onTransactionCreatedStats = onDocumentCreated(
  {
    document: "transactions/{txId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const status = data.status as string;
    const amountNaira = (data.amountNaira ?? 0) as number;

    const statsRef = db.collection("platform_stats").doc("global");
    const updates: Record<string, any> = {
      totalTransactions: FieldValue.increment(1),
      lastUpdatedAt: new Date(),
    };

    if (status === "completed") {
      updates.completedTransactions = FieldValue.increment(1);
      updates.totalVolumeNaira = FieldValue.increment(amountNaira);
    } else if (status === "pending") {
      updates.pendingTransactions = FieldValue.increment(1);
    }

    await statsRef.set(updates, {merge: true});
    logger.info(`Platform stats updated: +1 transaction (${status})`);
  },
);

export const onTransactionUpdatedStats = onDocumentUpdated(
  {
    document: "transactions/{txId}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;

    const beforeStatus = before.status as string;
    const afterStatus = after.status as string;

    // Only update if status changed
    if (beforeStatus === afterStatus) return;

    const amountNaira = (after.amountNaira ?? 0) as number;
    const statsRef = db.collection("platform_stats").doc("global");
    const updates: Record<string, any> = {
      lastUpdatedAt: new Date(),
    };

    // Decrement old status
    if (beforeStatus === "pending") {
      updates.pendingTransactions = FieldValue.increment(-1);
    }

    // Increment new status
    if (afterStatus === "completed") {
      updates.completedTransactions = FieldValue.increment(1);
      updates.totalVolumeNaira = FieldValue.increment(amountNaira);
    } else if (afterStatus === "pending") {
      updates.pendingTransactions = FieldValue.increment(1);
    }

    await statsRef.set(updates, {merge: true});
    logger.info(`Platform stats updated: transaction status ${beforeStatus} → ${afterStatus}`);
  },
);

// ============================================================================
// WALLET AGGREGATION — Track total system liability (all naira balances)
// ============================================================================

export const onWalletUpdatedStats = onDocumentWritten(
  {
    document: "wallets/{uid}",
    region: "us-central1",
    memory: "256MiB",
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();

    const beforeBalance = (before?.nairaBalance ?? 0) as number;
    const afterBalance = (after?.nairaBalance ?? 0) as number;

    const delta = afterBalance - beforeBalance;
    if (delta === 0) return;

    const statsRef = db.collection("platform_stats").doc("global");
    await statsRef.set({
      totalNairaBalance: FieldValue.increment(delta),
      lastUpdatedAt: new Date(),
    }, {merge: true});

    logger.info(`Platform stats updated: Naira balance delta ${delta > 0 ? "+" : ""}${delta}`);
  },
);

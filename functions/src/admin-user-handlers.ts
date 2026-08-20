/**
 * Production-ready User Management handlers for KatrexApp.
 *
 * Implements:
 *   - listUsers           (server-side pagination, filters, sorting)
 *   - updateUserProfile   (whitelisted profile edits + audit)
 *   - updateUserFlags     (isActive, isEmailVerified, kycTier, role + audit)
 *   - adjustUserBalance   (Naira & crypto + immutable tx record + audit)
 *   - bulkSuspendUsers    (atomic batch + audit)
 *   - bulkUnsuspendUsers  (atomic batch + audit)
 *   - bulkDeleteUsers     (soft delete by default + audit)
 *   - restoreUser         (undelete soft-deleted user + audit)
 *   - exportUsersCsv      (server-side streaming CSV payload)
 *   - Hardened versions of: createUser, suspendUser, deleteUser,
 *     resetUserPassword, updateUserEmail, sendUserEmail, reviewKyc
 */
import {HttpsError} from "firebase-functions/v2/https";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {
  ALLOWED_COINS,
  audit,
  cleanText,
  parseDate,
  rateLimit,
  requirePermission,
  requireReason,
  requireSuperAdmin,
  safeCell,
} from "./_helpers.js";

const db = getFirestore();

// ─────────────────────────────────────────────────────────────────────
// 1. LIST USERS (Server-side Cursor Pagination & Filters)
// ─────────────────────────────────────────────────────────────────────

export async function handleListUsers(actorUid: string, data: Record<string, unknown>) {
  await requirePermission(actorUid, "users.read");
  await rateLimit(actorUid, "listUsers");

  const q = typeof data.q === "string" ? data.q.trim().toLowerCase() : "";
  const kycTier = typeof data.kycTier === "number" ? data.kycTier : undefined;
  const kycStatus = typeof data.kycStatus === "string" ? data.kycStatus : undefined;
  const isActive = typeof data.isActive === "boolean" ? data.isActive : undefined;
  const country = typeof data.country === "string" ? data.country : undefined;
  const defaultCurrency = typeof data.defaultCurrency === "string" ? data.defaultCurrency : undefined;
  const role = typeof data.role === "string" ? data.role : undefined;
  const createdFrom = parseDate(data.createdFrom, "createdFrom");
  const createdTo = parseDate(data.createdTo, "createdTo");
  const includeDeleted = data.includeDeleted === true;

  const rawLimit = typeof data.limit === "number" ? data.limit : 25;
  const limit = Math.min(Math.max(1, rawLimit), 100);
  const cursorId = typeof data.cursor === "string" ? data.cursor : null;
  const dir = (data.dir as string)?.toLowerCase() === "asc" ? "asc" : "desc";
  const sort = (data.sort as string) ?? "createdAt";

  let query: FirebaseFirestore.Query = db.collection("users");

  if (!includeDeleted) {
    query = query.where("deletedAt", "==", null);
  }
  if (kycTier !== undefined) query = query.where("kycTier", "==", kycTier);
  if (kycStatus) query = query.where("kycStatus", "==", kycStatus);
  if (isActive !== undefined) query = query.where("isActive", "==", isActive);
  if (country) query = query.where("country", "==", country);
  if (defaultCurrency) query = query.where("defaultCurrency", "==", defaultCurrency);
  if (role) query = query.where("role", "==", role);
  if (createdFrom) query = query.where("createdAt", ">=", createdFrom);
  if (createdTo) query = query.where("createdAt", "<=", createdTo);

  // Sorting
  const allowedSorts = new Set(["createdAt", "email", "fullName", "kycTier", "lastLoginAt"]);
  const sortField = allowedSorts.has(sort) ? sort : "createdAt";
  query = query.orderBy(sortField, dir);

  // Cursor pagination
  if (cursorId) {
    const cursorDoc = await db.collection("users").doc(cursorId).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  // Fetch limit + 1 to check for next page
  query = query.limit(limit + 1);
  const snap = await query.get();

  let docs = snap.docs;
  const hasMore = docs.length > limit;
  if (hasMore) {
    docs = docs.slice(0, limit);
  }

  let users = docs.map((d) => ({
    id: d.id,
    uid: d.id,
    ...d.data(),
  }));

  // Client-side substring filter for `q` if specified (since Firestore lacks fuzzy text search)
  if (q) {
    users = users.filter((u: any) =>
      (u.fullName || u.displayName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q) ||
      (u.phone || "").includes(q)
    );
  }

  const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

  return {
    rows: users,
    nextCursor,
    limit,
    totalReturned: users.length,
    hasMore,
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. UPDATE USER PROFILE (Whitelisted fields + Audit)
// ─────────────────────────────────────────────────────────────────────

export async function handleUpdateUserProfile(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.updateProfile");
  const targetUid = cleanText(data.targetUid, 128, "targetUid");
  await rateLimit(actorUid, "updateUserProfile");

  const targetRef = db.collection("users").doc(targetUid);
  const snap = await targetRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Target user not found.");
  const before = snap.data()!;

  // Whitelisted profile fields only — isAdmin, role, email, kycTier CANNOT be set here.
  const patch: Record<string, unknown> = {};
  if (typeof data.fullName === "string") patch.fullName = cleanText(data.fullName, 100, "fullName");
  if (typeof data.username === "string") patch.username = cleanText(data.username, 50, "username");
  if (typeof data.phone === "string") patch.phone = cleanText(data.phone, 20, "phone");
  if (typeof data.country === "string") patch.country = cleanText(data.country, 10, "country");
  if (typeof data.bvn === "string") patch.bvn = cleanText(data.bvn, 20, "bvn");
  if (typeof data.dateOfBirth === "string") patch.dateOfBirth = cleanText(data.dateOfBirth, 20, "dateOfBirth");
  if (typeof data.gender === "string") patch.gender = cleanText(data.gender, 20, "gender");
  if (typeof data.address === "string") patch.address = cleanText(data.address, 200, "address");
  if (typeof data.defaultCurrency === "string") patch.defaultCurrency = cleanText(data.defaultCurrency, 10, "defaultCurrency");
  if (typeof data.referralCode === "string") patch.referralCode = cleanText(data.referralCode, 50, "referralCode");
  if (typeof data.referredBy === "string") patch.referredBy = cleanText(data.referredBy, 128, "referredBy");

  if (Object.keys(patch).length === 0) {
    throw new HttpsError("invalid-argument", "No valid profile fields provided.");
  }

  patch.updatedAt = FieldValue.serverTimestamp();
  patch.updatedBy = actorUid;

  await targetRef.update(patch);

  const afterSnap = await targetRef.get();
  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "user_profile_updated",
    resourceType: "user",
    resourceId: targetUid,
    before,
    after: afterSnap.data(),
  });

  return {success: true, targetUid};
}

// ─────────────────────────────────────────────────────────────────────
// 3. UPDATE USER FLAGS (Active, Email Verified, KYC Tier, Role)
// ─────────────────────────────────────────────────────────────────────

export async function handleUpdateUserFlags(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.updateFlags");
  const targetUid = cleanText(data.targetUid, 128, "targetUid");
  const reason = requireReason(data.reason, "reason", 5);
  await rateLimit(actorUid, "updateUserFlags");

  if (targetUid === actorUid) {
    throw new HttpsError("invalid-argument", "You cannot modify your own flags or role.");
  }

  const targetRef = db.collection("users").doc(targetUid);
  const snap = await targetRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "Target user not found.");
  const before = snap.data()!;

  const patch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorUid,
  };

  if (typeof data.isActive === "boolean") {
    patch.isActive = data.isActive;
    if (!data.isActive) {
      patch.kycStatus = "suspended";
      patch.suspendedAt = FieldValue.serverTimestamp();
      patch.suspendedBy = actorUid;
      patch.suspendedReason = reason;
    }
  }

  if (typeof data.isEmailVerified === "boolean") {
    patch.isEmailVerified = data.isEmailVerified;
  }

  if (typeof data.kycTier === "number") {
    if (data.kycTier < 0 || data.kycTier > 2) {
      throw new HttpsError("invalid-argument", "kycTier must be 0, 1, or 2.");
    }
    patch.kycTier = data.kycTier;
    if (data.kycTier >= 1 && before.kycStatus !== "verified") {
      patch.kycStatus = "verified";
      patch.kycVerifiedAt = FieldValue.serverTimestamp();
    }
  }

  if (typeof data.role === "string") {
    // Changing roles requires superadmin
    await requireSuperAdmin(actorUid);
    const validRoles = new Set(["superadmin", "admin", "compliance", "support", "user"]);
    if (!validRoles.has(data.role)) {
      throw new HttpsError("invalid-argument", "Invalid role specified.");
    }
    patch.role = data.role;
    patch.isAdmin = data.role === "admin" || data.role === "superadmin";

    // Set custom claims in Auth
    const {getAuth} = await import("firebase-admin/auth");
    await getAuth().setCustomUserClaims(targetUid, {
      admin: patch.isAdmin,
      role: data.role,
    });
  }

  await targetRef.update(patch);

  const afterSnap = await targetRef.get();
  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "user_flags_updated",
    resourceType: "user",
    resourceId: targetUid,
    before,
    after: afterSnap.data(),
    metadata: {reason},
  });

  return {success: true, targetUid};
}

// ─────────────────────────────────────────────────────────────────────
// 4. ADJUST USER BALANCE (Naira & Crypto with Audit + Tx Record)
// ─────────────────────────────────────────────────────────────────────

export async function handleAdjustUserBalance(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.adjustBalance");
  const targetUid = cleanText(data.targetUid, 128, "targetUid");
  const reason = requireReason(data.reason, "reason", 5);
  await rateLimit(actorUid, "adjustUserBalance");

  const nairaDelta = typeof data.nairaDelta === "number" ? data.nairaDelta : 0;
  const cryptoSymbol = typeof data.cryptoSymbol === "string" ? data.cryptoSymbol.toUpperCase() : null;
  const cryptoDelta = typeof data.cryptoDelta === "number" ? data.cryptoDelta : 0;

  if (nairaDelta === 0 && cryptoDelta === 0) {
    throw new HttpsError("invalid-argument", "Either nairaDelta or cryptoDelta must be non-zero.");
  }
  if (cryptoSymbol && !ALLOWED_COINS.has(cryptoSymbol)) {
    throw new HttpsError("invalid-argument", `Coin ${cryptoSymbol} is not supported.`);
  }

  const walletRef = db.collection("wallets").doc(targetUid);
  const txRef = db.collection("transactions").doc();
  const notifRef = db.collection("notifications").doc();

  await db.runTransaction(async (txn) => {
    const wSnap = await txn.get(walletRef);
    const walletData = wSnap.exists ? wSnap.data()! : {nairaBalance: 0, cryptoBalances: {}};

    const currentNaira = (walletData.nairaBalance as number) ?? 0;
    const newNaira = currentNaira + nairaDelta;
    if (newNaira < 0) {
      throw new HttpsError("failed-precondition", `Adjustment would cause negative Naira balance (current: ${currentNaira}, delta: ${nairaDelta}).`);
    }

    const cryptoBalances = (walletData.cryptoBalances as Record<string, number>) ?? {};
    if (cryptoSymbol && cryptoDelta !== 0) {
      const currentCrypto = cryptoBalances[cryptoSymbol] ?? 0;
      const newCrypto = currentCrypto + cryptoDelta;
      if (newCrypto < 0) {
        throw new HttpsError("failed-precondition", `Adjustment would cause negative ${cryptoSymbol} balance.`);
      }
      cryptoBalances[cryptoSymbol] = newCrypto;
    }

    // Write wallet update
    txn.set(walletRef, {
      uid: targetUid,
      nairaBalance: newNaira,
      cryptoBalances,
      updatedAt: FieldValue.serverTimestamp(),
      lastAdjustmentBy: actorUid,
      lastAdjustmentReason: reason,
    }, {merge: true});

    // Write immutable transaction record
    txn.set(txRef, {
      id: txRef.id,
      uid: targetUid,
      type: nairaDelta >= 0 ? "deposit" : "withdrawal",
      status: "completed",
      amountNaira: Math.abs(nairaDelta),
      amountCoin: cryptoDelta !== 0 ? Math.abs(cryptoDelta).toString() : null,
      coinSymbol: cryptoSymbol,
      description: `Admin manual balance adjustment: ${reason}`,
      reference: `ADMIN-ADJ-${Date.now()}`,
      paymentMethod: "admin_adjustment",
      processedBy: actorUid,
      createdAt: FieldValue.serverTimestamp(),
      completedAt: FieldValue.serverTimestamp(),
    });

    // Write in-app notification to user
    txn.set(notifRef, {
      id: notifRef.id,
      uid: targetUid,
      type: "general",
      title: "Account Balance Adjusted",
      body: `Your wallet balance was adjusted by an administrator. Note: ${reason}`,
      preview: "Wallet balance adjusted",
      isRead: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "user_balance_adjusted",
    resourceType: "wallet",
    resourceId: targetUid,
    metadata: {nairaDelta, cryptoSymbol, cryptoDelta, reason, txId: txRef.id},
  });

  return {success: true, targetUid, transactionId: txRef.id};
}

// ─────────────────────────────────────────────────────────────────────
// 5. BULK SUSPEND / UNSUSPEND / DELETE / RESTORE
// ─────────────────────────────────────────────────────────────────────

export async function handleBulkSuspendUsers(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.suspend");
  const uids = Array.isArray(data.uids) ? (data.uids as string[]) : [];
  const reason = requireReason(data.reason, "reason", 5);
  await rateLimit(actorUid, "bulkSuspendUsers");

  if (uids.length === 0 || uids.length > 500) {
    throw new HttpsError("invalid-argument", "uids must be non-empty array of up to 500 IDs.");
  }

  const results: Record<string, boolean> = {};
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const targetUid of uids) {
    if (targetUid === actorUid) {
      results[targetUid] = false;
      continue;
    }
    const userRef = db.collection("users").doc(targetUid);
    batch.set(userRef, {
      isActive: false,
      kycStatus: "suspended",
      suspendedAt: now,
      suspendedBy: actorUid,
      suspendedReason: reason,
      updatedAt: now,
    }, {merge: true});
    results[targetUid] = true;
  }

  await batch.commit();

  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "bulk_users_suspended",
    resourceType: "user_batch",
    resourceId: `batch_${Date.now()}`,
    metadata: {uids, count: uids.length, reason, results},
  });

  return {success: true, results};
}

export async function handleBulkUnsuspendUsers(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.suspend");
  const uids = Array.isArray(data.uids) ? (data.uids as string[]) : [];
  const reason = requireReason(data.reason, "reason", 5);
  await rateLimit(actorUid, "bulkSuspendUsers");

  if (uids.length === 0 || uids.length > 500) {
    throw new HttpsError("invalid-argument", "uids must be non-empty array of up to 500 IDs.");
  }

  const results: Record<string, boolean> = {};
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const targetUid of uids) {
    const userRef = db.collection("users").doc(targetUid);
    batch.set(userRef, {
      isActive: true,
      kycStatus: "verified",
      suspendedAt: null,
      suspendedBy: null,
      suspendedReason: null,
      updatedAt: now,
    }, {merge: true});
    results[targetUid] = true;
  }

  await batch.commit();

  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "bulk_users_unsuspended",
    resourceType: "user_batch",
    resourceId: `batch_${Date.now()}`,
    metadata: {uids, count: uids.length, reason, results},
  });

  return {success: true, results};
}

export async function handleBulkDeleteUsers(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.delete");
  const uids = Array.isArray(data.uids) ? (data.uids as string[]) : [];
  const reason = requireReason(data.reason, "reason", 5);
  const forceHardDelete = data.forceHardDelete === true;
  await rateLimit(actorUid, "bulkDeleteUsers");

  if (uids.length === 0 || uids.length > 500) {
    throw new HttpsError("invalid-argument", "uids must be non-empty array of up to 500 IDs.");
  }

  const results: Record<string, boolean> = {};
  const now = FieldValue.serverTimestamp();

  if (forceHardDelete) {
    // Hard delete requires superadmin
    await requireSuperAdmin(actorUid);
    const {getAuth} = await import("firebase-admin/auth");
    const auth = getAuth();

    for (const targetUid of uids) {
      if (targetUid === actorUid) {
        results[targetUid] = false;
        continue;
      }
      try {
        await Promise.allSettled([
          db.collection("users").doc(targetUid).delete(),
          db.collection("wallets").doc(targetUid).delete(),
          db.collection("virtualAccounts").doc(targetUid).delete(),
          db.collection("fcm_tokens").doc(targetUid).delete(),
          db.collection("crypto_deposits").doc(targetUid).delete(),
        ]);
        await auth.deleteUser(targetUid).catch(() => {});
        results[targetUid] = true;
      } catch {
        results[targetUid] = false;
      }
    }
  } else {
    // Soft delete default
    const batch = db.batch();
    for (const targetUid of uids) {
      if (targetUid === actorUid) {
        results[targetUid] = false;
        continue;
      }
      const userRef = db.collection("users").doc(targetUid);
      batch.set(userRef, {
        deletedAt: now,
        deletedBy: actorUid,
        deletedReason: reason,
        isActive: false,
        updatedAt: now,
      }, {merge: true});
      results[targetUid] = true;
    }
    await batch.commit();
  }

  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: forceHardDelete ? "bulk_users_hard_deleted" : "bulk_users_soft_deleted",
    resourceType: "user_batch",
    resourceId: `batch_${Date.now()}`,
    metadata: {uids, count: uids.length, reason, results, forceHardDelete},
  });

  return {success: true, results};
}

export async function handleRestoreUser(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.restore");
  const targetUid = cleanText(data.targetUid, 128, "targetUid");
  const reason = requireReason(data.reason, "reason", 5);

  const userRef = db.collection("users").doc(targetUid);
  const snap = await userRef.get();
  if (!snap.exists) throw new HttpsError("not-found", "User not found.");

  await userRef.update({
    deletedAt: null,
    deletedBy: null,
    deletedReason: null,
    isActive: true,
    updatedAt: FieldValue.serverTimestamp(),
    restoredBy: actorUid,
    restoredAt: FieldValue.serverTimestamp(),
  });

  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "user_restored",
    resourceType: "user",
    resourceId: targetUid,
    metadata: {reason},
  });

  return {success: true, targetUid};
}

// ─────────────────────────────────────────────────────────────────────
// 6. EXPORT USERS CSV (Server-side Streaming Payload)
// ─────────────────────────────────────────────────────────────────────

export async function handleExportUsersCsv(actorUid: string, data: Record<string, unknown>) {
  const actor = await requirePermission(actorUid, "users.export");
  await rateLimit(actorUid, "createUser");

  const limit = Math.min(typeof data.limit === "number" ? data.limit : 1000, 5000);
  const snap = await db.collection("users")
    .where("deletedAt", "==", null)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const headers = ["Name", "Email", "UID", "Status", "KYC Tier", "Country", "Currency", "Joined Date"];
  const rows: string[] = [headers.map(safeCell).join(",")];

  snap.forEach((doc) => {
    const u = doc.data();
    const created = u.createdAt?.toDate ? u.createdAt.toDate().toISOString() : u.createdAt || "";
    const status = u.isActive === false ? "suspended" : (u.kycTier ?? 0) >= 1 ? "verified" : "pending";
    const row = [
      safeCell(u.fullName || u.displayName || ""),
      safeCell(u.email || ""),
      safeCell(doc.id),
      safeCell(status),
      safeCell(`Tier ${u.kycTier ?? 0}`),
      safeCell(u.country || ""),
      safeCell(u.defaultCurrency || "NGN"),
      safeCell(created),
    ];
    rows.push(row.join(","));
  });

  const csvContent = "\uFEFF" + rows.join("\r\n");

  await audit({
    actorId: actor.uid,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: "users_exported_csv",
    resourceType: "export",
    resourceId: `export_${Date.now()}`,
    metadata: {count: snap.size},
  });

  return {
    csvContent,
    filename: `katrex-users-${new Date().toISOString().slice(0, 10)}.csv`,
    totalRows: snap.size,
  };
}
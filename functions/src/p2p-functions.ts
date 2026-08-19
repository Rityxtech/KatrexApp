/**
 * P2P Account-Selling Platform Cloud Functions.
 *
 * QUOTA-SMART DESIGN: All 13 callable actions are routed through a single
 * `p2pApi` onCall function (1 Cloud Run service) + 1 scheduled `cronP2PAutoRelease`
 * (1 Cloud Run service) = 2 services total instead of 14.
 *
 * Client calls:  httpsCallable('p2pApi')({ action: 'createListing', ...payload })
 *
 * Full lifecycle:
 *  1. Seller creates listing        → createListing (status: pending)
 *  2. Admin approves/rejects        → approveListing / rejectListing
 *  3. Buyer purchases               → buyListing (escrow locked)
 *  4. Seller sends credentials      → sendCredentials
 *  4b. Buyer/seller chat            → sendMessage
 *  5. Buyer releases funds          → releaseEscrow
 *  6. Dispute path                  → openDispute → resolveDispute (admin)
 *  7. Admin manual overrides        → releaseEscrowManual / refundEscrow
 *  7c. Admin settings               → updateSettings
 *  7d. Admin ban seller             → banSeller
 *  8. Timeout handling              → cronP2PAutoRelease (scheduled)
 *
 * All wallet/escrow mutations happen server-side via Firestore transactions
 * so the client can never fake a release or skip a balance check.
 */
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {
  getFirestore,
  Timestamp,
} from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

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

function finiteNumber(value: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value;
}

/**
 * Relist a listing back to "live" status so another buyer can purchase it.
 * Called when a trade is cancelled or refunded (buyer gets money back, seller
 * keeps the account). Only relists if the listing is currently "sold".
 */
async function relistListing(listingId: string): Promise<void> {
  if (!listingId) return;
  try {
    const listingRef = db.collection("p2p_listings").doc(listingId);
    const listingDoc = await listingRef.get();
    if (listingDoc.exists && listingDoc.data()!.status === "sold") {
      await listingRef.update({status: "live", soldAt: null, updatedAt: new Date()});
      logger.info(`Listing ${listingId} relisted (trade cancelled/refunded)`);
    }
  } catch (e) {
    logger.warn(`Failed to relist listing ${listingId}: ${e}`);
  }
}

/** Mask a handle like "@style_1234" → "@style_****" for public listings. */
function maskHandle(handle: string): string {
  const at = handle.startsWith("@") ? "@" : "";
  const clean = handle.replace(/^@/, "");
  if (clean.length <= 2) return `${at}${clean[0] ?? ""}*`;
  return `${at}${clean.slice(0, clean.length - 4).replace(/./g, "*")}${clean.slice(-4)}`;
}

/** Read P2P settings, with defaults if the doc doesn't exist yet. */
async function getP2PSettings() {
  const snap = await db.collection("app_settings").doc("p2p").get();
  const data = snap.data();
  return {
    escrowFeePercent: data?.escrowFeePercent ?? 10,
    autoApproveListings: data?.autoApproveListings ?? false,
    minFollowers: data?.minFollowers ?? 100,
    maxListingsPerUser: data?.maxListingsPerUser ?? 10,
    disputeTimeoutHours: data?.disputeTimeoutHours ?? 24,
    escrowReleaseTimeoutHours: data?.escrowReleaseTimeoutHours ?? 72,
    bannedPlatforms: (data?.bannedPlatforms as string[]) ?? [],
  };
}

/** Create an in-app notification for a user. */
async function notify(uid: string, title: string, body: string, type = "p2p") {
  const ref = db.collection("notifications").doc();
  await ref.set({
    id: ref.id,
    uid,
    type,
    title,
    body,
    isRead: false,
    createdAt: new Date(),
  });
}

// ===========================================================================
// HANDLER: createListing (seller)
// ===========================================================================

async function handleCreateListing(uid: string, data: Record<string, unknown>) {
  const {
    platform, handle, title, niche, followers, verified, priceNaira, priceType,
  } = data as {
    platform: string; handle: string; title: string; niche: string;
    followers: number; verified: boolean; priceNaira: number; priceType: string;
  };

  const validPlatform = requiredString(platform, "platform", 30);
  const validHandle = requiredString(handle, "handle", 100);
  const validTitle = requiredString(title, "title", 100);
  const validNiche = requiredString(niche, "niche", 50);
  const validPriceType = requiredString(priceType, "priceType", 20);
  const followerCount = finiteNumber(followers, "followers", 0, 1000000000);
  const price = finiteNumber(priceNaira, "priceNaira", 1000, 100000000);

  const settings = await getP2PSettings();

  const sellerDoc = await db.collection("users").doc(uid).get();
  if (!sellerDoc.exists) throw new HttpsError("not-found", "User profile not found.");
  const sellerData = sellerDoc.data()!;
  if (sellerData.p2pBlocked === true) {
    throw new HttpsError("permission-denied", "Your selling access is restricted. Contact support.");
  }
  if (settings.bannedPlatforms.includes(validPlatform)) {
    throw new HttpsError("failed-precondition", "This platform is not supported for sales.");
  }
  if (followerCount < settings.minFollowers) {
    throw new HttpsError("failed-precondition", `Account must have at least ${settings.minFollowers} followers.`);
  }

  const existingListings = await db.collection("p2p_listings")
    .where("sellerUid", "==", uid)
    .where("status", "in", ["pending", "live"])
    .get();
  if (existingListings.size >= settings.maxListingsPerUser) {
    throw new HttpsError("failed-precondition", `You can have at most ${settings.maxListingsPerUser} active listings.`);
  }

  const sellerName = (sellerData.fullName as string) || (sellerData.username as string) || "Seller";
  const sellerAvatarUrl = (sellerData.avatarUrl as string) || "";
  const sellerRating = (sellerData.p2pRating as number) ?? 0;
  const sellerTrades = (sellerData.p2pTrades as number) ?? 0;

  const listingRef = db.collection("p2p_listings").doc();
  const status = settings.autoApproveListings ? "live" : "pending";
  await listingRef.set({
    id: listingRef.id,
    sellerUid: uid,
    sellerName, sellerAvatarUrl, sellerRating, sellerTrades,
    platform: validPlatform,
    handle: maskHandle(validHandle),
    fullHandle: validHandle,
    title: validTitle, niche: validNiche,
    followers: followerCount,
    verified: verified === true,
    priceNaira: price,
    priceType: validPriceType,
    status,
    rejectionReason: null,
    adminId: null,
    reportCount: 0,
    createdAt: new Date(),
    approvedAt: status === "live" ? new Date() : null,
    soldAt: null,
  });

  if (status === "pending") {
    await notify("admin", "New Listing Pending Review",
      `${sellerName} submitted "${validTitle}" (${validPlatform}) for \u20A6${price.toLocaleString()}.`);
  }
  await notify(uid, status === "live" ? "Listing Live!" : "Listing Submitted",
    status === "live"
      ? `Your listing "${validTitle}" is now live in the marketplace.`
      : `Your listing "${validTitle}" is under review. Approval takes ~2 hours.`);

  logger.info(`P2P listing created: ${listingRef.id} by ${uid} (${status})`);
  return {listingId: listingRef.id, status};
}

// ===========================================================================
// HANDLER: approveListing (admin)
// ===========================================================================

async function handleApproveListing(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const {listingId} = data as {listingId: string};
  if (!listingId) throw new HttpsError("invalid-argument", "listingId is required.");

  const listingRef = db.collection("p2p_listings").doc(listingId);
  const listingDoc = await listingRef.get();
  if (!listingDoc.exists) throw new HttpsError("not-found", "Listing not found.");
  if (listingDoc.data()!.status !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending listings can be approved.");
  }

  await listingRef.update({status: "live", approvedAt: new Date(), adminId: uid});
  await notify(listingDoc.data()!.sellerUid, "Listing Approved!",
    `Your listing "${listingDoc.data()!.title}" is now live in the marketplace.`);

  logger.info(`Listing ${listingId} approved by ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: rejectListing (admin)
// ===========================================================================

async function handleRejectListing(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const {listingId, reason} = data as {listingId: string; reason: string};
  if (!listingId) throw new HttpsError("invalid-argument", "listingId is required.");
  const rejectionReason = requiredString(reason, "reason", 500);

  const listingRef = db.collection("p2p_listings").doc(listingId);
  const listingDoc = await listingRef.get();
  if (!listingDoc.exists) throw new HttpsError("not-found", "Listing not found.");
  if (listingDoc.data()!.status !== "pending") {
    throw new HttpsError("failed-precondition", "Only pending listings can be rejected.");
  }

  await listingRef.update({status: "rejected", rejectionReason, adminId: uid});
  await notify(listingDoc.data()!.sellerUid, "Listing Rejected",
    `Your listing "${listingDoc.data()!.title}" was rejected: ${rejectionReason}. You can edit and resubmit.`);

  logger.info(`Listing ${listingId} rejected by ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: buyListing (buyer) — locks escrow atomically
// ===========================================================================

async function handleBuyListing(uid: string, data: Record<string, unknown>) {
  const {listingId} = data as {listingId: string};
  if (!listingId) throw new HttpsError("invalid-argument", "listingId is required.");

  const settings = await getP2PSettings();

  const tradeId = await db.runTransaction(async (tx) => {
    const listingRef = db.collection("p2p_listings").doc(listingId);
    const listingDoc = await tx.get(listingRef);
    if (!listingDoc.exists) throw new HttpsError("not-found", "Listing not found.");
    const listing = listingDoc.data()!;
    if (listing.status !== "live") throw new HttpsError("failed-precondition", "This listing is no longer available.");
    if (listing.sellerUid === uid) throw new HttpsError("failed-precondition", "You cannot buy your own listing.");

    const buyerWalletRef = db.collection("wallets").doc(uid);
    const buyerWalletDoc = await tx.get(buyerWalletRef);
    if (!buyerWalletDoc.exists) throw new HttpsError("failed-precondition", "Wallet not found. Please fund your wallet first.");
    const buyerBalance = (buyerWalletDoc.data()!.nairaBalance as number) ?? 0;

    const price = listing.priceNaira as number;
    // Platform fee is deducted from the seller's payout, NOT added on top
    // of the buyer's payment. Buyer pays the listing price; seller receives
    // price - fee; admin receives fee.
    const escrowFee = Math.round(price * (settings.escrowFeePercent / 100));
    const total = price;

    if (buyerBalance < total) {
      throw new HttpsError("failed-precondition",
        `Insufficient balance. Need \u20A6${total.toLocaleString()}, have \u20A6${buyerBalance.toLocaleString()}.`);
    }

    const sellerWalletRef = db.collection("wallets").doc(listing.sellerUid);
    const sellerWalletDoc = await tx.get(sellerWalletRef);
    const sellerEscrow = sellerWalletDoc.exists ? ((sellerWalletDoc.data()!.escrowBalance as number) ?? 0) : 0;

    tx.update(buyerWalletRef, {nairaBalance: buyerBalance - total, updatedAt: new Date()});
    tx.set(sellerWalletRef, {uid: listing.sellerUid, escrowBalance: sellerEscrow + total, updatedAt: new Date()}, {merge: true});
    tx.update(listingRef, {status: "sold", soldAt: new Date()});

    const tradeRef = db.collection("p2p_trades").doc();
    tx.set(tradeRef, {
      id: tradeRef.id, listingId,
      listingSnapshot: {
        platform: listing.platform, title: listing.title, handle: listing.handle,
        fullHandle: listing.fullHandle, niche: listing.niche, followers: listing.followers,
        verified: listing.verified,
        icon: listing.icon ?? null, bgColor: listing.bgColor ?? null,
        bgGradient: listing.bgGradient ?? null, borderColor: listing.borderColor ?? null,
        shadowColor: listing.shadowColor ?? null,
      },
      buyerUid: uid, sellerUid: listing.sellerUid,
      participants: [uid, listing.sellerUid],
      priceNaira: price, escrowFeeNaira: escrowFee, totalNaira: total,
      status: "escrow_locked", escrowStatus: "locked",
      escrowReleasedAt: null, disputeOpenedAt: null,
      autoReleased: false, adminId: null,
      createdAt: new Date(), updatedAt: new Date(),
    });

    // Record transaction for buyer (debit)
    const buyerTxRef = db.collection("transactions").doc();
    tx.set(buyerTxRef, {
      id: buyerTxRef.id,
      uid,
      type: "p2p_purchase",
      status: "escrow_locked",
      amountNaira: total,
      amountCoin: null,
      coinSymbol: null,
      description: `P2P purchase: ${listing.title} (${listing.platform})`,
      reference: `P2P_BUY_${tradeRef.id}`,
      paymentMethod: "internal",
      tradeId: tradeRef.id,
      createdAt: new Date(),
      completedAt: null,
    });

    const msgRef = db.collection("p2p_messages").doc();
    tx.set(msgRef, {
      id: msgRef.id, tradeId: tradeRef.id, senderUid: "system", senderRole: "system",
      type: "escrow", text: null, title: "Funds Secured in Escrow",
      body: `\u20A6${total.toLocaleString()} has been deducted from your wallet and locked. The seller has been notified to send the account credentials.`,
      attachmentUrl: null, read: false, createdAt: new Date(),
    });

    // Automatic buyer introduction message — sent on behalf of the buyer
    // so the seller knows the buyer is ready to proceed.
    const buyerMsgRef = db.collection("p2p_messages").doc();
    tx.set(buyerMsgRef, {
      id: buyerMsgRef.id, tradeId: tradeRef.id, senderUid: uid, senderRole: "buyer",
      type: "text",
      text: `Hi! I just purchased this account and my funds are locked in escrow. Please send the login credentials (username, password, and original recovery email if available) as soon as possible. Make sure 2FA is disabled so I can secure the account. Thanks!`,
      title: null, body: null, body2: null,
      attachmentUrl: null, read: false, createdAt: new Date(),
    });

    return tradeRef.id;
  });

  const tradeDoc = await db.collection("p2p_trades").doc(tradeId).get();
  const tradeData = tradeDoc.data()!;
  await notify(tradeData.sellerUid, "New Sale! Funds in Escrow",
    `Your listing "${tradeData.listingSnapshot.title}" was purchased. Send the account credentials to release your funds.`);
  await notify(uid, "Purchase Confirmed",
    `Funds locked in escrow for "${tradeData.listingSnapshot.title}". Wait for the seller to send credentials.`);

  logger.info(`P2P trade ${tradeId} created for listing ${listingId}`);
  return {tradeId};
}

// ===========================================================================
// HANDLER: sendCredentials (seller)
// ===========================================================================

async function handleSendCredentials(uid: string, data: Record<string, unknown>) {
  const {tradeId, text, attachmentUrl} = data as {tradeId: string; text: string; attachmentUrl?: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");
  const messageText = requiredString(text, "text", 5000);
  const attachment = attachmentUrl ? requiredString(attachmentUrl, "attachmentUrl", 2000) : null;

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.sellerUid !== uid) throw new HttpsError("permission-denied", "Only the seller can send credentials.");
  if (trade.status !== "escrow_locked" && trade.status !== "credentials_sent") {
    throw new HttpsError("failed-precondition", "Cannot send credentials for this trade in its current state.");
  }

  const msgRef = db.collection("p2p_messages").doc();
  await msgRef.set({
    id: msgRef.id, tradeId, senderUid: uid, senderRole: "seller", type: "credentials",
    text: messageText, title: null, body: null, attachmentUrl: attachment,
    read: false, createdAt: new Date(),
  });

  const actionRef = db.collection("p2p_messages").doc();
  await actionRef.set({
    id: actionRef.id, tradeId, senderUid: "system", senderRole: "system", type: "action",
    text: null, title: "Action Required",
    body: "The seller has provided the credentials. Please log in to the account, secure it by changing the password and recovery email.",
    body2: "Once secured, click \"Release Funds\" below. DO NOT release funds before securing the account.",
    attachmentUrl: null, read: false, createdAt: new Date(),
  });

  await tradeRef.update({status: "credentials_sent", updatedAt: new Date()});
  await notify(trade.buyerUid, "Credentials Sent",
    `The seller has sent the account credentials for "${trade.listingSnapshot.title}". Secure the account, then release funds.`);

  logger.info(`Credentials sent for trade ${tradeId} by seller ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: sendMessage (buyer or seller) — generic chat
// ===========================================================================

async function handleSendMessage(uid: string, data: Record<string, unknown>) {
  const {tradeId, text} = data as {tradeId: string; text: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");
  const messageText = requiredString(text, "text", 5000);

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.buyerUid !== uid && trade.sellerUid !== uid) {
    throw new HttpsError("permission-denied", "Only trade participants can send messages.");
  }
  if (trade.status === "released" || trade.status === "refunded" || trade.status === "cancelled") {
    throw new HttpsError("failed-precondition", "This trade is closed.");
  }

  const role = trade.buyerUid === uid ? "buyer" : "seller";
  const msgRef = db.collection("p2p_messages").doc();
  await msgRef.set({
    id: msgRef.id, tradeId, senderUid: uid, senderRole: role, type: "text",
    text: messageText, title: null, body: null, body2: null,
    attachmentUrl: null, read: false, createdAt: new Date(),
  });

  return {success: true};
}

// ===========================================================================
// HANDLER: releaseEscrow (buyer) — releases funds to seller atomically
// ===========================================================================

async function handleReleaseEscrow(uid: string, data: Record<string, unknown>) {
  const {tradeId} = data as {tradeId: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");

  await db.runTransaction(async (tx) => {
    const tradeRef = db.collection("p2p_trades").doc(tradeId);
    const tradeDoc = await tx.get(tradeRef);
    if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
    const trade = tradeDoc.data()!;
    if (trade.buyerUid !== uid) throw new HttpsError("permission-denied", "Only the buyer can release escrow.");
    if (trade.escrowStatus !== "locked") throw new HttpsError("failed-precondition", "Escrow is not locked (already released or frozen).");
    if (trade.status !== "credentials_sent" && trade.status !== "buyer_secured") {
      throw new HttpsError("failed-precondition", "Wait for the seller to send credentials before releasing.");
    }

    const total = trade.totalNaira as number;
    const platformFee = trade.escrowFeeNaira as number;
    const sellerPayout = total - platformFee;

    const sellerWalletRef = db.collection("wallets").doc(trade.sellerUid);
    const platformWalletRef = db.collection("wallets").doc("platform_revenue");

    // ALL reads before ANY writes
    const sellerWalletDoc = await tx.get(sellerWalletRef);
    const platformWalletDoc = await tx.get(platformWalletRef);
    const sellerEscrow = (sellerWalletDoc.data()?.escrowBalance as number) ?? 0;
    const sellerBalance = (sellerWalletDoc.data()?.nairaBalance as number) ?? 0;
    const platformBalance = (platformWalletDoc.data()?.nairaBalance as number) ?? 0;

    tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - total, 0), nairaBalance: sellerBalance + sellerPayout, updatedAt: new Date()});

    if (platformFee > 0) {
      tx.set(platformWalletRef, {uid: "platform_revenue", nairaBalance: platformBalance + platformFee, updatedAt: new Date()}, {merge: true});
    }

    tx.update(tradeRef, {status: "released", escrowStatus: "released", escrowReleasedAt: new Date(), updatedAt: new Date()});

    // Record transaction for seller (credit)
    const sellerTxRef = db.collection("transactions").doc();
    tx.set(sellerTxRef, {
      id: sellerTxRef.id,
      uid: trade.sellerUid,
      type: "p2p_sale",
      status: "completed",
      amountNaira: sellerPayout,
      amountCoin: null,
      coinSymbol: null,
      description: `P2P sale: ${trade.listingSnapshot.title} (${trade.listingSnapshot.platform})`,
      reference: `P2P_SELL_${tradeId}`,
      paymentMethod: "internal",
      tradeId,
      createdAt: new Date(),
      completedAt: new Date(),
    });

    // Update buyer's original purchase transaction to completed
    tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "completed", completedAt: new Date()}, {merge: true});

    const msgRef = db.collection("p2p_messages").doc();
    tx.set(msgRef, {
      id: msgRef.id, tradeId, senderUid: "system", senderRole: "system", type: "escrow",
      text: null, title: "Funds Released",
      body: `\u20A6${sellerPayout.toLocaleString()} has been sent to the seller. Trade complete.`,
      attachmentUrl: null, read: false, createdAt: new Date(),
    });
  });

  const tradeDoc = await db.collection("p2p_trades").doc(tradeId).get();
  const trade = tradeDoc.data()!;
  const sellerRef = db.collection("users").doc(trade.sellerUid);
  const sellerDoc = await sellerRef.get();
  const sellerData = sellerDoc.data()!;
  await sellerRef.update({p2pTrades: ((sellerData.p2pTrades as number) ?? 0) + 1});

  await notify(trade.sellerUid, "Funds Released!",
    `\u20A6${(trade.totalNaira - trade.escrowFeeNaira).toLocaleString()} has been credited to your wallet for "${trade.listingSnapshot.title}".`);
  await notify(trade.buyerUid, "Trade Complete",
    `You released funds for "${trade.listingSnapshot.title}". Don't forget to rate the seller.`);

  logger.info(`Escrow released for trade ${tradeId} by buyer ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: openDispute (buyer or seller)
// ===========================================================================

async function handleOpenDispute(uid: string, data: Record<string, unknown>) {
  const {tradeId, reason, details, evidenceUrls} = data as {
    tradeId: string; reason: string; details?: string; evidenceUrls?: string[];
  };
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");
  const validReason = requiredString(reason, "reason", 200);
  const validDetails = details ? requiredString(details, "details", 2000) : "";
  const evidence = Array.isArray(evidenceUrls) ? evidenceUrls.slice(0, 10) : [];

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.buyerUid !== uid && trade.sellerUid !== uid) {
    throw new HttpsError("permission-denied", "Only trade participants can open a dispute.");
  }
  if (trade.status === "released" || trade.status === "refunded" || trade.status === "cancelled") {
    throw new HttpsError("failed-precondition", "Cannot dispute a completed/cancelled trade.");
  }
  if (trade.status === "disputed") throw new HttpsError("failed-precondition", "A dispute is already open for this trade.");

  const openedBy = trade.buyerUid === uid ? "buyer" : "seller";

  await tradeRef.update({status: "disputed", escrowStatus: "frozen", disputeOpenedAt: new Date(), disputeOpenedBy: openedBy, updatedAt: new Date()});

  const disputeRef = db.collection("p2p_disputes").doc();
  await disputeRef.set({
    id: disputeRef.id, tradeId, buyerUid: trade.buyerUid, sellerUid: trade.sellerUid,
    openedBy, openedAfterStatus: trade.status, reason: validReason, details: validDetails, evidenceUrls: evidence,
    adminId: null, resolution: null, status: "open", createdAt: new Date(), resolvedAt: null,
  });

  const msgRef = db.collection("p2p_messages").doc();
  await msgRef.set({
    id: msgRef.id, tradeId, senderUid: "system", senderRole: "system", type: "dispute",
    text: null, title: "Dispute Opened",
    body: `${openedBy === "buyer" ? "Buyer" : "Seller"} opened a dispute: ${validReason}. Escrow funds are frozen. An admin will mediate.`,
    attachmentUrl: null, read: false, createdAt: new Date(),
  });

  // Post the dispute details as a chat message from the user who opened it
  // so both parties can see the context in the chat window.
  if (validDetails) {
    const detailsMsgRef = db.collection("p2p_messages").doc();
    await detailsMsgRef.set({
      id: detailsMsgRef.id, tradeId, senderUid: uid, senderRole: openedBy, type: "text",
      text: `\ud83d\udea9 Dispute: ${validReason}\n\n${validDetails}`,
      title: null, body: null, body2: null,
      attachmentUrl: null, read: false, createdAt: new Date(),
    });
  }

  // Post each evidence image as a separate message with an attachment
  for (const url of evidence) {
    const imgMsgRef = db.collection("p2p_messages").doc();
    await imgMsgRef.set({
      id: imgMsgRef.id, tradeId, senderUid: uid, senderRole: openedBy, type: "text",
      text: "\ud83d\udcf7 Evidence",
      title: null, body: null, body2: null,
      attachmentUrl: url, read: false, createdAt: new Date(),
    });
  }

  const otherUid = openedBy === "buyer" ? trade.sellerUid : trade.buyerUid;
  await notify("admin", "P2P Dispute Opened", `Trade #${tradeId.slice(0, 8)}: ${validReason}. Escrow frozen \u2014 review required.`);
  await notify(otherUid, "Dispute Opened", `The ${openedBy} opened a dispute on your trade. Escrow is frozen while admin reviews.`);

  logger.info(`Dispute opened for trade ${tradeId} by ${openedBy} (${uid})`);
  return {disputeId: disputeRef.id};
}

// ===========================================================================
// HANDLER: closeDispute (the person who opened it can close it)
// ===========================================================================

async function handleCloseDispute(uid: string, data: Record<string, unknown>) {
  const {tradeId} = data as {tradeId: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.buyerUid !== uid && trade.sellerUid !== uid) {
    throw new HttpsError("permission-denied", "Only trade participants can close a dispute.");
  }
  if (trade.status !== "disputed") throw new HttpsError("failed-precondition", "This trade is not disputed.");

  // Find the open dispute for this trade
  const disputeSnap = await db.collection("p2p_disputes")
    .where("tradeId", "==", tradeId)
    .where("status", "==", "open")
    .limit(1)
    .get();
  if (disputeSnap.empty) throw new HttpsError("not-found", "No open dispute found for this trade.");
  const disputeDoc = disputeSnap.docs[0];
  const dispute = disputeDoc.data();

  // Only the person who opened the dispute can close it
  if (dispute.openedBy === "buyer" && trade.buyerUid !== uid) {
    throw new HttpsError("permission-denied", "Only the buyer (who opened this dispute) can close it.");
  }
  if (dispute.openedBy === "seller" && trade.sellerUid !== uid) {
    throw new HttpsError("permission-denied", "Only the seller (who opened this dispute) can close it.");
  }

  // Revert trade to its previous state (escrow_locked or credentials_sent)
  // We restore based on whether credentials were already sent before the dispute.
  const previousStatus = dispute.openedAfterStatus || "escrow_locked";
  const previousEscrow = previousStatus === "credentials_sent" ? "locked" : "locked";

  await tradeRef.update({
    status: previousStatus,
    escrowStatus: previousEscrow,
    disputeOpenedAt: null,
    disputeOpenedBy: null,
    updatedAt: new Date(),
  });

  await disputeDoc.ref.update({status: "closed", closedBy: uid, closedAt: new Date()});

  const msgRef = db.collection("p2p_messages").doc();
  await msgRef.set({
    id: msgRef.id, tradeId, senderUid: "system", senderRole: "system", type: "dispute",
    text: null, title: "Dispute Closed",
    body: `The ${dispute.openedBy} closed the dispute. The trade has resumed.`,
    attachmentUrl: null, read: false, createdAt: new Date(),
  });

  const otherUid = dispute.openedBy === "buyer" ? trade.sellerUid : trade.buyerUid;
  await notify(otherUid, "Dispute Closed", `The ${dispute.openedBy} closed the dispute on your trade. The trade has resumed.`);

  logger.info(`Dispute closed for trade ${tradeId} by ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: concedeDispute — the non-disputing party accepts the dispute
// claim and agrees to refund/release escrow.
// ===========================================================================

async function handleConcedeDispute(uid: string, data: Record<string, unknown>) {
  const {tradeId} = data as {tradeId: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.buyerUid !== uid && trade.sellerUid !== uid) {
    throw new HttpsError("permission-denied", "Only trade participants can concede a dispute.");
  }
  if (trade.status !== "disputed") throw new HttpsError("failed-precondition", "This trade is not disputed.");

  // Find the open dispute
  const disputeSnap = await db.collection("p2p_disputes")
    .where("tradeId", "==", tradeId)
    .where("status", "==", "open")
    .limit(1)
    .get();
  if (disputeSnap.empty) throw new HttpsError("not-found", "No open dispute found for this trade.");
  const disputeDoc = disputeSnap.docs[0];
  const dispute = disputeDoc.data();

  // Only the person who DID NOT open the dispute can concede
  if (dispute.openedBy === "buyer" && trade.buyerUid === uid) {
    throw new HttpsError("permission-denied", "You opened this dispute. Use 'Close Dispute' instead.");
  }
  if (dispute.openedBy === "seller" && trade.sellerUid === uid) {
    throw new HttpsError("permission-denied", "You opened this dispute. Use 'Close Dispute' instead.");
  }

  // The conceding party agrees to the dispute claim.
  // If buyer opened dispute → seller concedes → refund buyer
  // If seller opened dispute → buyer concedes → release to seller
  const shouldRefundBuyer = dispute.openedBy === "buyer";

  await db.runTransaction(async (tx) => {
    // ALL reads before ANY writes
    const tDoc = await tx.get(tradeRef);
    const t = tDoc.data()!;
    const totalAmount = t.totalNaira as number;
    const escrowFeeAmount = t.escrowFeeNaira as number;

    const sellerWalletRef = db.collection("wallets").doc(t.sellerUid);
    const buyerWalletRef = db.collection("wallets").doc(t.buyerUid);
    const sellerWalletDoc = await tx.get(sellerWalletRef);
    const buyerWalletDoc = await tx.get(buyerWalletRef);
    const sellerEscrow = (sellerWalletDoc.data()?.escrowBalance as number) ?? 0;
    const buyerBalance = (buyerWalletDoc.data()?.nairaBalance as number) ?? 0;
    const sellerBalance = (sellerWalletDoc.data()?.nairaBalance as number) ?? 0;

    if (shouldRefundBuyer) {
      // Refund buyer: return escrow to buyer wallet
      tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - totalAmount, 0), updatedAt: new Date()});
      tx.update(buyerWalletRef, {nairaBalance: buyerBalance + totalAmount, updatedAt: new Date()});
      tx.update(tradeRef, {status: "refunded", escrowStatus: "refunded", disputeOpenedBy: null, updatedAt: new Date()});

      // Record refund transaction for buyer
      const refundTxRef = db.collection("transactions").doc();
      tx.set(refundTxRef, {
        id: refundTxRef.id, uid: t.buyerUid, type: "p2p_refund", status: "completed",
        amountNaira: totalAmount, amountCoin: null, coinSymbol: null,
        description: `P2P refund (dispute conceded by seller): ${t.listingSnapshot.title} (${t.listingSnapshot.platform})`,
        reference: `P2P_REFUND_${tradeId}`, paymentMethod: "internal", tradeId,
        createdAt: new Date(), completedAt: new Date(),
      });
      tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "refunded", completedAt: new Date()}, {merge: true});
    } else {
      // Release to seller: credit seller wallet
      tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - totalAmount, 0), nairaBalance: sellerBalance + (totalAmount - escrowFeeAmount), updatedAt: new Date()});
      tx.update(tradeRef, {status: "released", escrowStatus: "released", disputeOpenedBy: null, updatedAt: new Date()});

      // Record sale transaction for seller
      const saleTxRef = db.collection("transactions").doc();
      tx.set(saleTxRef, {
        id: saleTxRef.id, uid: t.sellerUid, type: "p2p_sale", status: "completed",
        amountNaira: totalAmount - escrowFeeAmount, amountCoin: null, coinSymbol: null,
        description: `P2P sale (dispute conceded by buyer): ${t.listingSnapshot.title} (${t.listingSnapshot.platform})`,
        reference: `P2P_SALE_${tradeId}`, paymentMethod: "internal", tradeId,
        createdAt: new Date(), completedAt: new Date(),
      });
      tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "completed", completedAt: new Date()}, {merge: true});
    }
  });

  // Close the dispute
  await disputeDoc.ref.update({status: "resolved", resolution: shouldRefundBuyer ? "refund_buyer" : "release_seller", resolvedBy: uid, resolvedAt: new Date(), concededBy: uid});

  // System message
  const concedingRole = shouldRefundBuyer ? "Seller" : "Buyer";
  const outcome = shouldRefundBuyer ? "Buyer has been refunded." : "Funds have been released to the seller.";
  const msgRef = db.collection("p2p_messages").doc();
  await msgRef.set({
    id: msgRef.id, tradeId, senderUid: "system", senderRole: "system", type: "dispute",
    text: null, title: "Dispute Resolved",
    body: `The ${concedingRole} accepted the dispute claim. ${outcome}`,
    attachmentUrl: null, read: false, createdAt: new Date(),
  });

  const openerUid = dispute.openedBy === "buyer" ? trade.buyerUid : trade.sellerUid;
  await notify(openerUid, "Dispute Resolved", `The other party accepted your dispute claim. ${outcome}`);
  await notify("admin", "P2P Dispute Resolved", `Trade #${tradeId.slice(0, 8)}: ${concedingRole} conceded. ${outcome}`);

  // Relist the listing if the buyer was refunded
  if (shouldRefundBuyer) {
    await relistListing(trade.listingId);
  }

  logger.info(`Dispute conceded for trade ${tradeId} by ${uid} (refund=${shouldRefundBuyer})`);
  return {success: true};
}

// ===========================================================================
// HANDLER: resolveDispute (admin)
// ===========================================================================

async function handleResolveDispute(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const {disputeId, resolution, adminComment, splitRatio} = data as {
    disputeId: string; resolution: string; adminComment?: string; splitRatio?: number;
  };
  if (!disputeId) throw new HttpsError("invalid-argument", "disputeId is required.");
  const validResolution = requiredString(resolution, "resolution", 30);
  if (!["release_to_seller", "refund_buyer", "split"].includes(validResolution)) {
    throw new HttpsError("invalid-argument", "resolution must be release_to_seller, refund_buyer, or split.");
  }
  const comment = adminComment ? requiredString(adminComment, "adminComment", 1000) : null;
  let ratio = 0;
  if (validResolution === "split") {
    ratio = finiteNumber(splitRatio ?? 0, "splitRatio", 0, 1);
  }

  const disputeRef = db.collection("p2p_disputes").doc(disputeId);
  const disputeDoc = await disputeRef.get();
  if (!disputeDoc.exists) throw new HttpsError("not-found", "Dispute not found.");
  const dispute = disputeDoc.data()!;
  if (dispute.status !== "open") throw new HttpsError("failed-precondition", "Dispute is already resolved.");

  const tradeRef = db.collection("p2p_trades").doc(dispute.tradeId);
  const tradeDocPre = await tradeRef.get();
  if (!tradeDocPre.exists) throw new HttpsError("not-found", "Trade not found.");
  const listingIdForRelist = tradeDocPre.data()!.listingId as string;

  await db.runTransaction(async (tx) => {
    const tradeDoc = await tx.get(tradeRef);
    if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
    const trade = tradeDoc.data()!;
    if (trade.escrowStatus !== "frozen") throw new HttpsError("failed-precondition", "Escrow is not frozen.");

    const total = trade.totalNaira as number;
    const platformFee = trade.escrowFeeNaira as number;
    const sellerWalletRef = db.collection("wallets").doc(trade.sellerUid);
    const buyerWalletRef = db.collection("wallets").doc(trade.buyerUid);
    const platformWalletRef = db.collection("wallets").doc("platform_revenue");

    // ALL reads must happen before ANY writes in a Firestore transaction.
    const sellerWalletDoc = await tx.get(sellerWalletRef);
    const buyerWalletDoc = await tx.get(buyerWalletRef);
    const platformWalletDoc = await tx.get(platformWalletRef);

    const sellerEscrow = (sellerWalletDoc.data()?.escrowBalance as number) ?? 0;
    const sellerBalance = (sellerWalletDoc.data()?.nairaBalance as number) ?? 0;
    const buyerBalance = (buyerWalletDoc.data()?.nairaBalance as number) ?? 0;
    const platformBalance = (platformWalletDoc.data()?.nairaBalance as number) ?? 0;

    let buyerRefund = 0;
    let sellerPayout = 0;
    let newStatus = "released";
    let newEscrowStatus = "released";

    if (validResolution === "release_to_seller") {
      sellerPayout = total - platformFee;
    } else if (validResolution === "refund_buyer") {
      buyerRefund = total;
      newStatus = "refunded";
      newEscrowStatus = "refunded";
    } else {
      buyerRefund = Math.round(total * ratio);
      sellerPayout = total - buyerRefund - platformFee;
    }

    // Writes (all after reads)
    tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - total, 0), nairaBalance: sellerBalance + sellerPayout, updatedAt: new Date()});

    if (buyerRefund > 0) {
      tx.update(buyerWalletRef, {nairaBalance: buyerBalance + buyerRefund, updatedAt: new Date()});
    }

    if (platformFee > 0 && validResolution !== "refund_buyer") {
      tx.set(platformWalletRef, {uid: "platform_revenue", nairaBalance: platformBalance + platformFee, updatedAt: new Date()}, {merge: true});
    }

    tx.update(tradeRef, {status: newStatus, escrowStatus: newEscrowStatus, escrowReleasedAt: new Date(), disputeOpenedBy: null, updatedAt: new Date()});

    // Record transactions for dispute resolution
    const tradeId = dispute.tradeId;
    const now = new Date();

    if (validResolution === "release_to_seller") {
      // Seller gets payout — record sale transaction
      const sellerTxRef = db.collection("transactions").doc();
      tx.set(sellerTxRef, {
        id: sellerTxRef.id, uid: trade.sellerUid, type: "p2p_sale", status: "completed",
        amountNaira: sellerPayout, amountCoin: null, coinSymbol: null,
        description: `P2P sale (dispute resolved): ${trade.listingSnapshot.title} (${trade.listingSnapshot.platform})`,
        reference: `P2P_SELL_${tradeId}`, paymentMethod: "internal", tradeId,
        createdAt: now, completedAt: now,
      });
      // Update buyer's purchase transaction to completed
      tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "completed", completedAt: now}, {merge: true});
    } else if (validResolution === "refund_buyer") {
      // Buyer gets full refund — record refund transaction
      const buyerTxRef = db.collection("transactions").doc();
      tx.set(buyerTxRef, {
        id: buyerTxRef.id, uid: trade.buyerUid, type: "p2p_refund", status: "completed",
        amountNaira: buyerRefund, amountCoin: null, coinSymbol: null,
        description: `P2P refund (dispute resolved): ${trade.listingSnapshot.title} (${trade.listingSnapshot.platform})`,
        reference: `P2P_REFUND_${tradeId}`, paymentMethod: "internal", tradeId,
        createdAt: now, completedAt: now,
      });
      // Update buyer's purchase transaction to refunded
      tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "refunded", completedAt: now}, {merge: true});
    } else {
      // Split — record both seller payout and buyer refund
      if (sellerPayout > 0) {
        const sellerTxRef = db.collection("transactions").doc();
        tx.set(sellerTxRef, {
          id: sellerTxRef.id, uid: trade.sellerUid, type: "p2p_sale", status: "completed",
          amountNaira: sellerPayout, amountCoin: null, coinSymbol: null,
          description: `P2P sale (split resolution): ${trade.listingSnapshot.title} (${trade.listingSnapshot.platform})`,
          reference: `P2P_SELL_${tradeId}`, paymentMethod: "internal", tradeId,
          createdAt: now, completedAt: now,
        });
      }
      if (buyerRefund > 0) {
        const buyerTxRef = db.collection("transactions").doc();
        tx.set(buyerTxRef, {
          id: buyerTxRef.id, uid: trade.buyerUid, type: "p2p_refund", status: "completed",
          amountNaira: buyerRefund, amountCoin: null, coinSymbol: null,
          description: `P2P refund (split resolution): ${trade.listingSnapshot.title} (${trade.listingSnapshot.platform})`,
          reference: `P2P_REFUND_${tradeId}`, paymentMethod: "internal", tradeId,
          createdAt: now, completedAt: now,
        });
      }
      tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "completed", completedAt: now}, {merge: true});
    }

    const msgRef = db.collection("p2p_messages").doc();
    tx.set(msgRef, {
      id: msgRef.id, tradeId: dispute.tradeId, senderUid: "system", senderRole: "system", type: "dispute",
      text: null, title: "Dispute Resolved",
      body: `Admin resolved: ${validResolution.replace(/_/g, " ")}.${comment ? ` ${comment}` : ""}`,
      attachmentUrl: null, read: false, createdAt: new Date(),
    });
  });

  await disputeRef.update({
    status: "resolved", resolution: validResolution, adminComment: comment,
    splitRatio: ratio, adminId: uid, resolvedAt: new Date(),
  });

  await notify(dispute.buyerUid, "Dispute Resolved", `Admin resolved your dispute: ${validResolution.replace(/_/g, " ")}.${comment ? ` ${comment}` : ""}`);
  await notify(dispute.sellerUid, "Dispute Resolved", `Admin resolved your dispute: ${validResolution.replace(/_/g, " ")}.${comment ? ` ${comment}` : ""}`);

  // Relist the listing if the buyer was refunded (not released to seller)
  if (validResolution === "refund_buyer") {
    await relistListing(listingIdForRelist);
  }

  logger.info(`Dispute ${disputeId} resolved by ${uid}: ${validResolution}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: releaseEscrowManual (admin)
// ===========================================================================

async function handleReleaseEscrowManual(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const {tradeId} = data as {tradeId: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.escrowStatus !== "locked" && trade.escrowStatus !== "frozen") {
    throw new HttpsError("failed-precondition", "Escrow is not locked/frozen.");
  }

  await db.runTransaction(async (tx) => {
    const tDoc = await tx.get(tradeRef);
    const t = tDoc.data()!;
    const total = t.totalNaira as number;
    const platformFee = t.escrowFeeNaira as number;
    const sellerPayout = total - platformFee;

    const sellerWalletRef = db.collection("wallets").doc(t.sellerUid);
    const platformWalletRef = db.collection("wallets").doc("platform_revenue");

    // ALL reads before ANY writes
    const sellerWalletDoc = await tx.get(sellerWalletRef);
    const platformWalletDoc = await tx.get(platformWalletRef);
    const sellerEscrow = (sellerWalletDoc.data()?.escrowBalance as number) ?? 0;
    const sellerBalance = (sellerWalletDoc.data()?.nairaBalance as number) ?? 0;
    const platformBalance = (platformWalletDoc.data()?.nairaBalance as number) ?? 0;

    tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - total, 0), nairaBalance: sellerBalance + sellerPayout, updatedAt: new Date()});

    if (platformFee > 0) {
      tx.set(platformWalletRef, {uid: "platform_revenue", nairaBalance: platformBalance + platformFee, updatedAt: new Date()}, {merge: true});
    }

    tx.update(tradeRef, {status: "released", escrowStatus: "released", escrowReleasedAt: new Date(), disputeOpenedBy: null, adminId: uid, updatedAt: new Date()});

    // Record sale transaction for seller
    const sellerTxRef = db.collection("transactions").doc();
    tx.set(sellerTxRef, {
      id: sellerTxRef.id, uid: t.sellerUid, type: "p2p_sale", status: "completed",
      amountNaira: sellerPayout, amountCoin: null, coinSymbol: null,
      description: `P2P sale (admin release): ${t.listingSnapshot.title} (${t.listingSnapshot.platform})`,
      reference: `P2P_SELL_${tradeId}`, paymentMethod: "internal", tradeId,
      createdAt: new Date(), completedAt: new Date(),
    });
    // Update buyer's purchase transaction to completed
    tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "completed", completedAt: new Date()}, {merge: true});
  });

  await notify(trade.buyerUid, "Escrow Released (Admin)", `Admin manually released escrow for trade #${tradeId.slice(0, 8)}.`);
  await notify(trade.sellerUid, "Funds Released (Admin)", `Admin manually released \u20A6${(trade.totalNaira - trade.escrowFeeNaira).toLocaleString()} to your wallet.`);

  logger.info(`Manual escrow release for trade ${tradeId} by admin ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: refundEscrow (admin)
// ===========================================================================

async function handleRefundEscrow(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const {tradeId} = data as {tradeId: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.escrowStatus !== "locked" && trade.escrowStatus !== "frozen") {
    throw new HttpsError("failed-precondition", "Escrow is not locked/frozen.");
  }

  await db.runTransaction(async (tx) => {
    const tDoc = await tx.get(tradeRef);
    const t = tDoc.data()!;
    const total = t.totalNaira as number;

    const sellerWalletRef = db.collection("wallets").doc(t.sellerUid);
    const buyerWalletRef = db.collection("wallets").doc(t.buyerUid);

    // ALL reads before ANY writes
    const sellerWalletDoc = await tx.get(sellerWalletRef);
    const buyerWalletDoc = await tx.get(buyerWalletRef);
    const sellerEscrow = (sellerWalletDoc.data()?.escrowBalance as number) ?? 0;
    const buyerBalance = (buyerWalletDoc.data()?.nairaBalance as number) ?? 0;

    tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - total, 0), updatedAt: new Date()});
    tx.update(buyerWalletRef, {nairaBalance: buyerBalance + total, updatedAt: new Date()});
    tx.update(tradeRef, {status: "refunded", escrowStatus: "refunded", disputeOpenedBy: null, adminId: uid, updatedAt: new Date()});

    // Record refund transaction for buyer
    const refundTxRef = db.collection("transactions").doc();
    tx.set(refundTxRef, {
      id: refundTxRef.id, uid: t.buyerUid, type: "p2p_refund", status: "completed",
      amountNaira: total, amountCoin: null, coinSymbol: null,
      description: `P2P refund (admin refund): ${t.listingSnapshot.title} (${t.listingSnapshot.platform})`,
      reference: `P2P_REFUND_${tradeId}`, paymentMethod: "internal", tradeId,
      createdAt: new Date(), completedAt: new Date(),
    });
    // Update buyer's purchase transaction to refunded
    tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "refunded", completedAt: new Date()}, {merge: true});
  });

  await notify(trade.buyerUid, "Escrow Refunded (Admin)", `Admin refunded \u20A6${trade.totalNaira.toLocaleString()} to your wallet for trade #${tradeId.slice(0, 8)}.`);
  await notify(trade.sellerUid, "Escrow Refunded (Admin)", `Admin refunded the buyer for trade #${tradeId.slice(0, 8)}. No funds were sent to you.`);

  // Relist the listing since the buyer was refunded
  await relistListing(trade.listingId);

  logger.info(`Manual escrow refund for trade ${tradeId} by admin ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: updateSettings (admin)
// ===========================================================================

async function handleUpdateSettings(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);

  const update: Record<string, unknown> = {};
  if (typeof data.escrowFeePercent === "number") {
    update.escrowFeePercent = finiteNumber(data.escrowFeePercent, "escrowFeePercent", 0, 100);
  }
  if (typeof data.autoApproveListings === "boolean") update.autoApproveListings = data.autoApproveListings;
  if (typeof data.minFollowers === "number") update.minFollowers = finiteNumber(data.minFollowers, "minFollowers", 0, 100000000);
  if (typeof data.maxListingsPerUser === "number") update.maxListingsPerUser = finiteNumber(data.maxListingsPerUser, "maxListingsPerUser", 1, 1000);
  if (typeof data.disputeTimeoutHours === "number") update.disputeTimeoutHours = finiteNumber(data.disputeTimeoutHours, "disputeTimeoutHours", 1, 720);
  if (typeof data.escrowReleaseTimeoutHours === "number") update.escrowReleaseTimeoutHours = finiteNumber(data.escrowReleaseTimeoutHours, "escrowReleaseTimeoutHours", 1, 720);
  if (Array.isArray(data.bannedPlatforms)) {
    update.bannedPlatforms = (data.bannedPlatforms as unknown[]).filter((v): v is string => typeof v === "string");
  }

  if (Object.keys(update).length === 0) throw new HttpsError("invalid-argument", "No valid settings provided.");

  await db.collection("app_settings").doc("p2p").set(update, {merge: true});
  logger.info(`P2P settings updated by ${uid}: ${JSON.stringify(update)}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: banSeller (admin)
// ===========================================================================

async function handleBanSeller(uid: string, data: Record<string, unknown>) {
  await requireAdmin(uid);
  const {uid: targetUid, banned} = data as {uid: string; banned: boolean};
  if (!targetUid) throw new HttpsError("invalid-argument", "uid is required.");
  if (typeof banned !== "boolean") throw new HttpsError("invalid-argument", "banned must be boolean.");

  await db.collection("users").doc(targetUid).update({p2pBlocked: banned});

  if (banned) {
    const liveListings = await db.collection("p2p_listings")
      .where("sellerUid", "==", targetUid)
      .where("status", "==", "live")
      .get();
    const batch = db.batch();
    liveListings.docs.forEach((doc) => batch.update(doc.ref, {status: "delisted"}));
    await batch.commit();
  }

  await notify(targetUid, banned ? "Selling Access Restricted" : "Selling Access Restored",
    banned ? "Your P2P selling access has been restricted by admin. Contact support for details."
           : "Your P2P selling access has been restored.");

  logger.info(`P2P seller ${targetUid} ${banned ? "banned" : "unbanned"} by ${uid}`);
  return {success: true};
}

// ===========================================================================
// HANDLER: cancelTrade (buyer or seller) — cancels before credentials sent
// ===========================================================================

async function handleCancelTrade(uid: string, data: Record<string, unknown>) {
  const {tradeId} = data as {tradeId: string};
  if (!tradeId) throw new HttpsError("invalid-argument", "tradeId is required.");

  const tradeRef = db.collection("p2p_trades").doc(tradeId);
  const tradeDoc = await tradeRef.get();
  if (!tradeDoc.exists) throw new HttpsError("not-found", "Trade not found.");
  const trade = tradeDoc.data()!;
  if (trade.buyerUid !== uid && trade.sellerUid !== uid) {
    throw new HttpsError("permission-denied", "Only trade participants can cancel.");
  }
  // Only allow cancellation before credentials are sent
  if (trade.status !== "escrow_locked") {
    throw new HttpsError("failed-precondition",
      "This trade can no longer be cancelled. Open a dispute if there's an issue.");
  }

  await db.runTransaction(async (tx) => {
    const tDoc = await tx.get(tradeRef);
    const t = tDoc.data()!;
    if (t.status !== "escrow_locked") return; // changed since we read
    const total = t.totalNaira as number;

    const buyerWalletRef = db.collection("wallets").doc(t.buyerUid);
    const sellerWalletRef = db.collection("wallets").doc(t.sellerUid);

    // ALL reads before ANY writes
    const buyerWalletDoc = await tx.get(buyerWalletRef);
    const sellerWalletDoc = await tx.get(sellerWalletRef);
    const buyerBalance = (buyerWalletDoc.data()?.nairaBalance as number) ?? 0;
    const sellerEscrow = (sellerWalletDoc.data()?.escrowBalance as number) ?? 0;

    // Refund buyer
    tx.update(buyerWalletRef, {nairaBalance: buyerBalance + total, updatedAt: new Date()});
    // Release seller escrow
    tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - total, 0), updatedAt: new Date()});

    // Mark trade as cancelled
    tx.update(tradeRef, {status: "cancelled", escrowStatus: "refunded", updatedAt: new Date()});

    // Record refund transaction for buyer
    const refundTxRef = db.collection("transactions").doc();
    tx.set(refundTxRef, {
      id: refundTxRef.id, uid: t.buyerUid, type: "p2p_refund", status: "completed",
      amountNaira: total, amountCoin: null, coinSymbol: null,
      description: `P2P refund (trade cancelled): ${t.listingSnapshot.title} (${t.listingSnapshot.platform})`,
      reference: `P2P_REFUND_${tradeId}`, paymentMethod: "internal", tradeId,
      createdAt: new Date(), completedAt: new Date(),
    });
    // Update buyer's purchase transaction to cancelled
    tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeId}`), {status: "cancelled", completedAt: new Date()}, {merge: true});

    // System message
    const msgRef = db.collection("p2p_messages").doc();
    tx.set(msgRef, {
      id: msgRef.id, tradeId, senderUid: "system", senderRole: "system", type: "escrow",
      text: null, title: "Trade Cancelled",
      body: `\u20A6${total.toLocaleString()} has been refunded to the buyer. The trade is now cancelled.`,
      attachmentUrl: null, read: false, createdAt: new Date(),
    });
  });

  // Relist the listing since the trade was cancelled before delivery
  await relistListing(trade.listingId);

  await notify(trade.buyerUid, "Trade Cancelled",
    `Your trade was cancelled and \u20A6${trade.totalNaira.toLocaleString()} has been refunded to your wallet.`);
  await notify(trade.sellerUid, "Trade Cancelled",
    `The trade was cancelled. The buyer has been refunded and your listing is back live.`);

  logger.info(`Trade ${tradeId} cancelled by ${uid}`);
  return {success: true};
}

// ===========================================================================
// ROUTER: p2pApi — single onCall that dispatches to all handlers above
// ===========================================================================

const HANDLERS: Record<string, (uid: string, data: Record<string, unknown>) => Promise<unknown>> = {
  createListing: handleCreateListing,
  approveListing: handleApproveListing,
  rejectListing: handleRejectListing,
  buyListing: handleBuyListing,
  sendCredentials: handleSendCredentials,
  sendMessage: handleSendMessage,
  releaseEscrow: handleReleaseEscrow,
  cancelTrade: handleCancelTrade,
  openDispute: handleOpenDispute,
  closeDispute: handleCloseDispute,
  concedeDispute: handleConcedeDispute,
  resolveDispute: handleResolveDispute,
  releaseEscrowManual: handleReleaseEscrowManual,
  refundEscrow: handleRefundEscrow,
  updateSettings: handleUpdateSettings,
  banSeller: handleBanSeller,
};

export const p2pApi = onCall(
  {region: "us-central1", memory: "256MiB", cors: true},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const uid = request.auth.uid;
    const data = (request.data ?? {}) as Record<string, unknown>;
    const action = data.action as string;
    if (!action || !HANDLERS[action]) {
      throw new HttpsError("invalid-argument",
        `Unknown action "${action}". Available: ${Object.keys(HANDLERS).join(", ")}`);
    }
    // Strip the `action` key so handlers get a clean payload
    const payload = {...data};
    delete payload.action;
    logger.info(`p2pApi: action=${action} uid=${uid}`);
    return await HANDLERS[action](uid, payload);
  },
);

// ===========================================================================
// CRON: AUTO-RELEASE / AUTO-DISPUTE (scheduled, every 15 min)
// ===========================================================================

export const cronP2PAutoRelease = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1",
    memory: "256MiB",
  },
  async () => {
    const settings = await getP2PSettings();
    const now = Date.now();
    const disputeTimeoutMs = settings.disputeTimeoutHours * 3600 * 1000;
    const releaseTimeoutMs = settings.escrowReleaseTimeoutHours * 3600 * 1000;

    // Seller didn't deliver → auto-dispute
    const lockedTrades = await db.collection("p2p_trades")
      .where("status", "==", "escrow_locked")
      .get();

    for (const tradeDoc of lockedTrades.docs) {
      const trade = tradeDoc.data();
      const createdAt = (trade.createdAt as Timestamp)?.toMillis() ?? 0;
      if (now - createdAt > disputeTimeoutMs) {
        await tradeDoc.ref.update({
          status: "disputed", escrowStatus: "frozen",
          disputeOpenedAt: new Date(), updatedAt: new Date(),
        });
        const disputeRef = db.collection("p2p_disputes").doc();
        await disputeRef.set({
          id: disputeRef.id, tradeId: tradeDoc.id,
          buyerUid: trade.buyerUid, sellerUid: trade.sellerUid,
          openedBy: "system", reason: "Seller did not deliver credentials in time",
          details: "Auto-disputed by cron \u2014 seller failed to send credentials within the timeout window.",
          evidenceUrls: [], adminId: null, resolution: null,
          status: "open", createdAt: new Date(), resolvedAt: null,
        });
        await notify("admin", "Auto-Dispute: Seller Timeout",
          `Trade #${tradeDoc.id.slice(0, 8)} auto-disputed \u2014 seller didn't deliver in ${settings.disputeTimeoutHours}h.`);
        await notify(trade.buyerUid, "Dispute Auto-Opened",
          "The seller didn't deliver in time. A dispute has been opened and admin will review.");
        logger.info(`Auto-dispute for trade ${tradeDoc.id} (seller timeout)`);
      }
    }

    // Buyer didn't release → auto-release to seller
    const credSentTrades = await db.collection("p2p_trades")
      .where("status", "==", "credentials_sent")
      .get();

    for (const tradeDoc of credSentTrades.docs) {
      const trade = tradeDoc.data();
      const updatedAt = (trade.updatedAt as Timestamp)?.toMillis() ?? 0;
      if (now - updatedAt > releaseTimeoutMs) {
        await db.runTransaction(async (tx) => {
          const tDoc = await tx.get(tradeDoc.ref);
          const t = tDoc.data()!;
          if (t.status !== "credentials_sent") return;
          const total = t.totalNaira as number;
          const platformFee = t.escrowFeeNaira as number;
          const sellerPayout = total - platformFee;

          const sellerWalletRef = db.collection("wallets").doc(t.sellerUid);
          const platformWalletRef = db.collection("wallets").doc("platform_revenue");

          // ALL reads before ANY writes
          const sellerWalletDoc = await tx.get(sellerWalletRef);
          const platformWalletDoc = await tx.get(platformWalletRef);
          const sellerEscrow = (sellerWalletDoc.data()?.escrowBalance as number) ?? 0;
          const sellerBalance = (sellerWalletDoc.data()?.nairaBalance as number) ?? 0;
          const platformBalance = (platformWalletDoc.data()?.nairaBalance as number) ?? 0;

          tx.update(sellerWalletRef, {escrowBalance: Math.max(sellerEscrow - total, 0), nairaBalance: sellerBalance + sellerPayout, updatedAt: new Date()});

          if (platformFee > 0) {
            tx.set(platformWalletRef, {uid: "platform_revenue", nairaBalance: platformBalance + platformFee, updatedAt: new Date()}, {merge: true});
          }

          tx.update(tradeDoc.ref, {status: "released", escrowStatus: "released", escrowReleasedAt: new Date(), autoReleased: true, updatedAt: new Date()});

          // Record sale transaction for seller
          const sellerTxRef = db.collection("transactions").doc();
          tx.set(sellerTxRef, {
            id: sellerTxRef.id, uid: t.sellerUid, type: "p2p_sale", status: "completed",
            amountNaira: sellerPayout, amountCoin: null, coinSymbol: null,
            description: `P2P sale (auto-released): ${t.listingSnapshot.title} (${t.listingSnapshot.platform})`,
            reference: `P2P_SELL_${tradeDoc.id}`, paymentMethod: "internal", tradeId: tradeDoc.id,
            createdAt: new Date(), completedAt: new Date(),
          });
          // Update buyer's purchase transaction to completed
          tx.set(db.collection("transactions").doc(`P2P_BUY_${tradeDoc.id}`), {status: "completed", completedAt: new Date()}, {merge: true});

          const msgRef = db.collection("p2p_messages").doc();
          tx.set(msgRef, {
            id: msgRef.id, tradeId: tradeDoc.id, senderUid: "system", senderRole: "system", type: "escrow",
            text: null, title: "Funds Auto-Released",
            body: "Funds auto-released to seller (buyer did not respond in time).",
            attachmentUrl: null, read: false, createdAt: new Date(),
          });
        });
        await notify(trade.buyerUid, "Funds Auto-Released",
          `Funds for "${trade.listingSnapshot?.title ?? "your trade"}" were auto-released to the seller (no response in ${settings.escrowReleaseTimeoutHours}h).`);
        await notify(trade.sellerUid, "Funds Auto-Released",
          `Funds for "${trade.listingSnapshot?.title ?? "your trade"}" were auto-released to your wallet (buyer didn't respond in time).`);
        logger.info(`Auto-release for trade ${tradeDoc.id} (buyer timeout)`);
      }
    }

    // Escalate stale disputes (open > 48h)
    const openDisputes = await db.collection("p2p_disputes")
      .where("status", "==", "open")
      .get();
    for (const dDoc of openDisputes.docs) {
      const d = dDoc.data();
      const createdAt = (d.createdAt as Timestamp)?.toMillis() ?? 0;
      if (now - createdAt > 48 * 3600 * 1000) {
        await dDoc.ref.update({escalated: true});
        await notify("admin", "Dispute Escalated",
          `Dispute #${dDoc.id.slice(0, 8)} has been open >48h and needs urgent resolution.`);
      }
    }

    logger.info("P2P cron completed.");
  },
);

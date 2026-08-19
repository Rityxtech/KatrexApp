/**
 * Support System Cloud Functions — Tickets & Live Chat.
 *
 * QUOTA-SMART DESIGN: All callable actions are routed through a single
 * `supportApi` onCall function (1 Cloud Run service).
 *
 * Client calls:  httpsCallable('supportApi')({ action: 'createTicket', ...payload })
 *
 * Actions:
 *  USER:
 *   - createTicket       → Create a support ticket with first message
 *   - sendTicketMessage  → User replies to their ticket
 *   - startLiveChat      → Start or resume a live chat session
 *   - sendChatMessage    → User sends a message in live chat
 *   - closeLiveChat      → User closes their chat session
 *   - markTicketRead     → Reset user's unread count on a ticket
 *   - markChatRead       → Reset user's unread count on a chat
 *  ADMIN:
 *   - adminReplyTicket   → Admin replies to a ticket
 *   - updateTicketStatus → Admin changes ticket status/priority
 *   - adminAssignChat    → Admin assigns themselves to a waiting chat
 *   - adminSendChatMessage → Admin sends a message in live chat
 *   - adminCloseChat     → Admin closes a chat session
 */
import {onCall, HttpsError} from "firebase-functions/v2/https";
import {onSchedule} from "firebase-functions/v2/scheduler";
import {defineSecret} from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import {initializeApp} from "firebase-admin/app";
import {getFirestore, FieldValue} from "firebase-admin/firestore";
import {
  handleStartAiChat,
  handleSendAiChatMessage,
  handleCloseAiChat,
  handleMarkAiChatRead,
} from "./ai-support";

initializeApp();
const db = getFirestore();

// AI chat needs the Gemini API key. Defined here so the secret is granted
// to the supportApi Cloud Run service (the only place it's used).
const geminiApiKey = defineSecret("GEMINI_API_KEY");

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

function requiredString(value: unknown, field: string, maxLength = 2000): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value.trim();
}

function optionalString(value: unknown, field: string, maxLength = 2000): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string" || value.length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} is invalid.`);
  }
  return value.trim();
}

/** Generate a human-readable ticket ID like "TKT-A3F9X2" */
function generateTicketId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "TKT-";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

const VALID_CATEGORIES = [
  "Deposit / Withdrawal Issue",
  "Account Verification (KYC)",
  "Trade / Swap Issue",
  "Security & Authentication",
  "P2P / Marketplace",
  "Other",
];

const VALID_PRIORITIES = ["low", "medium", "high"];
const VALID_STATUSES = ["open", "pending", "resolved", "closed"];

// ===========================================================================
// USER ACTIONS
// ===========================================================================

/** Create a new support ticket with the first message. */
async function handleCreateTicket(uid: string, data: Record<string, unknown>) {
  const category = requiredString(data.category, "category", 100);
  const subject = requiredString(data.subject, "subject", 200);
  const description = requiredString(data.description, "description", 5000);
  const attachmentUrl = optionalString(data.attachmentUrl, "attachmentUrl", 2000);

  if (!VALID_CATEGORIES.includes(category)) {
    throw new HttpsError("invalid-argument", "Invalid category.");
  }

  // Get user info
  const userDoc = await db.collection("users").doc(uid).get();
  const userEmail = userDoc.data()?.email ?? "";
  const userName = userDoc.data()?.fullName ?? userDoc.data()?.displayName ?? "";

  const ticketId = generateTicketId();
  const ticketRef = db.collection("support_tickets").doc();
  const messageRef = db.collection("support_messages").doc();

  const now = new Date();

  const batch = db.batch();
  batch.set(ticketRef, {
    id: ticketRef.id,
    ticketId,
    uid,
    userEmail,
    userName,
    category,
    subject,
    description,
    status: "open",
    priority: "medium",
    messageCount: 1,
    lastMessageAt: now,
    lastMessageText: description,
    adminUnreadCount: 1,
    userUnreadCount: 0,
    attachmentUrls: attachmentUrl ? [attachmentUrl] : [],
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    closedAt: null,
  });

  batch.set(messageRef, {
    id: messageRef.id,
    ticketId: ticketRef.id,
    uid,
    senderUid: uid,
    senderRole: "user",
    senderName: userName,
    text: description,
    attachmentUrl: attachmentUrl || null,
    read: false,
    readAt: null,
    createdAt: now,
  });

  await batch.commit();
  logger.info(`Ticket ${ticketId} created by ${uid}`);
  return {success: true, ticketId};
}

/** User sends a follow-up message on their ticket. */
async function handleSendTicketMessage(uid: string, data: Record<string, unknown>) {
  const ticketId = requiredString(data.ticketId, "ticketId", 100);
  const text = requiredString(data.text, "text", 5000);
  const attachmentUrl = optionalString(data.attachmentUrl, "attachmentUrl", 2000);

  const ticketRef = db.collection("support_tickets").doc(ticketId);
  const ticketDoc = await ticketRef.get();
  if (!ticketDoc.exists) throw new HttpsError("not-found", "Ticket not found.");
  if (ticketDoc.data()!.uid !== uid) {
    throw new HttpsError("permission-denied", "You can only reply to your own tickets.");
  }
  if (ticketDoc.data()!.status === "closed") {
    throw new HttpsError("failed-precondition", "This ticket is closed.");
  }

  const userDoc = await db.collection("users").doc(uid).get();
  const userName = userDoc.data()?.fullName ?? userDoc.data()?.displayName ?? "";

  const messageRef = db.collection("support_messages").doc();
  const now = new Date();

  const batch = db.batch();
  batch.set(messageRef, {
    id: messageRef.id,
    ticketId,
    uid,
    senderUid: uid,
    senderRole: "user",
    senderName: userName,
    text,
    attachmentUrl: attachmentUrl || null,
    read: false,
    readAt: null,
    createdAt: now,
  });

  // Re-open if was resolved/pending
  const currentStatus = ticketDoc.data()!.status as string;
  const newStatus = currentStatus === "resolved" || currentStatus === "pending" ? "open" : currentStatus;

  batch.update(ticketRef, {
    messageCount: FieldValue.increment(1),
    lastMessageAt: now,
    lastMessageText: text,
    adminUnreadCount: FieldValue.increment(1),
    userUnreadCount: 0,
    status: newStatus,
    updatedAt: now,
  });

  await batch.commit();
  return {success: true};
}

/** Start or resume a live chat session. */
async function handleStartLiveChat(uid: string, data: Record<string, unknown>) {
  // Check if user already has an active chat
  const existingChats = await db.collection("support_chats")
    .where("uid", "==", uid)
    .where("status", "in", ["waiting", "active"])
    .limit(1)
    .get();

  if (!existingChats.empty) {
    const chatDoc = existingChats.docs[0];
    return {success: true, chatId: chatDoc.id, chat: chatDoc.data()};
  }

  // Get user info
  const userDoc = await db.collection("users").doc(uid).get();
  const userEmail = userDoc.data()?.email ?? "";
  const userName = userDoc.data()?.fullName ?? userDoc.data()?.displayName ?? "";

  const chatRef = db.collection("support_chats").doc();
  const now = new Date();

  await chatRef.set({
    id: chatRef.id,
    uid,
    userEmail,
    userName,
    status: "waiting",
    agentUid: null,
    agentName: null,
    lastMessageAt: now,
    lastMessageText: null,
    userUnreadCount: 0,
    adminUnreadCount: 0,
    createdAt: now,
    closedAt: null,
  });

  logger.info(`Live chat ${chatRef.id} started by ${uid}`);
  return {success: true, chatId: chatRef.id};
}

/** User sends a message in live chat. */
async function handleSendChatMessage(uid: string, data: Record<string, unknown>) {
  const chatId = requiredString(data.chatId, "chatId", 100);
  const text = requiredString(data.text, "text", 5000);

  const chatRef = db.collection("support_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  if (chatDoc.data()!.uid !== uid) {
    throw new HttpsError("permission-denied", "You can only send messages in your own chat.");
  }
  if (chatDoc.data()!.status === "closed") {
    throw new HttpsError("failed-precondition", "This chat is closed.");
  }

  const userDoc = await db.collection("users").doc(uid).get();
  const userName = userDoc.data()?.fullName ?? userDoc.data()?.displayName ?? "";

  const messageRef = db.collection("support_chat_messages").doc();
  const now = new Date();

  const batch = db.batch();
  batch.set(messageRef, {
    id: messageRef.id,
    chatId,
    uid,
    senderUid: uid,
    senderRole: "user",
    senderName: userName,
    text,
    read: false,
    readAt: null,
    createdAt: now,
  });

  batch.update(chatRef, {
    lastMessageAt: now,
    lastMessageText: text,
    adminUnreadCount: FieldValue.increment(1),
    userUnreadCount: 0,
  });

  await batch.commit();
  return {success: true};
}

/** User closes their live chat. */
async function handleCloseLiveChat(uid: string, data: Record<string, unknown>) {
  const chatId = requiredString(data.chatId, "chatId", 100);

  const chatRef = db.collection("support_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  if (chatDoc.data()!.uid !== uid) {
    throw new HttpsError("permission-denied", "You can only close your own chat.");
  }

  await chatRef.update({status: "closed", closedAt: new Date()});
  return {success: true};
}

/** User marks a ticket as read (resets their unread count). */
async function handleMarkTicketRead(uid: string, data: Record<string, unknown>) {
  const ticketId = requiredString(data.ticketId, "ticketId", 100);
  const ticketRef = db.collection("support_tickets").doc(ticketId);
  const ticketDoc = await ticketRef.get();
  if (!ticketDoc.exists) throw new HttpsError("not-found", "Ticket not found.");
  if (ticketDoc.data()!.uid !== uid) {
    throw new HttpsError("permission-denied", "Not your ticket.");
  }
  await ticketRef.update({userUnreadCount: 0});
  return {success: true};
}

/** User marks a chat as read (resets their unread count). */
async function handleMarkChatRead(uid: string, data: Record<string, unknown>) {
  const chatId = requiredString(data.chatId, "chatId", 100);
  const chatRef = db.collection("support_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  if (chatDoc.data()!.uid !== uid) {
    throw new HttpsError("permission-denied", "Not your chat.");
  }
  await chatRef.update({userUnreadCount: 0});
  return {success: true};
}

// ===========================================================================
// ADMIN ACTIONS
// ===========================================================================

/** Admin replies to a ticket. */
async function handleAdminReplyTicket(uid: string, data: Record<string, unknown>) {
  const ticketId = requiredString(data.ticketId, "ticketId", 100);
  const text = requiredString(data.text, "text", 5000);

  await requireAdmin(uid);

  const ticketRef = db.collection("support_tickets").doc(ticketId);
  const ticketDoc = await ticketRef.get();
  if (!ticketDoc.exists) throw new HttpsError("not-found", "Ticket not found.");

  const adminDoc = await db.collection("users").doc(uid).get();
  const adminName = adminDoc.data()?.fullName ?? adminDoc.data()?.displayName ?? "Support Agent";

  const messageRef = db.collection("support_messages").doc();
  const now = new Date();

  const batch = db.batch();
  batch.set(messageRef, {
    id: messageRef.id,
    ticketId,
    uid: ticketDoc.data()!.uid, // keep the ticket owner's uid for rules
    senderUid: uid,
    senderRole: "admin",
    senderName: adminName,
    text,
    attachmentUrl: null,
    read: false,
    readAt: null,
    createdAt: now,
  });

  batch.update(ticketRef, {
    messageCount: FieldValue.increment(1),
    lastMessageAt: now,
    lastMessageText: text,
    userUnreadCount: FieldValue.increment(1),
    adminUnreadCount: 0,
    status: "pending",
    updatedAt: now,
  });

  await batch.commit();
  logger.info(`Admin ${uid} replied to ticket ${ticketId}`);
  return {success: true};
}

/** Admin updates ticket status and/or priority. */
async function handleUpdateTicketStatus(uid: string, data: Record<string, unknown>) {
  const ticketId = requiredString(data.ticketId, "ticketId", 100);
  await requireAdmin(uid);

  const update: Record<string, unknown> = {updatedAt: new Date()};

  if (data.status) {
    const status = requiredString(data.status, "status", 20);
    if (!VALID_STATUSES.includes(status)) {
      throw new HttpsError("invalid-argument", "Invalid status.");
    }
    update.status = status;
    if (status === "resolved") update.resolvedAt = new Date();
    if (status === "closed") update.closedAt = new Date();
  }

  if (data.priority) {
    const priority = requiredString(data.priority, "priority", 20);
    if (!VALID_PRIORITIES.includes(priority)) {
      throw new HttpsError("invalid-argument", "Invalid priority.");
    }
    update.priority = priority;
  }

  const ticketRef = db.collection("support_tickets").doc(ticketId);
  const ticketDoc = await ticketRef.get();
  if (!ticketDoc.exists) throw new HttpsError("not-found", "Ticket not found.");

  await ticketRef.update(update);
  return {success: true};
}

/** Admin assigns themselves to a waiting chat. */
async function handleAdminAssignChat(uid: string, data: Record<string, unknown>) {
  const chatId = requiredString(data.chatId, "chatId", 100);
  await requireAdmin(uid);

  const adminDoc = await db.collection("users").doc(uid).get();
  const adminName = adminDoc.data()?.fullName ?? adminDoc.data()?.displayName ?? "Support Agent";

  const chatRef = db.collection("support_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  if (chatDoc.data()!.status === "closed") {
    throw new HttpsError("failed-precondition", "Chat is already closed.");
  }

  await chatRef.update({
    status: "active",
    agentUid: uid,
    agentName: adminName,
  });

  // System message
  const msgRef = db.collection("support_chat_messages").doc();
  await msgRef.set({
    id: msgRef.id,
    chatId,
    uid: chatDoc.data()!.uid,
    senderUid: uid,
    senderRole: "system",
    senderName: "System",
    text: `${adminName} has joined the chat.`,
    read: false,
    readAt: null,
    createdAt: new Date(),
  });

  return {success: true};
}

/** Admin sends a message in live chat. */
async function handleAdminSendChatMessage(uid: string, data: Record<string, unknown>) {
  const chatId = requiredString(data.chatId, "chatId", 100);
  const text = requiredString(data.text, "text", 5000);
  await requireAdmin(uid);

  const chatRef = db.collection("support_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  if (chatDoc.data()!.status === "closed") {
    throw new HttpsError("failed-precondition", "Chat is closed.");
  }

  const adminDoc = await db.collection("users").doc(uid).get();
  const adminName = adminDoc.data()?.fullName ?? adminDoc.data()?.displayName ?? "Support Agent";

  const messageRef = db.collection("support_chat_messages").doc();
  const now = new Date();

  const batch = db.batch();
  batch.set(messageRef, {
    id: messageRef.id,
    chatId,
    uid: chatDoc.data()!.uid, // keep the chat owner's uid for rules
    senderUid: uid,
    senderRole: "admin",
    senderName: adminName,
    text,
    read: false,
    readAt: null,
    createdAt: now,
  });

  batch.update(chatRef, {
    lastMessageAt: now,
    lastMessageText: text,
    userUnreadCount: FieldValue.increment(1),
    adminUnreadCount: 0,
    status: "active",
  });

  await batch.commit();
  return {success: true};
}

/** Admin closes a chat. */
async function handleAdminCloseChat(uid: string, data: Record<string, unknown>) {
  const chatId = requiredString(data.chatId, "chatId", 100);
  await requireAdmin(uid);

  const chatRef = db.collection("support_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");

  const batch = db.batch();
  batch.update(chatRef, {status: "closed", closedAt: new Date()});

  // System message
  const msgRef = db.collection("support_chat_messages").doc();
  batch.set(msgRef, {
    id: msgRef.id,
    chatId,
    uid: chatDoc.data()!.uid,
    senderUid: uid,
    senderRole: "system",
    senderName: "System",
    text: "Chat session closed by support agent.",
    read: false,
    readAt: null,
    createdAt: new Date(),
  });

  await batch.commit();
  return {success: true};
}

// ===========================================================================
// ROUTER: supportApi — single onCall that dispatches to all handlers
// ===========================================================================

type Handler = (
  uid: string,
  data: Record<string, unknown>,
  apiKey?: string,
) => Promise<unknown>;

const HANDLERS: Record<string, Handler> = {
  createTicket: handleCreateTicket,
  sendTicketMessage: handleSendTicketMessage,
  startLiveChat: handleStartLiveChat,
  sendChatMessage: handleSendChatMessage,
  closeLiveChat: handleCloseLiveChat,
  markTicketRead: handleMarkTicketRead,
  markChatRead: handleMarkChatRead,
  // AI chat — the user-facing live chat is now Gemini-backed. The
  // human-agent handlers above stay registered for the admin dashboard
  // and any future escalation flow, but the client no longer calls them.
  startAiChat: handleStartAiChat,
  sendAiChatMessage: handleSendAiChatMessage,
  closeAiChat: handleCloseAiChat,
  markAiChatRead: handleMarkAiChatRead,
  adminReplyTicket: handleAdminReplyTicket,
  updateTicketStatus: handleUpdateTicketStatus,
  adminAssignChat: handleAdminAssignChat,
  adminSendChatMessage: handleAdminSendChatMessage,
  adminCloseChat: handleAdminCloseChat,
};

// Handlers that need the Gemini API key. The router below reads
// `geminiApiKey.value()` and passes it to the matching handler.
const AI_HANDLER_NAMES = new Set(["sendAiChatMessage", "closeAiChat"]);

export const supportApi = onCall(
  {region: "us-central1", memory: "256MiB", minInstances: 2, cors: true, secrets: [geminiApiKey]},
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
    const payload = {...data};
    delete payload.action;
    logger.info(`supportApi: action=${action} uid=${uid}`);
    const handler = HANDLERS[action];
    if (AI_HANDLER_NAMES.has(action)) {
      return await handler(uid, payload, geminiApiKey.value());
    }
    return await handler(uid, payload);
  },
);

// ===========================================================================
// SCHEDULED: AI chat message TTL cleanup (90-day auto-cleanup)
// ===========================================================================
// Firestore TTL policies are set via Google Cloud Console, but this
// scheduled function provides a portable alternative. Runs daily and
// deletes ai_chat_messages older than 90 days in batches of 500.

const AI_CHAT_MESSAGE_TTL_DAYS = 90;

export const cleanupOldAiChatMessages = onSchedule(
  {schedule: "every 24 hours", region: "us-central1", memory: "256MiB", timeoutSeconds: 300},
  async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - AI_CHAT_MESSAGE_TTL_DAYS);
    logger.info(`Cleaning up ai_chat_messages older than ${cutoff.toISOString()}`);

    let totalDeleted = 0;
    let batchCount = 0;

    // Process in batches of 500 (Firestore batch limit)
    while (true) {
      const snap = await db.collection("ai_chat_messages")
        .where("createdAt", "<", cutoff)
        .limit(500)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      totalDeleted += snap.size;
      batchCount++;
      logger.info(`Deleted batch ${batchCount}: ${snap.size} messages`);

      // Safety: cap at 10,000 messages per run to avoid runaway deletes
      if (totalDeleted >= 10000) {
        logger.warn("Reached 10,000 message limit for this run. Will continue tomorrow.");
        break;
      }
    }

    logger.info(`Cleanup complete. Total deleted: ${totalDeleted} messages in ${batchCount} batches.`);
  },
);

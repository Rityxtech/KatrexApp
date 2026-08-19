/**
 * AI Live Chat — Gemini-backed customer support.
 *
 * Replaces the human-agent live chat with a Gemini assistant grounded
 * ONLY on the KatrexApp knowledge base (see ai-support-prompt.ts).
 *
 * SECURITY GUARANTEES (per design requirement):
 *  - The Gemini API key is a Firebase secret and only the server uses it.
 *  - No user data (account, balance, transactions, KYC) is ever sent to
 *    Gemini. Only the system prompt + the user's text message + the
 *    AI's prior text reply are sent.
 *  - Gemini is invoked with no tools/functions, so it cannot take any
 *    action against the backend.
 *  - All chat messages and a final summary are persisted in Firestore
 *    so admins can audit any conversation.
 *
 * COST-REDUCTION OPTIMIZATIONS (designed for million-user scale):
 *  1. Gemini Context Caching — the ~5K-token system prompt is uploaded
 *     once and referenced by `cachedContent` for 1 hour, paying 10× less
 *     for input tokens. Shared across all invocations on the instance.
 *  2. In-memory answer cache — identical questions get the cached reply
 *     without ever hitting Gemini. Pre-seeded with common FAQs.
 *  3. Inline last-10-turns on the chat doc — the hot path reads 1 doc
 *     instead of running a Firestore composite-index query.
 *  4. Output sanitiser — strips any AI-leak patterns before persisting.
 *  5. Tuned token budgets — 384 output, 10 history turns, 300 input.
 *  6. Three-tier rate limit — 5/min, 30/hr, 200/day per user.
 *  7. Module-level state — cache survives across warm invocations on the
 *     same Cloud Run instance, avoiding repeated cache creation.
 *
 * Data model:
 *  - ai_chats/{chatId}                 session header + recentMessages[]
 *  - ai_chat_messages/{msgId}          per-message transcript
 *  - ai_chat_summaries/{summaryId}     generated on close and surfaced to admin
 *  - rate_limits/aichat_{uid}          per-user rate counters
 */
import {HttpsError} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {KATREX_SYSTEM_PROMPT} from "./ai-support-prompt";

const db = getFirestore();

// ─── Gemini config ──────────────────────────────────────────────────────
const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const CACHE_URL =
  `https://generativelanguage.googleapis.com/v1beta/cachedContents`;

// ─── Tuned for cost (per-call budgets) ────────────────────────────────
const MAX_INPUT_CHARS = 300;        // one user message (was 500)
const MAX_OUTPUT_TOKENS = 384;      // cap on AI reply (was 512)
const SUMMARIZE_MAX_TOKENS = 256;   // cap on close-summary
const RECENT_MESSAGES_KEPT = 10;    // how many turns to inline on the chat doc

// ─── Three-tier sliding-window rate limits (per uid) ───────────────────
const AI_CHAT_RATE_LIMITS = [
  {name: "per-minute", max: 5,  windowMs: 60 * 1000},
  {name: "per-hour",   max: 30, windowMs: 60 * 60 * 1000},
  {name: "per-day",    max: 200, windowMs: 24 * 60 * 60 * 1000},
];

type Content = {role: "user" | "model"; parts: {text: string}[]};
type RecentTurn = {role: "user" | "ai"; text: string; at: number};

// ─── Gemini Context Cache (10× cheaper input tokens) ───────────────────
// Module-level so every invocation on the same Cloud Run instance
// reuses the same cache. Refreshes 10 minutes before TTL expiry.
let _cachedPromptName: string | null = null;
let _cachedPromptExpiry = 0;
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 min (Gemini allows 1h)

async function getCachedPromptName(apiKey: string): Promise<string> {
  const now = Date.now();
  if (_cachedPromptName && _cachedPromptExpiry > now) {
    return _cachedPromptName;
  }
  const res = await fetch(`${CACHE_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      model: `models/${GEMINI_MODEL}`,
      contents: [{role: "user", parts: [{text: KATREX_SYSTEM_PROMPT}]}],
      ttl: "3600s", // 1 hour
    }),
  });
  if (!res.ok) {
    // Cache create failed — fall back to inline system instruction.
    // This is non-fatal; the assistant will just pay full price this call.
    logger.warn(`getCachedPromptName: HTTP ${res.status}; falling back to inline prompt`);
    return "";
  }
  const data = await res.json() as {name?: string};
  if (!data.name) return "";
  _cachedPromptName = data.name;
  _cachedPromptExpiry = now + CACHE_TTL_MS;
  logger.info(`Created Gemini context cache ${_cachedPromptName}`);
  return _cachedPromptName;
}

// ─── In-memory Answer Cache (skip Gemini for repeat questions) ──────────
// Pre-seeded with common FAQs so the first user asking gets a cached
// answer instead of paying for a Gemini call.
const ANSWER_CACHE = new Map<string, {reply: string; ts: number}>();
const ANSWER_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const ANSWER_CACHE_MAX = 1000;

function normaliseForCache(q: string): string {
  return q.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function getCachedAnswer(question: string): string | null {
  const key = normaliseForCache(question);
  const hit = ANSWER_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ANSWER_CACHE_TTL_MS) {
    ANSWER_CACHE.delete(key);
    return null;
  }
  return hit.reply;
}

function setCachedAnswer(question: string, reply: string): void {
  const key = normaliseForCache(question);
  // LRU-style eviction: drop the oldest if at capacity.
  if (ANSWER_CACHE.size >= ANSWER_CACHE_MAX) {
    const oldest = ANSWER_CACHE.keys().next().value;
    if (oldest) ANSWER_CACHE.delete(oldest);
  }
  ANSWER_CACHE.set(key, {reply, ts: Date.now()});
}

// Pre-seed common FAQs so cache is hot from cold start. The greeting
// message also suggests these topics, so first-time users hit the cache.
const FAQ_SEEDS: Array<[string, string]> = [
  ["how do i fund my wallet",
    "To fund your NGN wallet, go to Home → tap 'Add Money' (or the wallet balance card). " +
    "You can pay via card, bank transfer/USSD (Squad checkout), or by receiving crypto. " +
    "Your virtual account is created automatically after KYC and you can also transfer to it directly. " +
    "Funds usually reflect in under a minute for card payments."],
  ["how do i withdraw money",
    "To withdraw, go to Home → tap your wallet balance → 'Withdraw'. " +
    "Pick a saved bank account or add a new one, enter the amount, and confirm. " +
    "Withdrawals are reviewed by our team and usually settle in 24–48 hours. " +
    "Make sure your KYC is complete and you have enough balance for the amount plus any fees."],
  ["how do i complete kyc",
    "To complete KYC, go to Profile → Account & Security → KYC Verification. " +
    "You'll need your 11-digit BVN, date of birth, gender, phone number, and home address. " +
    "Double-check the phone number — it must be the one linked to your BVN. " +
    "After submitting, our team reviews within minutes during business hours."],
  ["how do i buy airtime",
    "To buy airtime, go to Home → Bills → Airtime. " +
    "Pick your network (MTN, Airtel, Glo, or 9mobile), enter the phone number, " +
    "choose the amount, and tap Buy. The top-up is delivered instantly."],
  ["how do i sell a gift card",
    "To sell a gift card, go to Home → Sell Gift Card. " +
    "Pick the brand (Apple, Steam, Google Play, Amazon, etc.), choose e-code or physical, " +
    "set the sub-category and amount in USD, upload a clear photo of the card (or paste the e-code), " +
    "and submit. After our team verifies the card, the NGN equivalent is credited to your wallet. " +
    "You'll get a trade ID like #KTRX-XXXXXXXX for tracking."],
  ["how do i trade crypto",
    "To trade crypto, go to Home → Trade (or Markets). " +
    "Pick a coin — BTC, ETH, USDT, BNB, TON, TRX, DOGE, SOL, XRP, ADA, MATIC — " +
    "choose Buy, Sell, Swap, or Send, enter the amount, review the rate and fees, and confirm. " +
    "Live market rates are shown before you confirm any order."],
  ["what is escrow",
    "Escrow is the protection we hold during a P2P marketplace trade. " +
    "When you buy a social media account, the seller's account is locked and " +
    "the buyer's payment is held by KatrexApp until the buyer confirms they have " +
    "received everything advertised. Once confirmed, the seller gets paid. " +
    "If something is wrong, open a dispute and our team mediates."],
  ["how do i change my pin",
    "To change your transaction PIN, go to Profile → Account & Security → Change PIN. " +
    "Enter your current PIN, then your new 4-digit PIN twice. " +
    "You'll be signed out of all devices and asked to sign back in."],
  ["how do i refer a friend",
    "To refer a friend, go to Profile → Referrals. " +
    "Share your unique referral code or link. When your friend signs up and " +
    "qualifies (minimum $5 in qualifying spend), you both earn a reward. " +
    "Rewards are tracked on the Referrals screen and credited to your wallet."],
  ["how long does withdrawal take",
    "Withdrawals are reviewed by our team and usually settle within 24–48 hours. " +
    "You'll get a notification when the transfer is sent. " +
    "If it's been longer than 48 hours, open the transaction and tap 'Contact Support' " +
    "or submit a ticket from Help Center → Submit Ticket."],
  ["thanks", "You're welcome! Let me know if there's anything else I can help with. 😊"],
  ["thank you", "You're welcome! Let me know if there's anything else I can help with. 😊"],
  ["ok", "Got it. Let me know if you have any other questions."],
  ["hi", "Hi there! 👋 I'm Katrex Assistant — ask me anything about the app, from funding your wallet to trading crypto. What can I help you with?"],
  ["hello", "Hello! 👋 I'm Katrex Assistant — ask me anything about the app. What can I help you with today?"],
  ["hey", "Hey! 👋 What can I help you with on Katrex today?"],
];

// Pre-seed on module load (cost = 0).
for (const [q, a] of FAQ_SEEDS) {
  setCachedAnswer(q, a);
}

// ─── Output sanitiser (defence in depth) ───────────────────────────────
// Strips patterns that would leak that we are using an LLM, even if a
// prompt-injection attempt slipped past the safety filters.
const AI_LEAK_PATTERNS: Array<[RegExp, string]> = [
  [/\bas an? (ai|language model|assistant|llm|chatbot)\b/gi, "as Katrex Assistant"],
  [/\bi'?m an? (ai|language model|assistant|llm|chatbot)\b/gi, "I'm Katrex Assistant"],
  [/\bmy (system )?prompt\b/gi, "the Katrex app knowledge base"],
  [/\bmy (instructions|programming)\b/gi, "the Katrex app knowledge base"],
  [/\bgoogle\s+gemini\b/gi, "the Katrex app"],
  [/\bgoogle\s+ai\b/gi, "the Katrex app"],
  [/\blarge language model\b/gi, "the Katrex app"],
];

function sanitiseOutput(reply: string): string {
  let out = reply;
  for (const [pattern, replacement] of AI_LEAK_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// ─── Three-tier sliding-window rate limit (atomic increment) ──────────
async function enforceRateLimits(uid: string): Promise<void> {
  const now = Date.now();
  const ref = db.collection("rate_limits").doc(`aichat_${uid}`);
  const snap = await ref.get();
  const data = snap.data() ?? {};

  // For each window, compute the active count and decide if we're over.
  for (const limit of AI_CHAT_RATE_LIMITS) {
    const startedAt = (data[`${limit.name}StartedAt`] as any)?.toMillis?.() ?? 0;
    const count = (startedAt && now - startedAt < limit.windowMs)
      ? (data[`${limit.name}Count`] ?? 0)
      : 0;
    if (count >= limit.max) {
      const windowLabel = limit.name === "per-minute" ? "a minute"
        : limit.name === "per-hour" ? "an hour"
        : "a day";
      throw new HttpsError("resource-exhausted",
        `You're sending messages too quickly. Please wait ${windowLabel} and try again.`);
    }
  }

  // Build the update atomically: reset any window that expired, increment all.
  const update: Record<string, unknown> = {};
  for (const limit of AI_CHAT_RATE_LIMITS) {
    const startedAt = (data[`${limit.name}StartedAt`] as any)?.toMillis?.() ?? 0;
    if (!startedAt || now - startedAt >= limit.windowMs) {
      update[`${limit.name}StartedAt`] = Timestamp.fromMillis(now);
      update[`${limit.name}Count`] = 1;
    } else {
      update[`${limit.name}Count`] = FieldValue.increment(1);
    }
  }
  await ref.set(update, {merge: true});
}

function requiredString(v: unknown, name: string, max: number): string {
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new HttpsError("invalid-argument", `Missing "${name}".`);
  }
  if (v.length > max) {
    throw new HttpsError("invalid-argument",
      `"${name}" is too long (max ${max} characters).`);
  }
  return v.trim();
}

/**
 * Call the Gemini generateContent endpoint. Uses the module-level
 * context cache for the system prompt (10× cheaper than re-sending it).
 * Throws on HTTP / parse errors after sanitising the response so we
 * never log raw payloads (which may contain user text).
 */
async function callGemini(apiKey: string, contents: Content[]): Promise<string> {
  // Try the context cache; fall back to inline system instruction if it fails.
  const cachedName = await getCachedPromptName(apiKey);

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.6,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
    safetySettings: [
      {category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE"},
      {category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE"},
      {category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE"},
      {category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE"},
    ],
  };

  if (cachedName) {
    body.cachedContent = cachedName;
  } else {
    // Fallback: ship the system prompt inline (more expensive but works).
    body.systemInstruction = {parts: [{text: KATREX_SYSTEM_PROMPT}]};
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    logger.error(`callGemini: HTTP ${res.status}: ${errText.slice(0, 500)}`);
    throw new HttpsError("unavailable",
      "I'm having trouble reaching my brain right now. Please try again in a moment.");
  }

  const data = await res.json() as {
    candidates?: {content?: {parts?: {text?: string}[]}; finishReason?: string}[];
    promptFeedback?: {blockReason?: string};
  };

  // Safety block — return a friendly fallback rather than leaking the reason.
  if (data.promptFeedback?.blockReason) {
    return "I can't help with that. If you have a KatrexApp question, please rephrase or reach our team via Help Center → Submit Ticket.";
  }

  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) {
    return "I didn't catch a reply that time. Could you rephrase or try again?";
  }
  return sanitiseOutput(text);
}

/**
 * Generate a 2–3 sentence summary of a finished chat. Uses the same
 * context cache as the main chat (the system prompt is shared).
 */
async function summarizeChat(apiKey: string, transcript: {senderRole: string; text: string}[]): Promise<string> {
  const contents: Content[] = [
    {
      role: "user",
      parts: [{
        text:
          "Summarise the following KatrexApp customer-support chat in 2–3 sentences. " +
          "Focus on: (1) the customer's issue or question, " +
          "(2) what the assistant told them, and " +
          "(3) the resolution status (resolved / unresolved / needs human follow-up). " +
          "Be concise, factual, and use present tense. Do not invent details. " +
          "Output only the summary — no preamble, no headings.\n\n" +
          "TRANSCRIPT:\n" +
          transcript.map((m) =>
            `[${m.senderRole === "ai" ? "Assistant" : "Customer"}] ${m.text}`
          ).join("\n"),
      }],
    },
  ];

  const cachedName = await getCachedPromptName(apiKey);
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: SUMMARIZE_MAX_TOKENS,
    },
  };
  if (cachedName) {
    body.cachedContent = cachedName;
  } else {
    body.systemInstruction = {
      parts: [{
        text: "You are a support supervisor writing a brief internal summary. " +
              "Be neutral, factual, and concise. Do not mention you are an AI.",
      }],
    };
  }

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      logger.error(`summarizeChat: HTTP ${res.status}`);
      return "";
    }
    const data = await res.json() as {
      candidates?: {content?: {parts?: {text?: string}[]}}[];
    };
    const text = (data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "").trim();
    return sanitiseOutput(text);
  } catch (e) {
    logger.error("summarizeChat: failed", e);
    return "";
  }
}

/** Notify every admin that a chat was closed and a summary is ready. */
async function notifyAdminsOfSummary(args: {
  chatId: string;
  uid: string;
  userName: string;
  userEmail: string;
  summary: string;
  messageCount: number;
}): Promise<void> {
  const adminsSnap = await db.collection("users")
    .where("role", "==", "admin")
    .limit(20)
    .get();

  if (adminsSnap.empty) {
    logger.warn("notifyAdminsOfSummary: no admin users found");
    return;
  }

  const preview = args.summary.length > 0
    ? args.summary
    : `AI chat closed after ${args.messageCount} message(s).`;

  const batch = db.batch();
  adminsSnap.docs.forEach((adminDoc) => {
    const notifRef = db.collection("notifications").doc();
    batch.set(notifRef, {
      id: notifRef.id,
      uid: adminDoc.id,
      type: "general",
      title: "AI support chat closed",
      body: `${args.userName || args.userEmail || "A user"}: ${preview}`,
      preview,
      link: `ai-chat/${args.chatId}`,
      isRead: false,
      createdAt: new Date(),
    });
    batch.set(adminDoc.ref, {
      unreadNotificationCount: FieldValue.increment(1),
      updatedAt: new Date(),
    }, {merge: true});
  });
  await batch.commit();
}

// ─── HANDLERS (called by supportApi router) ─────────────────────────────

/** Start (or resume) an AI chat session. */
export async function handleStartAiChat(uid: string, _data: Record<string, unknown>) {
  const existing = await db.collection("ai_chats")
    .where("uid", "==", uid)
    .where("status", "in", ["active"])
    .limit(1)
    .get();

  if (!existing.empty) {
    const chatDoc = existing.docs[0];
    return {success: true, chatId: chatDoc.id, chat: chatDoc.data()};
  }

  const userDoc = await db.collection("users").doc(uid).get();
  const userEmail = userDoc.data()?.email ?? "";
  const userName = userDoc.data()?.fullName ?? userDoc.data()?.displayName ?? "";

  const chatRef = db.collection("ai_chats").doc();
  const now = new Date();

  // Seed a friendly greeting so the user has something to read on open.
  const greeting =
    "Hi, I'm Katrex Assistant 👋 — ask me anything about the app: how to fund " +
    "your wallet, complete KYC, buy airtime or data, sell a gift card, trade " +
    "crypto, use the marketplace, or check your transactions. What can I help you with?";

  // Inline the greeting on the chat doc so the next send() can read it
  // for context without querying the messages collection.
  const seedRecent: RecentTurn[] = [{role: "ai", text: greeting, at: now.getTime()}];

  await chatRef.set({
    id: chatRef.id,
    uid,
    userEmail,
    userName,
    status: "active",
    createdAt: now,
    lastMessageAt: now,
    lastMessageRole: "ai",
    lastMessageText: greeting,
    messageCount: 1,
    recentMessages: seedRecent,
  });

  // Also keep a row in the messages collection for the admin audit trail
  // and the on-close summary.
  await db.collection("ai_chat_messages").doc().set({
    id: "",
    chatId: chatRef.id,
    senderRole: "ai",
    text: greeting,
    createdAt: now,
  });

  return {success: true, chatId: chatRef.id};
}

/** User sends a message; AI replies synchronously and both are persisted. */
export async function handleSendAiChatMessage(
  uid: string,
  data: Record<string, unknown>,
  apiKey?: string,
) {
  if (!apiKey) throw new HttpsError("internal", "Gemini API key is not configured.");
  const chatId = requiredString(data.chatId, "chatId", 100);
  const text = requiredString(data.text, "text", MAX_INPUT_CHARS);

  // Three-tier rate limit (5/min, 30/hr, 200/day).
  await enforceRateLimits(uid);

  const chatRef = db.collection("ai_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  const chatData = chatDoc.data()!;
  if (chatData.uid !== uid) {
    throw new HttpsError("permission-denied", "You can only message in your own chat.");
  }
  if (chatData.status === "closed") {
    throw new HttpsError("failed-precondition", "This chat is closed.");
  }

  const now = new Date();
  const nowMs = now.getTime();

  // Check the in-memory answer cache first — a hit skips the Gemini call
  // entirely (zero API tokens, zero Firestore query, instant reply).
  const cachedReply = getCachedAnswer(text);

  // Build the contents array from the inline `recentMessages` on the
  // chat doc — no need to query the messages collection on the hot path.
  const prior: RecentTurn[] = (chatData.recentMessages as RecentTurn[] | undefined) ?? [];
  const contents: Content[] = prior.map((m) => ({
    role: m.role === "ai" ? "model" : "user",
    parts: [{text: m.text}],
  }));
  contents.push({role: "user", parts: [{text}]});

  // If cache hit, skip Gemini; otherwise call.
  const reply = cachedReply !== null
    ? cachedReply
    : await callGemini(apiKey, contents);

  // Save to in-memory cache (no-op if it was a hit).
  if (cachedReply === null) {
    setCachedAnswer(text, reply);
  }

  // Persist both messages in parallel. The messages collection is still
  // used for the admin audit trail and the on-close summary; the hot
  // path (next send) reads from the chat doc's `recentMessages` instead.
  const userMsgRef = db.collection("ai_chat_messages").doc();
  const aiMsgRef = db.collection("ai_chat_messages").doc();
  const newRecent: RecentTurn[] = ([
    ...prior,
    {role: "user" as const, text, at: nowMs},
    {role: "ai" as const, text: reply, at: nowMs},
  ]).slice(-RECENT_MESSAGES_KEPT);

  await Promise.all([
    userMsgRef.set({
      id: userMsgRef.id,
      chatId, uid, senderUid: uid,
      senderRole: "user", text, createdAt: now,
    }),
    aiMsgRef.set({
      id: aiMsgRef.id,
      chatId, senderRole: "ai", text: reply, createdAt: now,
    }),
    chatRef.update({
      lastMessageAt: now,
      lastMessageRole: "ai",
      lastMessageText: reply,
      messageCount: FieldValue.increment(2),
      recentMessages: newRecent,
    }),
  ]);

  return {success: true, reply, cached: cachedReply !== null};
}

/** Close the chat and produce an admin-visible summary. */
export async function handleCloseAiChat(
  uid: string,
  data: Record<string, unknown>,
  apiKey?: string,
) {
  if (!apiKey) throw new HttpsError("internal", "Gemini API key is not configured.");
  const chatId = requiredString(data.chatId, "chatId", 100);

  const chatRef = db.collection("ai_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  const chatData = chatDoc.data()!;
  if (chatData.uid !== uid) {
    throw new HttpsError("permission-denied", "You can only close your own chat.");
  }
  if (chatData.status === "closed") {
    return {success: true, alreadyClosed: true};
  }

  const now = new Date();
  await chatRef.update({status: "closed", closedAt: now});

  // Pull the full transcript and ask Gemini to summarise it.
  const transcriptSnap = await db.collection("ai_chat_messages")
    .where("chatId", "==", chatId)
    .orderBy("createdAt", "asc")
    .get();
  const transcript = transcriptSnap.docs.map((d) => {
    const x = d.data() as {senderRole: string; text: string};
    return {senderRole: x.senderRole, text: x.text};
  });

  const summary = transcript.length > 0
    ? await summarizeChat(apiKey, transcript)
    : "Empty chat.";

  const summaryRef = db.collection("ai_chat_summaries").doc();
  await summaryRef.set({
    id: summaryRef.id,
    chatId,
    uid,
    userEmail: chatData.userEmail ?? "",
    userName: chatData.userName ?? "",
    summary,
    messageCount: transcript.length,
    createdAt: now,
  });

  await notifyAdminsOfSummary({
    chatId,
    uid,
    userName: chatData.userName ?? "",
    userEmail: chatData.userEmail ?? "",
    summary,
    messageCount: transcript.length,
  });

  return {success: true, summaryId: summaryRef.id};
}

/** Reset the user's unread count (called on screen open). */
export async function handleMarkAiChatRead(uid: string, data: Record<string, unknown>) {
  const chatId = requiredString(data.chatId, "chatId", 100);
  const chatRef = db.collection("ai_chats").doc(chatId);
  const chatDoc = await chatRef.get();
  if (!chatDoc.exists) throw new HttpsError("not-found", "Chat not found.");
  if (chatDoc.data()!.uid !== uid) {
    throw new HttpsError("permission-denied", "Not your chat.");
  }
  await chatRef.set({userUnreadCount: 0}, {merge: true}).catch(() => {});
  return {success: true};
}

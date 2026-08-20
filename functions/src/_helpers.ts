/**
 * Shared admin-function helpers.
 *
 *   - audit()       writes an audit_logs entry with a consistent shape
 *   - requireRole() checks the caller's role/permissions
 *   - rateLimit()   token-bucket limiter per (actorId, action)
 *   - idempotency() replays a stored result if the same key was seen
 *                   within the last 24 hours
 *
 * All helpers throw HttpsError on failure so they propagate cleanly to
 * the adminApi router.
 */
import {HttpsError} from "firebase-functions/v2/https";
import {FieldValue, getFirestore, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

// ─────────────────────────────────────────────────────────────────────
// Roles & permissions
// ─────────────────────────────────────────────────────────────────────

export type Role = "superadmin" | "admin" | "support" | "compliance" | "user";

/** Granular permissions checked per adminApi action. */
export type Permission =
  | "users.read"
  | "users.create"
  | "users.update"
  | "users.updateProfile"
  | "users.updateFlags"
  | "users.assignRole"
  | "users.suspend"
  | "users.delete"
  | "users.restore"
  | "users.export"
  | "users.adjustBalance"
  | "users.resetPassword"
  | "users.sendEmail"
  | "users.reviewKyc"
  | "kyc.read"
  | "transactions.read"
  | "transactions.process"
  | "audit.read"
  | "support.read"
  | "referrals.read"
  | "market.write"
  | "pricing.write"
  | "giftcard.write";

const PERMISSIONS_BY_ROLE: Record<Role, ReadonlySet<Permission>> = {
  superadmin: new Set<Permission>([
    "users.read", "users.create", "users.update", "users.updateProfile",
    "users.updateFlags", "users.assignRole", "users.suspend", "users.delete",
    "users.restore", "users.export", "users.adjustBalance",
    "users.resetPassword", "users.sendEmail", "users.reviewKyc",
    "kyc.read", "transactions.read", "transactions.process", "audit.read",
    "support.read", "referrals.read", "market.write", "pricing.write",
    "giftcard.write",
  ]),
  admin: new Set<Permission>([
    "users.read", "users.update", "users.updateProfile", "users.updateFlags",
    "users.suspend", "users.export", "users.sendEmail", "users.reviewKyc",
    "kyc.read", "transactions.read", "transactions.process", "audit.read",
    "support.read", "referrals.read", "giftcard.write",
  ]),
  compliance: new Set<Permission>([
    "users.read", "users.updateFlags", "users.suspend", "users.export",
    "users.adjustBalance", "users.reviewKyc", "kyc.read",
    "transactions.read", "audit.read", "support.read",
  ]),
  support: new Set<Permission>([
    "users.read", "users.sendEmail", "support.read",
  ]),
  user: new Set<Permission>(),
};

const db = getFirestore();

/**
 * Resolve the caller's role and (optionally) custom permissions from
 * Firestore + custom claims.
 */
export async function resolveActor(uid: string): Promise<{
  uid: string;
  email: string | null;
  role: Role;
  extra: ReadonlySet<Permission>;
}> {
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "Caller profile not found.");
  }
  const data = userDoc.data() ?? {};
  const role = (data.role as Role) ?? (data.isAdmin === true ? "admin" : "user");

  // Allow per-user permission overrides stored under permissions/{uid}.
  const permsSnap = await db.collection("permissions").doc(uid).get();
  const extra = new Set<Permission>((permsSnap.data()?.granted as Permission[]) ?? []);

  return {
    uid,
    email: (data.email as string) ?? null,
    role,
    extra,
  };
}

/** Throws if the actor does not have the required permission. */
export async function requirePermission(uid: string, perm: Permission): Promise<{
  uid: string;
  email: string | null;
  role: Role;
}> {
  const actor = await resolveActor(uid);
  const allowed = PERMISSIONS_BY_ROLE[actor.role];
  if (!allowed.has(perm) && !actor.extra.has(perm)) {
    throw new HttpsError("permission-denied", `Missing permission: ${perm}`);
  }
  return {uid: actor.uid, email: actor.email, role: actor.role};
}

/** Used by handlers that need superadmin-only access. */
export async function requireSuperAdmin(uid: string): Promise<{
  uid: string;
  email: string | null;
  role: Role;
}> {
  const actor = await resolveActor(uid);
  if (actor.role !== "superadmin") {
    throw new HttpsError("permission-denied", "Superadmin access required.");
  }
  return {uid: actor.uid, email: actor.email, role: actor.role};
}

// ─────────────────────────────────────────────────────────────────────
// Audit logging
// ─────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  actorId: string;
  actorEmail: string | null;
  actorRole: Role;
  action: string;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
}

/**
 * Persist an audit log entry. Failures are logged but never thrown —
 * we never want a successful operation to roll back because the audit
 * collection is temporarily unavailable.
 */
export async function audit(entry: AuditEntry): Promise<string> {
  try {
    const ref = db.collection("audit_logs").doc();
    await ref.set({
      id: ref.id,
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      actorRole: entry.actorRole,
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      before: entry.before ?? null,
      after: entry.after ?? null,
      metadata: entry.metadata ?? null,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
      requestId: entry.requestId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    logger.error("audit() failed:", e);
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────
// Rate limiting (Firestore-backed token bucket)
// ─────────────────────────────────────────────────────────────────────

interface RateLimitConfig {
  /** Max tokens in the bucket. */
  capacity: number;
  /** How many tokens are refilled per minute. */
  refillPerMinute: number;
}

const DEFAULTS: Record<string, RateLimitConfig> = {
  createUser:       {capacity: 25,  refillPerMinute: 25},
  suspendUser:      {capacity: 100, refillPerMinute: 100},
  deleteUser:       {capacity: 10,  refillPerMinute: 10},
  resetUserPassword:{capacity: 25,  refillPerMinute: 25},
  updateUserEmail:  {capacity: 25,  refillPerMinute: 25},
  sendUserEmail:    {capacity: 50,  refillPerMinute: 50},
  updateUserProfile:{capacity: 100, refillPerMinute: 100},
  updateUserFlags:  {capacity: 100, refillPerMinute: 100},
  adjustUserBalance:{capacity: 50,  refillPerMinute: 50},
  bulkSuspendUsers: {capacity: 10,  refillPerMinute: 10},
  bulkDeleteUsers:  {capacity: 5,   refillPerMinute: 5},
  reviewKyc:        {capacity: 100, refillPerMinute: 100},
  listUsers:        {capacity: 600, refillPerMinute: 600},
};

interface BucketState {
  tokens: number;
  updatedAt: Timestamp;
}

/**
 * Token-bucket rate limiter. Reads + writes a single document per
 * (actorId, action). Designed to be cheap: one read + one transactional
 * write per call.
 *
 * Throws HttpsError('resource-exhausted') on excess.
 */
export async function rateLimit(actorId: string, action: string): Promise<void> {
  const cfg = DEFAULTS[action] ?? {capacity: 60, refillPerMinute: 60};
  const id = `${actorId}_${action}`;
  const ref = db.collection("rate_limits").doc(id);

  await db.runTransaction(async (txn) => {
    const snap = await txn.get(ref);
    const now = Date.now();
    let tokens = cfg.capacity;
    if (snap.exists) {
      const state = snap.data() as BucketState;
      const lastMs = state.updatedAt?.toMillis?.() ?? now;
      const elapsedMin = Math.max(0, (now - lastMs) / 60_000);
      tokens = Math.min(
        cfg.capacity,
        state.tokens + elapsedMin * cfg.refillPerMinute,
      );
    }
    if (tokens < 1) {
      throw new HttpsError("resource-exhausted",
        `Rate limit exceeded for ${action}. Try again later.`);
    }
    txn.set(ref, {
      tokens: tokens - 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, {merge: true});
  });
}

// ─────────────────────────────────────────────────────────────────────
// Idempotency
// ─────────────────────────────────────────────────────────────────────

/**
 * Return a cached result if `key` was seen in the last 24h, otherwise
 * run `fn()` and cache its result.
 */
export async function idempotent<T>(
  actorId: string,
  action: string,
  key: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (!key) return fn();
  const docId = `${actorId}_${action}_${key}`;
  const ref = db.collection("idempotency").doc(docId);

  const snap = await ref.get();
  if (snap.exists) {
    const cached = snap.data() as {result: T; expiresAt: Timestamp};
    if (cached.expiresAt?.toMillis?.() > Date.now()) {
      logger.info(`idempotency replay: ${docId}`);
      return cached.result;
    }
  }
  const result = await fn();
  await ref.set({
    result: result as unknown,
    expiresAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000),
  }, {merge: true});
  return result;
}

// ─────────────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────────────

const ZERO_WIDTH = /[\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2066}-\u{2069}]/gu;
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu;

export function cleanText(v: unknown, max: number, field: string): string {
  if (typeof v !== "string") {
    throw new HttpsError("invalid-argument", `${field} must be a string.`);
  }
  let s = v.normalize("NFC").replace(ZERO_WIDTH, "").replace(EMOJI, "").trim();
  if (s.length === 0) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  if (s.length > max) {
    throw new HttpsError("invalid-argument", `${field} exceeds ${max} chars.`);
  }
  return s;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function isEmail(v: string): boolean {
  return EMAIL_RE.test(v);
}

/** Password policy: min 10 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 symbol. */
export function isStrongPassword(v: string): boolean {
  if (typeof v !== "string" || v.length < 10) return false;
  if (!/[a-z]/.test(v)) return false;
  if (!/[A-Z]/.test(v)) return false;
  if (!/\d/.test(v)) return false;
  if (!/[^A-Za-z0-9]/.test(v)) return false;
  return true;
}

export function requireReason(v: unknown, field = "reason", min = 5): string {
  return cleanText(v, 500, field);
  // min length is checked separately by callers using .length
}

/** Convert an ISO date string or timestamp to a Firestore filter value. */
export function parseDate(v: unknown, field: string): Date | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string") {
    throw new HttpsError("invalid-argument", `${field} must be an ISO date string.`);
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    throw new HttpsError("invalid-argument", `${field} is not a valid date.`);
  }
  return d;
}

/** Sanitise a free-form string to prevent CSV/Excel formula injection. */
export function safeCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Prefix dangerous leading chars so Excel doesn't execute formulas.
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s.replace(/"/g, '""');
}

/** Whitelisted coin symbols supported by the app. */
export const ALLOWED_COINS = new Set([
  "BTC", "ETH", "TRX", "TON", "SOL", "BNB", "XRP", "DOGE", "ADA", "MATIC",
  "USDT", "USDTBSC", "USDTTRC20",
]);
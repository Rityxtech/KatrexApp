import {onCall, HttpsError} from "firebase-functions/v2/https";
import type {CallableRequest} from "firebase-functions/v2/https";
import {defineSecret} from "firebase-functions/params";

const r2AccessKeyId = defineSecret("R2_ACCESS_KEY_ID");
const r2SecretAccessKey = defineSecret("R2_SECRET_ACCESS_KEY");
const r2AccountId = defineSecret("R2_ACCOUNT_ID");
const r2BucketName = defineSecret("R2_BUCKET_NAME");
const r2PublicUrl = defineSecret("R2_PUBLIC_URL");

function requiredString(value: unknown, field: string, maxLength = 200): string {
  if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > maxLength) {
    throw new HttpsError("invalid-argument", `${field} is required.`);
  }
  return value.trim();
}

// Lazy-loaded to avoid deployment analyzer timeouts.
let _S3Client: typeof import("@aws-sdk/client-s3").S3Client | null = null;
let _HeadObjectCommand: typeof import("@aws-sdk/client-s3").HeadObjectCommand | null = null;
let _PutBucketCorsCommand: typeof import("@aws-sdk/client-s3").PutBucketCorsCommand | null = null;
let _presignPutObject: typeof import("./r2-presign").presignPutObject | null = null;
let _corsConfigured = false;

async function getS3Client() {
  if (!_S3Client) {
    const mod = await import("@aws-sdk/client-s3");
    _S3Client = mod.S3Client;
    _HeadObjectCommand = mod.HeadObjectCommand;
    _PutBucketCorsCommand = mod.PutBucketCorsCommand;
  }
  return _S3Client;
}

async function getPresignPutObject() {
  if (!_presignPutObject) {
    const mod = await import("./r2-presign.js");
    _presignPutObject = mod.presignPutObject;
  }
  return _presignPutObject!;
}

/**
 * Ensures the R2 bucket has CORS rules that allow browser uploads.
 * This is idempotent and only runs once per function instance.
 */
async function ensureR2Cors(s3: import("@aws-sdk/client-s3").S3Client, bucketName: string) {
  if (_corsConfigured) return;
  await getS3Client();
  const corsConfig = {
    CORSRules: [
      {
        AllowedOrigins: ["*"],
        AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
        AllowedHeaders: ["*"],
        MaxAgeSeconds: 3600,
      },
    ],
  };
  try {
    await s3.send(new _PutBucketCorsCommand!({Bucket: bucketName, CORSConfiguration: corsConfig}));
    _corsConfigured = true;
  } catch (error) {
    // Non-fatal — the presigned URL may still work if CORS is already set
    console.warn("R2 CORS setup skipped:", error);
  }
}

async function createS3(accountId: string, accessKeyId: string, secretAccessKey: string) {
  const S3Client = await getS3Client();
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {accessKeyId, secretAccessKey},
  });
}

// ===========================================================================
// GIFT CARD IMAGE UPLOADS
// ===========================================================================
export async function getGiftcardUploadUrlsHandler(request: CallableRequest<any>) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");
    const uid = request.auth.uid;
    const data = request.data as Record<string, unknown>;
    const tradeId = requiredString(data.tradeId, "tradeId", 128);
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(tradeId)) {
      throw new HttpsError("invalid-argument", "tradeId is invalid.");
    }

    const extensions = Array.isArray(data.extensions) ? data.extensions : [];
    if (extensions.length === 0 || extensions.length > 5) {
      throw new HttpsError("invalid-argument", "Provide 1-5 file extensions.");
    }
    const validExt = /^jpg|jpeg|png|webp|heic$/i;
    for (const ext of extensions) {
      if (typeof ext !== "string" || !validExt.test(ext)) {
        throw new HttpsError("invalid-argument", "Invalid file extension.");
      }
    }

    const accountId = r2AccountId.value().trim();
    const bucketName = r2BucketName.value().trim();
    const publicUrl = r2PublicUrl.value().trim().replace(/\/$/, "");
    if (!accountId || !bucketName || !publicUrl || accountId === "PLACEHOLDER") {
      throw new HttpsError("failed-precondition", "R2 is not configured.");
    }

    const s3 = await createS3(accountId, r2AccessKeyId.value().trim(), r2SecretAccessKey.value().trim());

    const items = [];
    for (let i = 0; i < extensions.length; i++) {
      const ext = (extensions[i] as string).toLowerCase().replace(/^jpeg$/, "jpg");
      const objectKey = `giftcard_images/${uid}/${tradeId}/card_${i + 1}.${ext}`;
      const contentType = ext === "png" ? "image/png"
        : ext === "webp" ? "image/webp"
        : ext === "heic" ? "image/heic"
        : "image/jpeg";
      const uploadUrl = await (await getPresignPutObject())(s3, bucketName, objectKey, contentType, 600);
      items.push({objectKey, uploadUrl, publicUrl: `${publicUrl}/${objectKey}`, contentType});
    }

    return {tradeId, items};
}

// ===========================================================================
// DISPUTE EVIDENCE UPLOADS
// ===========================================================================
export async function getDisputeUploadUrlsHandler(request: CallableRequest<any>) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");
    const uid = request.auth.uid;
    const data = request.data as Record<string, unknown>;
    const tradeId = requiredString(data.tradeId, "tradeId", 128);
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(tradeId)) {
      throw new HttpsError("invalid-argument", "tradeId is invalid.");
    }

    const extensions = Array.isArray(data.extensions) ? data.extensions : [];
    if (extensions.length === 0 || extensions.length > 5) {
      throw new HttpsError("invalid-argument", "Provide 1-5 file extensions.");
    }
    const validExt = /^jpg|jpeg|png|webp|heic$/i;
    for (const ext of extensions) {
      if (typeof ext !== "string" || !validExt.test(ext)) {
        throw new HttpsError("invalid-argument", "Invalid file extension.");
      }
    }

    const accountId = r2AccountId.value().trim();
    const bucketName = r2BucketName.value().trim();
    const publicUrl = r2PublicUrl.value().trim().replace(/\/$/, "");
    if (!accountId || !bucketName || !publicUrl || accountId === "PLACEHOLDER") {
      throw new HttpsError("failed-precondition", "R2 is not configured.");
    }

    const s3 = await createS3(accountId, r2AccessKeyId.value().trim(), r2SecretAccessKey.value().trim());

    const items = [];
    for (let i = 0; i < extensions.length; i++) {
      const ext = (extensions[i] as string).toLowerCase().replace(/^jpeg$/, "jpg");
      const objectKey = `dispute_evidence/${uid}/${tradeId}/evidence_${i + 1}.${ext}`;
      const contentType = ext === "png" ? "image/png"
        : ext === "webp" ? "image/webp"
        : ext === "heic" ? "image/heic"
        : "image/jpeg";
      const uploadUrl = await (await getPresignPutObject())(s3, bucketName, objectKey, contentType, 600);
      items.push({objectKey, uploadUrl, publicUrl: `${publicUrl}/${objectKey}`, contentType});
    }

    return {tradeId, items};
}

// ===========================================================================
// SUPPORT ATTACHMENT UPLOADS
// ===========================================================================
export async function getSupportUploadUrlsHandler(request: CallableRequest<any>) {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");
    const uid = request.auth.uid;
    const data = request.data as Record<string, unknown>;
    const extensions = Array.isArray(data.extensions) ? data.extensions : [];
    if (extensions.length === 0 || extensions.length > 5) {
      throw new HttpsError("invalid-argument", "Provide 1-5 file extensions.");
    }
    const validExt = /^jpg|jpeg|png|webp|heic|mp4|mov|avi|m4v$/i;
    for (const ext of extensions) {
      if (typeof ext !== "string" || !validExt.test(ext)) {
        throw new HttpsError("invalid-argument", "Invalid file extension. Only images and videos are allowed.");
      }
    }

    const accountId = r2AccountId.value().trim();
    const bucketName = r2BucketName.value().trim();
    const publicUrl = r2PublicUrl.value().trim().replace(/\/$/, "");
    if (!accountId || !bucketName || !publicUrl || accountId === "PLACEHOLDER") {
      throw new HttpsError("failed-precondition", "R2 is not configured.");
    }

    const s3 = await createS3(accountId, r2AccessKeyId.value().trim(), r2SecretAccessKey.value().trim());

    const items = [];
    for (let i = 0; i < extensions.length; i++) {
      const ext = (extensions[i] as string).toLowerCase().replace(/^jpeg$/, "jpg");
      const objectKey = `support_attachments/${uid}/${Date.now()}_${i}.${ext}`;
      const contentType = ext === "png" ? "image/png"
        : ext === "webp" ? "image/webp"
        : ext === "heic" ? "image/heic"
        : ext === "mp4" ? "video/mp4"
        : ext === "mov" ? "video/quicktime"
        : ext === "avi" ? "video/x-msvideo"
        : ext === "m4v" ? "video/x-m4v"
        : "image/jpeg";
      const uploadUrl = await (await getPresignPutObject())(s3, bucketName, objectKey, contentType, 600);
      items.push({objectKey, uploadUrl, publicUrl: `${publicUrl}/${objectKey}`, contentType});
    }

    return {items};
}

// ===========================================================================
// ADMIN IMAGE UPLOAD (brand images, promo images)
// ===========================================================================
export const getAdminUploadUrl = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    secrets: [r2AccessKeyId, r2SecretAccessKey, r2AccountId, r2BucketName, r2PublicUrl],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");
    const uid = request.auth.uid;
    const data = request.data as Record<string, unknown>;
    const folder = requiredString(data.folder, "folder", 50);
    const ext = requiredString(data.extension, "extension", 10).toLowerCase().replace(/^jpeg$/, "jpg");
    if (!/^(jpg|png|webp|heic)$/.test(ext)) {
      throw new HttpsError("invalid-argument", "Invalid file extension.");
    }
    if (!/^(brand_images|promo_images)$/.test(folder)) {
      throw new HttpsError("invalid-argument", "Invalid upload folder.");
    }

    const accountId = r2AccountId.value().trim();
    const bucketName = r2BucketName.value().trim();
    const publicUrl = r2PublicUrl.value().trim().replace(/\/$/, "");
    if (!accountId || !bucketName || !publicUrl || accountId === "PLACEHOLDER") {
      throw new HttpsError("failed-precondition", "R2 is not configured.");
    }

    const s3 = await createS3(accountId, r2AccessKeyId.value().trim(), r2SecretAccessKey.value().trim());
    await ensureR2Cors(s3, bucketName);
    const objectKey = `${folder}/${uid}_${Date.now()}.${ext}`;
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "heic" ? "image/heic" : "image/jpeg";
    const uploadUrl = await (await getPresignPutObject())(s3, bucketName, objectKey, contentType, 600);
    return {objectKey, uploadUrl, publicUrl: `${publicUrl}/${objectKey}`, contentType};
  },
);

// ===========================================================================
// ADMIN IMAGE UPLOAD (server-side proxy — avoids R2 CORS issues)
// Receives base64 image data, uploads to R2 server-side, returns public URL.
// ===========================================================================
export const uploadAdminImage = onCall(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: [r2AccessKeyId, r2SecretAccessKey, r2AccountId, r2BucketName, r2PublicUrl],
  },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Authentication required.");
    const uid = request.auth.uid;
    const data = request.data as Record<string, unknown>;
    const folder = requiredString(data.folder, "folder", 50);
    const ext = requiredString(data.extension, "extension", 10).toLowerCase().replace(/^jpeg$/, "jpg");
    if (!/^(jpg|png|webp|heic)$/.test(ext)) {
      throw new HttpsError("invalid-argument", "Invalid file extension.");
    }
    if (!/^(brand_images|promo_images)$/.test(folder)) {
      throw new HttpsError("invalid-argument", "Invalid upload folder.");
    }
    const base64Data = requiredString(data.data, "data", 15_000_000); // 15MB max base64
    // Strip optional data URL prefix (e.g. "data:image/png;base64,")
    const base64 = base64Data.replace(/^data:[^;]+;base64,/, "");

    const accountId = r2AccountId.value().trim();
    const bucketName = r2BucketName.value().trim();
    const publicUrl = r2PublicUrl.value().trim().replace(/\/$/, "");
    if (!accountId || !bucketName || !publicUrl || accountId === "PLACEHOLDER") {
      throw new HttpsError("failed-precondition", "R2 is not configured.");
    }

    const s3 = await createS3(accountId, r2AccessKeyId.value().trim(), r2SecretAccessKey.value().trim());
    const objectKey = `${folder}/${uid}_${Date.now()}.${ext}`;
    const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "heic" ? "image/heic" : "image/jpeg";

    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) {
      throw new HttpsError("invalid-argument", "Empty image data.");
    }
    // 10MB max decoded size
    if (buffer.length > 10_000_000) {
      throw new HttpsError("invalid-argument", "Image too large (max 10MB).");
    }

    const {PutObjectCommand} = await import("@aws-sdk/client-s3");
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    }));

    return {objectKey, publicUrl: `${publicUrl}/${objectKey}`, contentType};
  },
);

// ===========================================================================
// R2 IMAGE VERIFICATION (used by submitGiftcardTrade)
// ===========================================================================
export async function verifyR2Images(
  uid: string,
  tradeId: string,
  objectKeys: string[],
): Promise<void> {
  const accountId = r2AccountId.value().trim();
  const bucketName = r2BucketName.value().trim();
  if (!accountId || !bucketName || accountId === "PLACEHOLDER") {
    throw new HttpsError("failed-precondition", "R2 is not configured.");
  }

  const s3 = await createS3(accountId, r2AccessKeyId.value().trim(), r2SecretAccessKey.value().trim());

  const expectedPrefix = `giftcard_images/${uid}/${tradeId}/`;
  for (const key of objectKeys) {
    if (typeof key !== "string" || !key.startsWith(expectedPrefix)) {
      throw new HttpsError("invalid-argument", "Card image path is invalid.");
    }
    try {
      await getS3Client();
      const result = await s3.send(new _HeadObjectCommand!({Bucket: bucketName, Key: key}));
      const contentType = result.ContentType || "";
      const size = Number(result.ContentLength ?? 0);
      if (!contentType.startsWith("image/") || size <= 0 || size > 10 * 1024 * 1024) {
        throw new HttpsError("invalid-argument", "A card image is invalid.");
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("invalid-argument", "A card image could not be verified.");
    }
  }
}

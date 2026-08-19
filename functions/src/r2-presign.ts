/**
 * Helper to generate presigned PUT URLs for Cloudflare R2.
 *
 * R2 is S3-compatible, so we use the AWS SDK's S3RequestPresigner
 * to create time-limited upload URLs that the client can use to
 * upload files directly to R2 without proxying through a Cloud Function.
 */
import {S3Client} from "@aws-sdk/client-s3";
import {PutObjectCommand} from "@aws-sdk/client-s3";
import {
  getSignedUrl,
} from "@aws-sdk/s3-request-presigner";

/**
 * Generate a presigned PUT URL for uploading a single object to R2.
 *
 * @param s3    - An S3Client configured for R2
 * @param bucket - R2 bucket name
 * @param key   - Object key (path within the bucket)
 * @param contentType - MIME type the client must send in Content-Type header
 * @param ttlSeconds - URL validity duration (default 600 = 10 minutes)
 * @returns The presigned URL string
 */
export async function presignPutObject(
  s3: S3Client,
  bucket: string,
  key: string,
  contentType: string,
  ttlSeconds = 600,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, {expiresIn: ttlSeconds});
}

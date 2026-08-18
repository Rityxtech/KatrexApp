import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

interface UploadResult {
  objectKey: string;
  publicUrl: string;
  contentType: string;
}

/**
 * Uploads an image to R2 via a server-side Cloud Function proxy.
 * This avoids R2 CORS issues since the upload happens server-side.
 * The image is sent as base64 to the `uploadAdminImage` callable.
 */
export async function uploadAdminImage(
  folder: "brand_images" | "promo_images",
  file: File,
): Promise<UploadResult> {
  // Read file as base64
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  const base64 = btoa(binary);

  const ext = file.name.split(".").pop()?.toLowerCase().replace(/^jpeg$/, "jpg") || "jpg";

  const call = httpsCallable<
    { folder: string; extension: string; data: string },
    UploadResult
  >(functions, "uploadAdminImage");
  const result = await call({ folder, extension: ext, data: base64 });
  return result.data;
}

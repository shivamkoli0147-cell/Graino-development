import { objectStorageClient } from "./objectStorage.js";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

function getBucketInfo(): { bucketName: string } {
  const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!privateDir) {
    throw new Error("PRIVATE_OBJECT_DIR is not set — Replit Object Storage not configured.");
  }
  const parts = privateDir.replace(/^\//, "").split("/");
  const bucketName = parts[0];
  if (!bucketName) throw new Error("Could not determine bucket name from PRIVATE_OBJECT_DIR");
  return { bucketName };
}

export async function uploadBufferToObjectStorage(
  buffer: Buffer,
  filename: string,
  mimetype: string
): Promise<string> {
  const { bucketName } = getBucketInfo();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectName = `products/${Date.now()}-${randomUUID()}-${safeName}`;

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(buffer, {
    metadata: { contentType: mimetype },
    resumable: false,
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}

export async function deleteFromObjectStorage(imageUrl: string): Promise<void> {
  try {
    const prefix = "https://storage.googleapis.com/";
    if (!imageUrl.startsWith(prefix)) return;
    const rest = imageUrl.slice(prefix.length);
    const slashIdx = rest.indexOf("/");
    if (slashIdx === -1) return;
    const bucketName = rest.slice(0, slashIdx);
    const objectName = rest.slice(slashIdx + 1);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (exists) await file.delete();
  } catch (e) {
    console.warn("[storage] deleteFromObjectStorage error:", String(e));
  }
}

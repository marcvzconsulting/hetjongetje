import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { assertSafeFetchUrl } from "./url-guard";

const REGION = process.env.SCALEWAY_REGION || "nl-ams";
const ENDPOINT = `https://s3.${REGION}.scw.cloud`;
const BUCKET = process.env.SCALEWAY_BUCKET;

// Public URL base. For Scaleway public-read objects this is:
//   https://<bucket>.s3.<region>.scw.cloud/<key>
const PUBLIC_BASE_URL =
  process.env.SCALEWAY_PUBLIC_BASE_URL ||
  (BUCKET ? `https://${BUCKET}.s3.${REGION}.scw.cloud` : "");

function requireEnv() {
  if (!BUCKET) throw new Error("SCALEWAY_BUCKET niet ingesteld");
  if (!process.env.SCALEWAY_ACCESS_KEY)
    throw new Error("SCALEWAY_ACCESS_KEY niet ingesteld");
  if (!process.env.SCALEWAY_SECRET_KEY)
    throw new Error("SCALEWAY_SECRET_KEY niet ingesteld");
}

let _client: S3Client | null = null;
function getClient(): S3Client {
  requireEnv();
  if (!_client) {
    _client = new S3Client({
      region: REGION,
      endpoint: ENDPOINT,
      credentials: {
        accessKeyId: process.env.SCALEWAY_ACCESS_KEY!,
        secretAccessKey: process.env.SCALEWAY_SECRET_KEY!,
      },
      // Scaleway vereist path-style niet, virtual-hosted werkt met nl-ams
      forcePathStyle: false,
    });
  }
  return _client;
}

/**
 * Download an image from a source URL (e.g. fal.ai) and upload it to our
 * Scaleway bucket. Returns the permanent public URL.
 *
 * The URL is validated against an allowlist before fetching to prevent
 * SSRF — an attacker (or a corrupted upstream response) cannot make this
 * function fetch arbitrary hosts.
 */
export async function uploadFromUrl(
  sourceUrl: string,
  key: string,
  contentType?: string
): Promise<string> {
  const safeUrl = assertSafeFetchUrl(sourceUrl);
  const response = await fetch(safeUrl);
  if (!response.ok) {
    throw new Error(
      `Download van bronafbeelding mislukt (${response.status}): ${sourceUrl}`
    );
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const detectedType =
    contentType ?? response.headers.get("content-type") ?? "image/jpeg";

  return uploadBuffer(buffer, key, detectedType);
}

export async function uploadBuffer(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `${PUBLIC_BASE_URL}/${key}`;
}

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: BUCKET!, Key: key })
  );
}

/**
 * Delete many objects in one or more batched calls (S3 allows up to 1000 keys
 * per request). Returns the keys that failed to delete (empty array on full
 * success).
 */
export async function deleteObjects(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const client = getClient();
  const failed: string[] = [];
  const BATCH = 1000;

  for (let i = 0; i < keys.length; i += BATCH) {
    const chunk = keys.slice(i, i + BATCH);
    const res = await client.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET!,
        Delete: {
          Objects: chunk.map((k) => ({ Key: k })),
          Quiet: true,
        },
      })
    );
    if (res.Errors?.length) {
      for (const err of res.Errors) {
        if (err.Key) failed.push(err.Key);
      }
    }
  }

  return failed;
}

/** Extract the storage key from a URL we produced, or null if it's not ours. */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url || !PUBLIC_BASE_URL) return null;
  const prefix = PUBLIC_BASE_URL + "/";
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}

/** Is this a URL we uploaded to our own storage (vs a fal.ai or other URL)? */
export function isOwnStorageUrl(url: string | null | undefined): boolean {
  return keyFromUrl(url) !== null;
}

// ---------- Key helpers ----------

export function storyPageKey(storyId: string, pageNumber: number): string {
  return `stories/${storyId}/page-${pageNumber}.jpg`;
}

export function storyEndingKey(storyId: string): string {
  return `stories/${storyId}/ending.jpg`;
}

export function approvedPreviewKey(childId: string): string {
  return `previews/${childId}/approved.jpg`;
}

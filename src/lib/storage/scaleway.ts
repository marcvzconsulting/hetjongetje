import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

/**
 * Upload an object PRIVATELY — no public-read ACL, so it can only be read
 * with signed credentials. Used for real children's photos (LoRA training
 * inputs) which must never sit on a guessable public URL. Returns the
 * storage key (not a URL — there is no public URL for a private object;
 * use {@link getPresignedGetUrl} to hand out a short-lived read link).
 */
export async function uploadPrivateBuffer(
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
      // No ACL → object inherits the bucket default (private). No long
      // immutable cache: these are short-lived training inputs.
      CacheControl: "private, no-store",
    })
  );
  return key;
}

/**
 * Create a short-lived presigned GET URL for a private object. Used to
 * hand fal.ai a temporary link to the training zip without making it
 * publicly readable. Default TTL 1 hour — long enough for fal to fetch,
 * short enough that a leaked link expires quickly.
 */
export async function getPresignedGetUrl(
  key: string,
  ttlSeconds = 3600
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: BUCKET!, Key: key }),
    { expiresIn: ttlSeconds }
  );
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

/**
 * List every object key under a prefix, following pagination. Prefixes
 * are per-child / per-story (e.g. `stories/<id>/`, `lora-training/<id>/`),
 * so this is the authoritative way to find everything we ever wrote for
 * that entity — including objects whose URL is no longer referenced in
 * the DB (e.g. an orphaned training zip).
 */
export async function listKeysByPrefix(prefix: string): Promise<string[]> {
  const client = getClient();
  const keys: string[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET!,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);
  return keys;
}

/**
 * Delete every object under a prefix. Returns how many keys were targeted
 * and which failed. Never throws — callers treat storage cleanup as
 * best-effort.
 */
export async function deleteByPrefix(
  prefix: string
): Promise<{ requested: number; failed: string[] }> {
  try {
    const keys = await listKeysByPrefix(prefix);
    if (keys.length === 0) return { requested: 0, failed: [] };
    const failed = await deleteObjects(keys);
    return { requested: keys.length, failed };
  } catch {
    return { requested: 0, failed: [prefix] };
  }
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

/**
 * LEGACY voorlees-audio (ElevenLabs mp3) — één object per verhaal per
 * stem, uit het oude hele-verhaal-model. Alleen nog gebruikt door
 * scripts/wipe-legacy-story-audio.ts; nieuwe audio gaat per pagina via
 * storyAudioPageKey.
 */
export function storyAudioKey(storyId: string, voiceKey: string): string {
  return `stories/${storyId}/audio-${voiceKey}.mp3`;
}

/** Voorlees-audio (ElevenLabs mp3) — één object per verhaal per stem per pagina. */
export function storyAudioPageKey(
  storyId: string,
  voiceKey: string,
  pageNumber: number,
): string {
  return `stories/${storyId}/audio-${voiceKey}-p${pageNumber}.mp3`;
}

export function approvedPreviewKey(childId: string): string {
  return `previews/${childId}/approved.jpg`;
}

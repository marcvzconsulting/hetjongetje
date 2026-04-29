import { fal } from "@fal-ai/client";
import JSZip from "jszip";
import { uploadBuffer, deleteObjects } from "@/lib/storage/scaleway";
import { assertSafeFetchUrl } from "@/lib/storage/url-guard";

// Configure fal (idempotent — safe to call at import time).
if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

/**
 * Endpoint used for training. Flux LoRA fast training is well-suited for
 * character consistency on 5–15 reference photos.
 *   https://fal.ai/models/fal-ai/flux-lora-fast-training
 */
const TRAINING_ENDPOINT = "fal-ai/flux-lora-fast-training";

export const MIN_PHOTOS = 5;
export const MAX_PHOTOS = 15;

/** Upload one photo to our Scaleway bucket and return its public URL. */
export async function uploadChildPhoto(
  childId: string,
  index: number,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeTypeToExt(mimeType);
  const key = `lora-training/${childId}/photo-${index}.${ext}`;
  return uploadBuffer(buffer, key, mimeType);
}

/**
 * Fetch each photo URL, bundle into a ZIP, upload the ZIP to our bucket
 * and return its URL. fal.ai's training endpoint accepts a zip URL via
 * `images_data_url`.
 */
export async function buildTrainingZip(
  childId: string,
  photoUrls: string[]
): Promise<string> {
  const zip = new JSZip();
  for (let i = 0; i < photoUrls.length; i++) {
    const safe = assertSafeFetchUrl(photoUrls[i]);
    const res = await fetch(safe);
    if (!res.ok) throw new Error(`Kon foto ${i + 1} niet ophalen`);
    const ab = await res.arrayBuffer();
    const url = photoUrls[i];
    const extMatch = url.match(/\.(jpe?g|png|webp)(?:\?|$)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    zip.file(`photo-${String(i + 1).padStart(2, "0")}.${ext}`, ab);
  }
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipKey = `lora-training/${childId}/training-set.zip`;
  return uploadBuffer(zipBuffer, zipKey, "application/zip");
}

/**
 * Kick off training on fal.ai. Returns the queue request_id so we can
 * poll for status later. Training usually takes 5-10 minutes.
 */
export async function startLoraTraining(params: {
  zipUrl: string;
  triggerWord: string;
}): Promise<{ requestId: string }> {
  const { request_id } = await fal.queue.submit(TRAINING_ENDPOINT, {
    input: {
      images_data_url: params.zipUrl,
      trigger_word: params.triggerWord,
      is_style: false,
      // Defaults are already tuned for 5–15 character photos.
    },
  });
  return { requestId: request_id };
}

export type LoraTrainingResult =
  | { state: "queued" | "in_progress" }
  | { state: "completed"; loraUrl: string }
  | { state: "failed"; reason: string };

/**
 * Poll fal.ai for the training status. If completed, fetch the result
 * (includes the diffusers_lora_file URL).
 */
export async function pollLoraTraining(
  requestId: string
): Promise<LoraTrainingResult> {
  const status = await fal.queue.status(TRAINING_ENDPOINT, {
    requestId,
    logs: false,
  });

  // fal status types: IN_QUEUE | IN_PROGRESS | COMPLETED
  const s = (status as { status?: string }).status;
  if (s === "IN_QUEUE") return { state: "queued" };
  if (s === "IN_PROGRESS") return { state: "in_progress" };
  if (s !== "COMPLETED") {
    return { state: "failed", reason: `Onverwachte status: ${s ?? "unknown"}` };
  }

  try {
    const result = await fal.queue.result(TRAINING_ENDPOINT, { requestId });
    const data = (result as {
      data?: { diffusers_lora_file?: { url?: string } };
    }).data;
    const loraUrl = data?.diffusers_lora_file?.url;
    if (!loraUrl) {
      return { state: "failed", reason: "Geen LoRA-bestand terug van fal.ai" };
    }
    return { state: "completed", loraUrl };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { state: "failed", reason: message };
  }
}

/**
 * Cancel a running training (if fal supports it) — best-effort. Safe to
 * ignore errors.
 */
export async function cancelLoraTraining(requestId: string): Promise<void> {
  try {
    const client = fal as unknown as {
      queue: {
        cancel?: (
          endpoint: string,
          opts: { requestId: string }
        ) => Promise<unknown>;
      };
    };
    if (client.queue.cancel) {
      await client.queue.cancel(TRAINING_ENDPOINT, { requestId });
    }
  } catch (err) {
    console.warn("[lora] cancel failed (best-effort):", err);
  }
}

/**
 * Delete all stored training inputs for a child (photos + zip). Returns
 * the keys that failed to delete. Does not throw.
 */
export async function deleteTrainingAssets(
  photoUrls: string[]
): Promise<{ requested: number; failed: string[] }> {
  const { keyFromUrl } = await import("@/lib/storage/scaleway");
  const keys: string[] = [];
  for (const u of photoUrls) {
    const k = keyFromUrl(u);
    if (k) keys.push(k);
  }
  // The zip lives at a deterministic path even if we lost the URL.
  // We could also attempt to delete `lora-training/<childId>/training-set.zip`
  // via direct key, but the caller knows the childId so they can pass it.
  if (keys.length === 0) return { requested: 0, failed: [] };
  const failed = await deleteObjects(keys);
  return { requested: keys.length, failed };
}

/** Trigger word is baked into the LoRA during training — must also go
 * into every inference prompt to activate the character. Unique per
 * child so multiple trained children can coexist in one account.
 */
export function buildTriggerWord(childId: string): string {
  const slug = childId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `OV${slug}`;
}

function mimeTypeToExt(m: string): string {
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("png")) return "png";
  if (m.includes("webp")) return "webp";
  return "jpg";
}

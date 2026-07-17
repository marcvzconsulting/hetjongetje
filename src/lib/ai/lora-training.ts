import { fal } from "@fal-ai/client";
import JSZip from "jszip";
import {
  uploadPrivateBuffer,
  getPresignedGetUrl,
  deleteByPrefix,
} from "@/lib/storage/scaleway";

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

/**
 * Upload one child photo PRIVATELY and return its storage key. These are
 * real photos of a real child — they must never sit on a public URL, so
 * they go to a private object and are referenced by key only.
 */
export async function uploadChildPhoto(
  childId: string,
  index: number,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = mimeTypeToExt(mimeType);
  const key = `lora-training/${childId}/photo-${index}.${ext}`;
  return uploadPrivateBuffer(buffer, key, mimeType);
}

/**
 * Bundle the already-in-memory photo buffers into a ZIP and upload it
 * PRIVATELY, returning the zip's storage key. Building from the buffers we
 * already hold (rather than re-fetching each uploaded object) avoids a
 * round-trip AND means the individual photos never need to be publicly
 * readable. fal.ai reads the zip via a short-lived presigned URL — see
 * {@link presignTrainingZip}.
 */
export async function buildTrainingZip(
  childId: string,
  photos: { buffer: Buffer; mimeType: string }[]
): Promise<string> {
  const zip = new JSZip();
  photos.forEach((p, i) => {
    const ext = mimeTypeToExt(p.mimeType);
    zip.file(`photo-${String(i + 1).padStart(2, "0")}.${ext}`, p.buffer);
  });
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const zipKey = `lora-training/${childId}/training-set.zip`;
  return uploadPrivateBuffer(zipBuffer, zipKey, "application/zip");
}

/**
 * Create a short-lived presigned GET URL for the private training zip so
 * fal.ai can fetch it. TTL comfortably covers fal pulling the file at
 * submit time; after that the link expires.
 */
export async function presignTrainingZip(zipKey: string): Promise<string> {
  return getPresignedGetUrl(zipKey, 3600);
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
 * Cancel every in-progress LoRA training job belonging to the given user.
 * Used during account deletion (both self-delete and admin-delete) so we
 * stop paying fal.ai for a job that's about to be orphaned.
 *
 * fal.ai does not expose a "delete trained LoRA file" API — once a model
 * is on their CDN we can't actively remove it. We do, however, delete
 * the loraUrl reference from our DB during the cascade so nobody fetches
 * it any longer.
 */
export async function cancelInProgressLoraJobs(userId: string): Promise<void> {
  try {
    const { prisma } = await import("@/lib/db");
    const inProgress = await prisma.childProfile.findMany({
      where: {
        userId,
        loraStatus: "training",
        loraTrainingRequestId: { not: null },
      },
      select: { id: true, loraTrainingRequestId: true },
    });
    for (const child of inProgress) {
      if (child.loraTrainingRequestId) {
        await cancelLoraTraining(child.loraTrainingRequestId);
      }
    }
  } catch (err) {
    console.warn("[lora] cancelInProgressLoraJobs (best-effort):", err);
  }
}

/**
 * Delete ALL stored training inputs for a child — every photo AND the
 * training-set zip — by wiping the whole `lora-training/<childId>/`
 * prefix. Prefix-based so nothing is missed even if the reference URLs
 * were already cleared from the DB. Does not throw.
 */
export async function deleteTrainingAssets(
  childId: string
): Promise<{ requested: number; failed: string[] }> {
  return deleteByPrefix(`lora-training/${childId}/`);
}

/**
 * Enforce the "photos are wiped within days" promise WITHOUT relying on
 * the parent re-opening the status page. Walks every child stuck in
 * `training`, polls fal, and on any terminal outcome (ready / failed, or
 * stuck past maxAgeHours) persists the result AND sweeps the training
 * inputs. Meant to run from the daily cron. Never throws.
 */
export async function finalizeStaleLoraTrainings(opts?: {
  maxAgeHours?: number;
}): Promise<{ checked: number; finalized: number; cleaned: number }> {
  const { prisma } = await import("@/lib/db");
  const maxAgeMs = (opts?.maxAgeHours ?? 48) * 3600 * 1000;
  let finalized = 0;
  let cleaned = 0;

  const training = await prisma.childProfile.findMany({
    where: { loraStatus: "training", loraTrainingRequestId: { not: null } },
    select: {
      id: true,
      loraTrainingRequestId: true,
      loraConsentAt: true,
    },
  });

  for (const child of training) {
    if (!child.loraTrainingRequestId) continue;

    let poll: LoraTrainingResult;
    try {
      poll = await pollLoraTraining(child.loraTrainingRequestId);
    } catch (err) {
      console.error(`[lora-cleanup] poll failed for child ${child.id}:`, err);
      continue;
    }

    const sweep = async () => {
      await deleteTrainingAssets(child.id).catch((e) =>
        console.error(`[lora-cleanup] asset sweep failed for ${child.id}:`, e)
      );
      cleaned++;
    };

    if (poll.state === "completed") {
      await prisma.childProfile.update({
        where: { id: child.id },
        data: {
          loraStatus: "ready",
          loraUrl: poll.loraUrl,
          loraTrainedAt: new Date(),
          loraFailureReason: null,
          referenceImages: [],
        },
      });
      await sweep();
      finalized++;
    } else if (poll.state === "failed") {
      await prisma.childProfile.update({
        where: { id: child.id },
        data: {
          loraStatus: "failed",
          loraFailureReason: poll.reason,
          referenceImages: [],
        },
      });
      await sweep();
      finalized++;
    } else {
      // Still queued/in_progress: fal jobs finish in minutes, so anything
      // older than maxAgeHours is dead — give up and wipe the photos so
      // they don't linger indefinitely.
      const startedAt = child.loraConsentAt?.getTime() ?? 0;
      if (startedAt && Date.now() - startedAt > maxAgeMs) {
        await prisma.childProfile.update({
          where: { id: child.id },
          data: {
            loraStatus: "failed",
            loraFailureReason:
              "Training vastgelopen — automatisch opgeruimd door onderhoud.",
            referenceImages: [],
          },
        });
        await sweep();
        finalized++;
      }
    }
  }

  return { checked: training.length, finalized, cleaned };
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

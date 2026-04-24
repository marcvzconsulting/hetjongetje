import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  buildTriggerWord,
  buildTrainingZip,
  startLoraTraining,
  pollLoraTraining,
  cancelLoraTraining,
  deleteTrainingAssets,
  uploadChildPhoto,
  MIN_PHOTOS,
  MAX_PHOTOS,
} from "@/lib/ai/lora-training";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";
import { sendMail } from "@/lib/email/client";
import { buildLoraReadyMail } from "@/lib/email/templates/lora-ready";
import { buildAppUrl } from "@/lib/url";

// Long-running because we upload multiple photos + zip + call fal queue.
export const maxDuration = 60;

interface Props {
  params: Promise<{ childId: string }>;
}

// ── GET /api/children/[childId]/lora ─────────────────────────
// Returns the current LoRA status. If status is "training", first polls
// fal.ai and persists any new state (ready / failed) before responding.

export async function GET(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { childId } = await params;
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
    select: {
      id: true,
      name: true,
      loraStatus: true,
      loraUrl: true,
      loraTrainingRequestId: true,
      loraTriggerWord: true,
      loraTrainedAt: true,
      loraFailureReason: true,
      loraReadyEmailSentAt: true,
      referenceImages: true,
    },
  });
  if (!child)
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });

  // If we're mid-training, poll fal to see if anything changed.
  if (
    child.loraStatus === "training" &&
    child.loraTrainingRequestId &&
    process.env.FAL_KEY
  ) {
    const poll = await pollLoraTraining(child.loraTrainingRequestId);
    if (poll.state === "completed") {
      await prisma.childProfile.update({
        where: { id: childId },
        data: {
          loraStatus: "ready",
          loraUrl: poll.loraUrl,
          loraTrainedAt: new Date(),
          loraFailureReason: null,
        },
      });
      // Best-effort cleanup of original photos — GDPR promise.
      if (child.referenceImages.length > 0) {
        deleteTrainingAssets(child.referenceImages).catch((e) =>
          console.error("[lora] photo cleanup failed:", e)
        );
        await prisma.childProfile.update({
          where: { id: childId },
          data: { referenceImages: [] },
        });
      }

      // Notify the parent — one-shot, idempotent via loraReadyEmailSentAt.
      if (!child.loraReadyEmailSentAt) {
        (async () => {
          try {
            const user = await prisma.user.findUnique({
              where: { id: session.user.id },
              select: { email: true, name: true },
            });
            if (!user) return;
            const generateUrl = await buildAppUrl(`/generate/${childId}`);
            const mail = buildLoraReadyMail({
              userName: user.name,
              childName: child.name,
              generateUrl,
            });
            await sendMail({
              to: user.email,
              toName: user.name,
              subject: mail.subject,
              html: mail.html,
              text: mail.text,
              tags: ["lora-ready"],
            });
            await prisma.childProfile.update({
              where: { id: childId },
              data: { loraReadyEmailSentAt: new Date() },
            });
          } catch (mailErr) {
            console.error("[lora-ready] mail send failed", mailErr);
          }
        })();
      }

      return NextResponse.json({
        status: "ready",
        loraUrl: poll.loraUrl,
        trainedAt: new Date().toISOString(),
      });
    }
    if (poll.state === "failed") {
      await prisma.childProfile.update({
        where: { id: childId },
        data: {
          loraStatus: "failed",
          loraFailureReason: poll.reason,
        },
      });
      return NextResponse.json({
        status: "failed",
        failureReason: poll.reason,
      });
    }
    // Still training — pass through
    return NextResponse.json({ status: "training" });
  }

  return NextResponse.json({
    status: child.loraStatus,
    loraUrl: child.loraUrl,
    trainedAt: child.loraTrainedAt,
    failureReason: child.loraFailureReason,
  });
}

// ── POST /api/children/[childId]/lora ────────────────────────
// Kicks off training. Expects multipart FormData with:
//   - consent=1 (required — records loraConsentAt)
//   - photos[]: File (5..15 images)

export async function POST(req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  if (!process.env.FAL_KEY) {
    return NextResponse.json(
      { error: "FAL_KEY niet ingesteld" },
      { status: 500 }
    );
  }

  // Rate limit BEFORE any paid work — training costs €2-3 per run.
  const blocked = await enforceRateLimit("loraTrain", session.user.id);
  if (blocked) return blocked;

  const { childId } = await params;
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child)
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });

  if (child.loraStatus === "training") {
    return NextResponse.json(
      { error: "Training loopt al voor dit profiel" },
      { status: 409 }
    );
  }

  const form = await req.formData();
  const consent = form.get("consent");
  if (consent !== "1") {
    return NextResponse.json(
      { error: "Toestemming ontbreekt" },
      { status: 400 }
    );
  }

  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (files.length < MIN_PHOTOS) {
    return NextResponse.json(
      { error: `Upload minimaal ${MIN_PHOTOS} foto's` },
      { status: 400 }
    );
  }
  if (files.length > MAX_PHOTOS) {
    return NextResponse.json(
      { error: `Maximaal ${MAX_PHOTOS} foto's` },
      { status: 400 }
    );
  }

  // Basic per-file validation: must be an image, max 10MB each.
  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      return NextResponse.json(
        { error: `Bestand ${f.name} is geen afbeelding` },
        { status: 400 }
      );
    }
    if (f.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: `Bestand ${f.name} is groter dan 10 MB` },
        { status: 400 }
      );
    }
  }

  try {
    // 1. Upload all photos to Scaleway
    const photoUrls: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const buf = Buffer.from(await f.arrayBuffer());
      const url = await uploadChildPhoto(childId, i + 1, buf, f.type);
      photoUrls.push(url);
    }

    // 2. Bundle into a training zip on our bucket
    const zipUrl = await buildTrainingZip(childId, photoUrls);

    // 3. Submit to fal.ai
    const triggerWord = buildTriggerWord(childId);
    const { requestId } = await startLoraTraining({ zipUrl, triggerWord });

    // 4. Persist state
    await prisma.childProfile.update({
      where: { id: childId },
      data: {
        referenceImages: photoUrls,
        loraStatus: "training",
        loraTrainingRequestId: requestId,
        loraTriggerWord: triggerWord,
        loraConsentAt: new Date(),
        loraFailureReason: null,
        loraUrl: null,
        loraTrainedAt: null,
      },
    });

    return NextResponse.json({
      status: "training",
      requestId,
      triggerWord,
    });
  } catch (err) {
    console.error("[lora] start training failed:", err);
    const reason = err instanceof Error ? err.message : "Onbekende fout";
    await prisma.childProfile.update({
      where: { id: childId },
      data: {
        loraStatus: "failed",
        loraFailureReason: reason,
      },
    });
    return NextResponse.json(
      { error: "Training starten mislukt", reason },
      { status: 500 }
    );
  }
}

// ── DELETE /api/children/[childId]/lora ──────────────────────
// Intrekken van toestemming: cancel indien lopend, verwijder LoRA +
// alle foto's, reset status.

export async function DELETE(_req: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { childId } = await params;
  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });
  if (!child)
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });

  // Cancel running training best-effort.
  if (child.loraStatus === "training" && child.loraTrainingRequestId) {
    await cancelLoraTraining(child.loraTrainingRequestId);
  }

  // Delete photos + zip from our bucket.
  if (child.referenceImages.length > 0) {
    await deleteTrainingAssets(child.referenceImages).catch((e) =>
      console.error("[lora] delete failed:", e)
    );
  }

  await prisma.childProfile.update({
    where: { id: childId },
    data: {
      referenceImages: [],
      loraStatus: "none",
      loraUrl: null,
      loraTrainingRequestId: null,
      loraTriggerWord: null,
      loraTrainedAt: null,
      loraConsentAt: null,
      loraFailureReason: null,
    },
  });

  return NextResponse.json({ status: "none" });
}

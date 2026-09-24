import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ChildProfile } from "@prisma/client";
import { buildCharacterDescription, buildIllustrationStyle } from "@/lib/ai/story-generator";
import { loadAiPromptSnippets } from "@/lib/ai/prompts/store";
import {
  buildPortraitPrompt,
  generatePortrait,
  generateCharacterSheet,
} from "@/lib/ai/character-sheet";
import {
  uploadFromUrl,
  approvedPreviewKey,
  referenceFaceKey,
  referenceBodyKey,
  isOwnStorageUrl,
} from "@/lib/storage/scaleway";
import { enforceRateLimit } from "@/lib/rate-limit/api-rate-limit";
import { maybeAlertFalBalanceExhausted } from "@/lib/ai/fal-balance";
import { loadUserGate } from "@/lib/user-gate";

// Goedkeuren maakt sinds sept 2026 ook het karakterblad (2 x flux-2-pro/edit,
// ~25 s) plus uploads; zonder expliciete limiet kapt Vercel dat af.
export const maxDuration = 90;

interface Props {
  params: Promise<{ childId: string }>;
}

// Uiterlijk uit het profiel → CharacterBible-vorm voor de promptbouwers.
function bibleFromChild(child: ChildProfile) {
  return {
    childName: child.name,
    dateOfBirth: child.dateOfBirth.toISOString(),
    gender: child.gender,
    hairColor: child.hairColor || undefined,
    hairStyle: child.hairStyle || undefined,
    eyeColor: child.eyeColor || undefined,
    skinColor: child.skinColor || undefined,
    wearsGlasses: child.wearsGlasses,
    hasFreckles: child.hasFreckles,
    interests: child.interests,
    mainCharacterType: child.mainCharacterType,
    mainCharacterDescription: child.mainCharacterDescription || undefined,
  };
}

// POST: generate a preview illustration
export async function POST(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY niet ingesteld" }, { status: 500 });
  }

  // Block pending/suspended users from burning fal.ai credits before
  // an admin has approved the account.
  const gate = await loadUserGate(session.user.id);
  if (!gate?.isApproved) {
    return NextResponse.json(
      { error: "Je account moet eerst goedgekeurd worden" },
      { status: 403 }
    );
  }

  // Rate limit BEFORE fal.ai call (costs ~€0.01 per preview)
  const blocked = await enforceRateLimit("previewGenerate", session.user.id);
  if (blocked) return blocked;

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  const bible = bibleFromChild(child);
  const charDescription = buildCharacterDescription(bible);
  // Zelfde stijlregel als de verhalen (admin-override uit /admin/ai-prompts),
  // zodat portret en pagina's in dezelfde stijl staan. Voorheen gebruikte
  // het portret de in-code default.
  const style = buildIllustrationStyle(bible, await loadAiPromptSnippets());

  const prompt = buildPortraitPrompt(charDescription, style);

  // Prompt contains the child's appearance + name. Only print in dev.
  if (process.env.NODE_ENV === "development") {
    console.log("[preview] Prompt:", prompt);
  }

  try {
    // FLUX.2 Pro (sinds sept 2026): scherper gezicht op 1024px, en het
    // portret is straks óók de referentie voor alle verhaalillustraties.
    const imageUrl = await generatePortrait(prompt);

    return NextResponse.json({
      imageUrl,
      characterPrompt: charDescription,
    });
  } catch (err) {
    console.error("Preview generation error:", err);
    await maybeAlertFalBalanceExhausted(err, "karakterportret");
    return NextResponse.json(
      { error: "Preview genereren mislukt" },
      { status: 500 }
    );
  }
}

// PATCH: approve the preview (save prompt + image)
export async function PATCH(request: NextRequest, { params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const gate = await loadUserGate(session.user.id);
  if (!gate?.isApproved) {
    return NextResponse.json(
      { error: "Je account moet eerst goedgekeurd worden" },
      { status: 403 }
    );
  }

  const { childId } = await params;
  const body = await request.json();
  const { characterPrompt, imageUrl } = body as {
    characterPrompt: string;
    imageUrl: string | null;
  };

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) {
    return NextResponse.json({ error: "Profiel niet gevonden" }, { status: 404 });
  }

  // If the approved image came from fal.ai (temporary URL), copy it to
  // our own storage so the approved preview stays accessible long-term.
  // If it's already one of our URLs (e.g. re-approval), leave it alone.
  let persistedUrl: string | null = imageUrl ?? null;
  // Het portret wordt altijd op dezelfde sleutel overschreven, dus de URL
  // verandert niet bij een nieuw beeld; alleen deze vlag zegt of er een
  // vers portret is vastgelegd.
  let freshPortrait = false;
  if (imageUrl && !isOwnStorageUrl(imageUrl)) {
    try {
      persistedUrl = await uploadFromUrl(imageUrl, approvedPreviewKey(childId));
      freshPortrait = true;
    } catch (err) {
      console.error("[preview] Opslaan approved preview mislukt:", err);
      return NextResponse.json(
        { error: "Preview kon niet worden opgeslagen. Probeer opnieuw." },
        { status: 500 }
      );
    }
  }

  // Karakterblad: twee extra aanzichten (close-up gezicht, driekwart) van
  // het goedgekeurde portret. Die gaan samen met het portret als
  // referenties mee in elke verhaalillustratie; het gezicht op het portret
  // alleen is te klein om oogkleur en gezichtsvorm vast te houden.
  // Best-effort: mislukt dit, dan blijft het portret de enige referentie
  // en vult scripts/backfill-reference-sheets.ts het later aan.
  // Vers portret → blad opnieuw; zelfde portret zonder blad → blad aanvullen.
  let referenceSheetUrls: string[] = persistedUrl ? child.referenceSheetUrls : [];
  if (persistedUrl && (freshPortrait || referenceSheetUrls.length === 0)) {
    // ~$0.06 aan fal.ai-calls: zelfde budget-emmer als het portret. Bij
    // een vol emmertje keuren we gewoon goed zonder blad (geen 429).
    const blocked = await enforceRateLimit("previewGenerate", session.user.id);
    referenceSheetUrls = [];
    if (!blocked) {
      try {
        const style = buildIllustrationStyle(
          bibleFromChild(child),
          await loadAiPromptSnippets(),
        );
        const sheet = await generateCharacterSheet(persistedUrl, style);
        if (sheet) {
          const [faceUrl, bodyUrl] = await Promise.all([
            uploadFromUrl(sheet.faceUrl, referenceFaceKey(childId)),
            uploadFromUrl(sheet.bodyUrl, referenceBodyKey(childId)),
          ]);
          referenceSheetUrls = [faceUrl, bodyUrl];
        } else {
          console.warn("[preview] Karakterblad gaf geen beeld terug; portret blijft enige referentie");
        }
      } catch (err) {
        console.error("[preview] Karakterblad mislukt; portret blijft enige referentie:", err);
        await maybeAlertFalBalanceExhausted(err, "karakterblad");
      }
    }
  }

  const updated = await prisma.childProfile.update({
    where: { id: childId },
    data: {
      approvedCharacterPrompt: characterPrompt,
      approvedPreviewUrl: persistedUrl,
      referenceSheetUrls,
    },
  });

  return NextResponse.json(updated);
}

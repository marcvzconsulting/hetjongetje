/**
 * Genereer een demo-verhaal op het admin-account (PRODUCTIE) en zet het
 * in een landing-preview-slot. Gebruikt exact dezelfde generator-keten
 * als de app (generateStory → generateIllustrations → Scaleway-upload),
 * dus het resultaat is representatief voor wat klanten krijgen.
 *
 * Gebruik:  npx tsx scripts/generate-demo-story.ts
 * Config:   pas het CONFIG-blok hieronder aan voor een ander kind/slot.
 *
 * Kosten: één verhaal (~€0,10-0,15 aan Claude + FLUX).
 */
import { config } from "dotenv";

// Eerst .env (API-keys, Scaleway), daarna prod-DATABASE_URL eroverheen.
config({ path: ".env" });
config({ path: ".env.production.local", override: true });

const CONFIG = {
  adminEmail: "admin@onsverhaaltje.nl",
  slot: "boy-4" as const,
  child: {
    name: "Willem",
    gender: "boy",
    dateOfBirth: new Date("2022-03-15"), // 4 jaar (juli 2026)
    hairColor: "blond",
    hairStyle: "kort en een beetje warrig",
    eyeColor: "blauw",
    skinColor: "licht",
    interests: ["dino's", "graafmachines", "zwemmen"],
  },
  storyRequest: {
    setting: "dinosaur_land",
    adventureType: "discovery",
    mood: "exciting",
    specialDetail:
      "Willem vond vandaag een glimmende steen in de zandbak en stopte hem trots in zijn broekzak.",
    length: "kort" as const,
    mainCharacterType: "self",
  },
};

async function main() {
  // Dynamische imports ná de env-setup, zodat prisma/SDK's de juiste
  // (prod-)omgeving zien bij initialisatie.
  const { prisma } = await import("@/lib/db");
  const { generateStory } = await import("@/lib/ai/story-generator");
  const { generateIllustrations } = await import(
    "@/lib/ai/illustration-generator"
  );
  const { computeStoryAiCostCents } = await import("@/lib/ai/pricing");
  const { uploadFromUrl, storyPageKey, storyEndingKey } = await import(
    "@/lib/storage/scaleway"
  );
  const { randomUUID } = await import("node:crypto");

  if (!process.env.FAL_KEY) throw new Error("FAL_KEY ontbreekt");
  if (!process.env.ANTHROPIC_API_KEY)
    throw new Error("ANTHROPIC_API_KEY ontbreekt");

  const admin = await prisma.user.findUnique({
    where: { email: CONFIG.adminEmail },
  });
  if (!admin) throw new Error(`Admin ${CONFIG.adminEmail} niet gevonden`);
  console.log(`✓ Admin: ${admin.email}`);

  // Kindprofiel hergebruiken of aanmaken
  let child = await prisma.childProfile.findFirst({
    where: { userId: admin.id, name: CONFIG.child.name },
  });
  if (!child) {
    child = await prisma.childProfile.create({
      data: {
        userId: admin.id,
        name: CONFIG.child.name,
        gender: CONFIG.child.gender,
        dateOfBirth: CONFIG.child.dateOfBirth,
        hairColor: CONFIG.child.hairColor,
        hairStyle: CONFIG.child.hairStyle,
        eyeColor: CONFIG.child.eyeColor,
        skinColor: CONFIG.child.skinColor,
        wearsGlasses: false,
        hasFreckles: false,
        interests: CONFIG.child.interests,
        fears: [],
        mainCharacterType: CONFIG.storyRequest.mainCharacterType,
      },
    });
    console.log(`✓ Kindprofiel aangemaakt: ${child.name} (${child.id})`);
  } else {
    console.log(`✓ Kindprofiel hergebruikt: ${child.name} (${child.id})`);
  }

  const characterBible = {
    childName: child.name,
    dateOfBirth: child.dateOfBirth,
    gender: child.gender,
    hairColor: child.hairColor ?? undefined,
    hairStyle: child.hairStyle ?? undefined,
    eyeColor: child.eyeColor ?? undefined,
    skinColor: child.skinColor ?? undefined,
    wearsGlasses: child.wearsGlasses,
    hasFreckles: child.hasFreckles,
    interests: child.interests,
    fears: child.fears,
    mainCharacterType: CONFIG.storyRequest.mainCharacterType,
  };

  console.log("⏳ Verhaal genereren (Claude)...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let generated = await generateStory(characterBible as any, CONFIG.storyRequest as any);
  console.log(`✓ "${generated.title}" — ${generated.pages.length} pagina's`);

  console.log("⏳ Illustraties genereren (FLUX)...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generated = await generateIllustrations(generated, characterBible as any);

  const storyId = randomUUID();
  console.log("⏳ Illustraties naar Scaleway...");
  const pageUrls: (string | null)[] = [];
  for (let i = 0; i < generated.pages.length; i++) {
    const src = generated.pages[i].imageUrl;
    pageUrls.push(src ? await uploadFromUrl(src, storyPageKey(storyId, i + 1)) : null);
  }
  const endingUrl = generated.endingImageUrl
    ? await uploadFromUrl(generated.endingImageUrl, storyEndingKey(storyId))
    : null;

  const missing = pageUrls.filter((u) => !u).length;
  if (missing > 0) {
    throw new Error(
      `${missing} pagina('s) zonder illustratie — demo-verhaal niet opgeslagen. Probeer opnieuw.`,
    );
  }
  console.log(`✓ ${pageUrls.length} pagina-illustraties + ending geüpload`);

  const aiCostCents =
    generated.textUsage && generated.imageUsage
      ? computeStoryAiCostCents(generated.textUsage, generated.imageUsage)
      : null;

  const story = await prisma.story.create({
    data: {
      id: storyId,
      childProfileId: child.id,
      title: generated.title,
      subtitle: generated.tag,
      language: "nl",
      setting: CONFIG.storyRequest.setting,
      status: "ready",
      generationParams: CONFIG.storyRequest,
      aiCostCents,
      pages: {
        create: [
          ...generated.pages.map((p, i) => ({
            pageNumber: i + 1,
            text: p.text,
            illustrationUrl: pageUrls[i],
            illustrationPrompt: p.illustrationPrompt,
            illustrationDescription: p.illustrationPrompt,
          })),
          {
            pageNumber: generated.pages.length + 1,
            text: "",
            illustrationUrl: endingUrl,
            illustrationPrompt: generated.endingIllustrationPrompt,
            illustrationDescription: generated.endingIllustrationPrompt,
          },
        ],
      },
    },
  });
  console.log(`✓ Verhaal opgeslagen: ${story.id}`);

  // Slot vullen (één verhaal per slot)
  await prisma.story.updateMany({
    where: { landingPreviewSlot: CONFIG.slot },
    data: { landingPreviewSlot: null },
  });
  await prisma.story.update({
    where: { id: story.id },
    data: { landingPreviewSlot: CONFIG.slot },
  });
  console.log(`✓ Slot ${CONFIG.slot} gevuld met "${story.title}"`);
  console.log(
    `\nKlaar! AI-kosten: ${aiCostCents !== null ? `€${(aiCostCents / 100).toFixed(2)}` : "onbekend"}. De landing toont het verhaal na de volgende deploy/revalidate.`,
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FOUT:", err);
  process.exit(1);
});

/**
 * Karakterblad aanmaken voor kinderen die al een goedgekeurd portret
 * hebben maar nog geen referenceSheetUrls (profielen van vóór sept 2026).
 * Nieuwe goedkeuringen maken het blad zelf aan (preview/route.ts PATCH);
 * dit script vult de achterstand aan en herstelt mislukte pogingen.
 *
 * Usage:
 *   npx tsx scripts/backfill-reference-sheets.ts                  # dry-run, dev-DB
 *   npx tsx scripts/backfill-reference-sheets.ts --apply          # genereren, dev-DB
 *   npx tsx scripts/backfill-reference-sheets.ts --prod --apply   # productie
 *   opties: --child <id>   alleen dit kind
 *           --limit <n>    maximaal n kinderen (default 1000)
 *
 * Kosten: ~$0.06 per kind (2 × flux-2-pro/edit). Zonder --apply alleen tellen.
 * Logt alleen kind-id's, geen namen.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const useProd = process.argv.includes("--prod");
const apply = process.argv.includes("--apply");

// Eerst .env (API-keys, Scaleway), daarna eventueel prod-DATABASE_URL eroverheen.
config({ path: ".env" });
if (useProd) {
  const ENV_FILE = ".env.production.local";
  if (!existsSync(resolve(process.cwd(), ENV_FILE))) {
    console.error(`❌ ${ENV_FILE} bestaat niet in de project-root.`);
    process.exit(1);
  }
  config({ path: ENV_FILE, override: true });
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  if (!process.env.FAL_KEY) throw new Error("FAL_KEY ontbreekt");

  // Dynamische imports ná de env-setup, zodat prisma/fal de juiste omgeving zien.
  const { prisma } = await import("@/lib/db");
  const { buildIllustrationStyle } = await import("@/lib/ai/story-generator");
  const { loadAiPromptSnippets } = await import("@/lib/ai/prompts/store");
  const { generateCharacterSheet } = await import("@/lib/ai/character-sheet");
  const { uploadFromUrl, referenceFaceKey, referenceBodyKey } = await import(
    "@/lib/storage/scaleway"
  );

  const childId = arg("child");
  const limit = Number(arg("limit") ?? "1000");

  const children = await prisma.childProfile.findMany({
    where: {
      approvedPreviewUrl: { not: null },
      referenceSheetUrls: { isEmpty: true },
      ...(childId ? { id: childId } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  console.log(
    `${children.length} kind(eren) met portret zonder karakterblad (${useProd ? "PROD" : "dev"})`,
  );
  if (!apply) {
    console.log("Dry-run. Voeg --apply toe om te genereren (~$0.06 per kind).");
    await prisma.$disconnect();
    return;
  }

  const snippets = await loadAiPromptSnippets();
  let ok = 0;
  let failed = 0;
  for (const child of children) {
    const bible = {
      childName: child.name,
      dateOfBirth: child.dateOfBirth.toISOString(),
      gender: child.gender,
      hairColor: child.hairColor ?? undefined,
      hairStyle: child.hairStyle ?? undefined,
      eyeColor: child.eyeColor ?? undefined,
      skinColor: child.skinColor ?? undefined,
      wearsGlasses: child.wearsGlasses,
      hasFreckles: child.hasFreckles,
      interests: child.interests,
      mainCharacterType: child.mainCharacterType,
      mainCharacterDescription: child.mainCharacterDescription ?? undefined,
      approvedCharacterPrompt: child.approvedCharacterPrompt ?? undefined,
    };
    try {
      const style = buildIllustrationStyle(bible, snippets);
      const sheet = await generateCharacterSheet(child.approvedPreviewUrl!, style);
      if (!sheet) throw new Error("geen beeld terug (safety-filter of fal-fout)");
      const [faceUrl, bodyUrl] = await Promise.all([
        uploadFromUrl(sheet.faceUrl, referenceFaceKey(child.id)),
        uploadFromUrl(sheet.bodyUrl, referenceBodyKey(child.id)),
      ]);
      await prisma.childProfile.update({
        where: { id: child.id },
        data: { referenceSheetUrls: [faceUrl, bodyUrl] },
      });
      ok++;
      console.log(`✓ ${child.id}`);
    } catch (err) {
      failed++;
      console.error(`✗ ${child.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`Klaar: ${ok} gelukt, ${failed} mislukt`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

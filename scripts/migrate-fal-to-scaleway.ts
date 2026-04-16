/**
 * Migration: move existing fal.ai image URLs in the database to our own
 * Scaleway bucket, so illustrations keep working long-term.
 *
 * Run once after setting up Scaleway credentials in .env.local:
 *   npx tsx scripts/migrate-fal-to-scaleway.ts
 *
 * fal.ai URLs expire. Any URL that already returns 404/403 will be set
 * to null so the UI can show a "regenerate" placeholder later.
 */

import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  uploadFromUrl,
  storyPageKey,
  storyEndingKey,
  approvedPreviewKey,
  isOwnStorageUrl,
} from "../src/lib/storage/scaleway";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

function looksLikeFalUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes("fal.media") || url.includes("fal.ai") || url.includes("fal.run");
}

async function migratePage(
  storyId: string,
  pageId: string,
  pageNumber: number,
  url: string,
  isEnding: boolean
): Promise<"migrated" | "dead" | "skipped"> {
  if (!looksLikeFalUrl(url)) return "skipped";
  if (isOwnStorageUrl(url)) return "skipped";

  const key = isEnding ? storyEndingKey(storyId) : storyPageKey(storyId, pageNumber);

  try {
    const newUrl = await uploadFromUrl(url, key);
    await prisma.storyPage.update({
      where: { id: pageId },
      data: { illustrationUrl: newUrl },
    });
    return "migrated";
  } catch (err) {
    console.warn(
      `  ⚠ fal-URL dood voor page ${pageNumber} (story ${storyId}): ${(err as Error).message}`
    );
    await prisma.storyPage.update({
      where: { id: pageId },
      data: { illustrationUrl: null },
    });
    return "dead";
  }
}

async function migrateStoryPages() {
  const stories = await prisma.story.findMany({
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });

  let migrated = 0;
  let dead = 0;
  let skipped = 0;

  for (const story of stories) {
    const totalPages = story.pages.length;
    for (const page of story.pages) {
      if (!page.illustrationUrl) {
        skipped++;
        continue;
      }
      // Treat the last page as the "ending" (our stories route saves it that way)
      const isEnding = page.pageNumber === totalPages;
      const result = await migratePage(
        story.id,
        page.id,
        page.pageNumber,
        page.illustrationUrl,
        isEnding
      );
      if (result === "migrated") {
        migrated++;
        console.log(`  ✓ story ${story.id} page ${page.pageNumber} → Scaleway`);
      } else if (result === "dead") {
        dead++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`\nStory pages: ${migrated} gemigreerd, ${dead} dood, ${skipped} overgeslagen`);
}

async function migrateApprovedPreviews() {
  const children = await prisma.childProfile.findMany({
    where: { approvedPreviewUrl: { not: null } },
  });

  let migrated = 0;
  let dead = 0;
  let skipped = 0;

  for (const child of children) {
    const url = child.approvedPreviewUrl;
    if (!url || !looksLikeFalUrl(url) || isOwnStorageUrl(url)) {
      skipped++;
      continue;
    }
    try {
      const newUrl = await uploadFromUrl(url, approvedPreviewKey(child.id));
      await prisma.childProfile.update({
        where: { id: child.id },
        data: { approvedPreviewUrl: newUrl },
      });
      console.log(`  ✓ approved preview ${child.name} (${child.id}) → Scaleway`);
      migrated++;
    } catch (err) {
      console.warn(`  ⚠ preview dood voor ${child.name}: ${(err as Error).message}`);
      await prisma.childProfile.update({
        where: { id: child.id },
        data: { approvedPreviewUrl: null },
      });
      dead++;
    }
  }

  console.log(`\nApproved previews: ${migrated} gemigreerd, ${dead} dood, ${skipped} overgeslagen`);
}

async function main() {
  console.log("🚀 Migratie fal.ai → Scaleway gestart\n");

  console.log("--- Verhaal-illustraties ---");
  await migrateStoryPages();

  console.log("\n--- Goedgekeurde kind-previews ---");
  await migrateApprovedPreviews();

  console.log("\n✅ Klaar.");
}

main()
  .catch((err) => {
    console.error("Migratie mislukt:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

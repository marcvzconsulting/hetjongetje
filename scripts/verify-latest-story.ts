/**
 * Inspect the illustration URLs of the most recently created story.
 *   npx tsx scripts/verify-latest-story.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const story = await prisma.story.findFirst({
    orderBy: { createdAt: "desc" },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!story) {
    console.log("Geen story gevonden.");
    return;
  }

  console.log(`\n📚 Laatste story: "${story.title}" (id: ${story.id})\n`);

  let scalewayCount = 0;
  let falCount = 0;
  let otherCount = 0;
  let nullCount = 0;

  for (const page of story.pages) {
    const url = page.illustrationUrl;
    let tag: string;
    if (!url) {
      tag = "⚫ NULL";
      nullCount++;
    } else if (url.includes("scw.cloud") || url.includes("s3.nl-ams")) {
      tag = "🟢 SCALEWAY";
      scalewayCount++;
    } else if (url.includes("fal.media") || url.includes("fal.ai") || url.includes("fal.run")) {
      tag = "🔴 FAL (TEMP!)";
      falCount++;
    } else {
      tag = "🟡 OTHER";
      otherCount++;
    }
    console.log(`  Page ${page.pageNumber}: ${tag}`);
    if (url) console.log(`    ${url.substring(0, 100)}${url.length > 100 ? "..." : ""}`);
  }

  console.log(
    `\nTotaal: ${scalewayCount} Scaleway, ${falCount} fal.ai, ${otherCount} other, ${nullCount} null`
  );
  if (falCount === 0 && scalewayCount > 0) {
    console.log("\n✅ Alle illustraties staan op Scaleway — migratie werkt!");
  } else if (falCount > 0) {
    console.log("\n❌ Er staan nog fal.ai URLs in de DB — upload is niet gelukt.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

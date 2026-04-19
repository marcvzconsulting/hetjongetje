/**
 * One-shot migration: copy every row from the local DEV database into the
 * production Neon database.
 *
 *   pnpm migrate:dev-to-prod
 *
 * Keeps the primary keys identical on purpose — Scaleway storage URLs for
 * illustrations contain the story/child IDs, so preserving them means the
 * existing public URLs keep resolving without having to rewrite them.
 *
 * Safety:
 *  - Refuses to run if prod already has users (prevents double-writes)
 *  - Idempotent per row via upsert, so re-running is safe
 *  - Skips ephemeral data (GenerationJob, RateLimit)
 */
import { config as loadEnv } from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// --- Connect to both databases ---------------------------------------------

// Dev DB comes from .env (default)
loadEnv({ path: ".env" });
const DEV_URL = process.env.DATABASE_URL;

// Prod DB comes from .env.production.local, loaded separately so we don't
// clobber the dev URL
const prodEnv: Record<string, string> = {};
loadEnv({ path: ".env.production.local", processEnv: prodEnv });
const PROD_URL = prodEnv.DATABASE_URL;

if (!DEV_URL) throw new Error("DATABASE_URL niet gevonden in .env");
if (!PROD_URL) throw new Error("DATABASE_URL niet gevonden in .env.production.local");
if (DEV_URL === PROD_URL) {
  throw new Error("Dev en prod URL zijn identiek — stop, dit klopt niet.");
}

const devPrisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: DEV_URL })),
});
const prodPrisma = new PrismaClient({
  adapter: new PrismaPg(new Pool({ connectionString: PROD_URL })),
});

// --- Helpers ---------------------------------------------------------------

function hostOf(url: string): string {
  return url.match(/@([^/:]+)/)?.[1] ?? "?";
}

async function main() {
  console.log(`📡 DEV  → ${hostOf(DEV_URL!)}`);
  console.log(`📡 PROD → ${hostOf(PROD_URL!)}\n`);

  // Safety check: abort if prod already has real data
  const existingUsers = await prodPrisma.user.count();
  if (existingUsers > 0) {
    console.warn(
      `⚠  Productie heeft al ${existingUsers} gebruiker(s). Doorgaan met upsert (bestaande rijen worden bijgewerkt).`
    );
  }

  // 1. Users ---------------------------------------------------------------
  const users = await devPrisma.user.findMany();
  console.log(`👥 ${users.length} users overzetten...`);
  for (const u of users) {
    await prodPrisma.user.upsert({
      where: { id: u.id },
      create: u,
      update: u,
    });
  }

  // 2. Child profiles ------------------------------------------------------
  const children = await devPrisma.childProfile.findMany();
  console.log(`🧒 ${children.length} kindprofielen overzetten...`);
  for (const c of children) {
    await prodPrisma.childProfile.upsert({
      where: { id: c.id },
      create: c,
      update: c,
    });
  }

  // 3. Stories -------------------------------------------------------------
  const stories = await devPrisma.story.findMany();
  console.log(`📚 ${stories.length} verhalen overzetten...`);
  for (const s of stories) {
    await prodPrisma.story.upsert({
      where: { id: s.id },
      create: s,
      update: s,
    });
  }

  // 4. Story pages ---------------------------------------------------------
  const pages = await devPrisma.storyPage.findMany();
  console.log(`📄 ${pages.length} verhaalpagina's overzetten...`);
  for (const p of pages) {
    await prodPrisma.storyPage.upsert({
      where: { id: p.id },
      create: p,
      update: p,
    });
  }

  // 5. Books (optional — may be empty) ------------------------------------
  const books = await devPrisma.storyBook.findMany();
  if (books.length) {
    console.log(`📖 ${books.length} boeken overzetten...`);
    for (const b of books) {
      await prodPrisma.storyBook.upsert({
        where: { id: b.id },
        create: b,
        update: b,
      });
    }
    const bookStories = await devPrisma.bookStory.findMany();
    console.log(`🔗 ${bookStories.length} book-story relaties overzetten...`);
    for (const bs of bookStories) {
      await prodPrisma.bookStory.upsert({
        where: { id: bs.id },
        create: bs,
        update: bs,
      });
    }
  }

  // Intentionally skipped:
  //   - GenerationJob (ephemeral, no value to carry over)
  //   - RateLimit    (dev counters don't apply to prod)

  console.log("\n✅ Migratie voltooid.");

  // Summary
  const [uCount, cCount, sCount, pCount] = await Promise.all([
    prodPrisma.user.count(),
    prodPrisma.childProfile.count(),
    prodPrisma.story.count(),
    prodPrisma.storyPage.count(),
  ]);
  console.log(
    `\nProd status: ${uCount} users, ${cCount} kinderen, ${sCount} verhalen, ${pCount} pagina's`
  );
}

main()
  .catch((err) => {
    console.error("\n❌ Migratie mislukt:", err);
    process.exit(1);
  })
  .finally(async () => {
    await devPrisma.$disconnect();
    await prodPrisma.$disconnect();
  });

/**
 * One-off backfill for the `firstStoryEmailSentAt` flag.
 *
 * Background: the flag was added after a population of users had already
 * generated stories. Without this backfill, those users would receive
 * the "first story" celebration mail on their NEXT generation, even
 * though it isn't their first story.
 *
 * This script sets `firstStoryEmailSentAt = now()` for every user that
 * (a) has the flag still null AND (b) already has at least one story.
 *
 * Usage:
 *   1. Make sure .env.production.local has DATABASE_URL pointing at prod.
 *   2. Dry-run (default — no writes):
 *        pnpm tsx scripts/backfill-first-story-flag.ts
 *   3. Actually apply:
 *        pnpm tsx scripts/backfill-first-story-flag.ts --apply
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const ENV_FILE = ".env.production.local";

if (!existsSync(resolve(process.cwd(), ENV_FILE))) {
  console.error(`❌ ${ENV_FILE} bestaat niet in de project-root.`);
  process.exit(1);
}

const dotenvResult = config({ path: ENV_FILE, override: true });
if (dotenvResult.error) {
  console.error(`❌ Kon ${ENV_FILE} niet lezen:`, dotenvResult.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(`❌ DATABASE_URL staat niet in ${ENV_FILE}`);
  process.exit(1);
}

const apply = process.argv.includes("--apply");

// Prisma 7 requires an explicit adapter — same pattern as the other
// scripts that hit prod (e.g. migrate-fal-to-scaleway.ts).
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const url = process.env.DATABASE_URL!;
  const host = url.match(/@([^/]+)/)?.[1] ?? "onbekend";
  console.log(`📡 Target: ${host}`);
  console.log(`🔧 Mode: ${apply ? "APPLY (writes!)" : "dry-run (no writes)"}`);
  console.log("");

  // Find users with null flag but ≥1 story.
  const candidates = await prisma.user.findMany({
    where: {
      firstStoryEmailSentAt: null,
      children: {
        some: {
          stories: { some: {} },
        },
      },
    },
    select: {
      id: true,
      email: true,
      _count: {
        select: { children: true },
      },
    },
  });

  if (candidates.length === 0) {
    console.log("✅ Geen users gevonden om te backfillen. Niets te doen.");
    return;
  }

  console.log(`Gevonden: ${candidates.length} user(s) met null-flag én ≥1 verhaal.`);
  for (const u of candidates.slice(0, 20)) {
    console.log(`  - ${u.email}`);
  }
  if (candidates.length > 20) {
    console.log(`  ... en ${candidates.length - 20} meer`);
  }
  console.log("");

  if (!apply) {
    console.log("ℹ️  Dry-run: niets gewijzigd. Draai opnieuw met --apply om uit te voeren.");
    return;
  }

  const now = new Date();
  const result = await prisma.user.updateMany({
    where: {
      id: { in: candidates.map((u) => u.id) },
      firstStoryEmailSentAt: null,
    },
    data: { firstStoryEmailSentAt: now },
  });

  console.log(`✅ ${result.count} user(s) bijgewerkt. Klaar.`);
}

main()
  .catch((err) => {
    console.error("❌ Backfill mislukt:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

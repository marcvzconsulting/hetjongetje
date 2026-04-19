/**
 * Mark every existing user as `approved` and grant a generous credit pool.
 * New users registered AFTER this migration will default to `pending` with
 * zero credits and need admin approval.
 *
 *   npx tsx scripts/backfill-user-approval.ts          # dev
 *   npx tsx scripts/backfill-user-approval.ts --prod   # production
 */
import path from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const DEFAULT_CREDITS = 999;

const useProd = process.argv.includes("--prod");
config({
  path: useProd
    ? path.resolve(process.cwd(), ".env.production.local")
    : path.resolve(process.cwd(), ".env"),
  override: true,
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const host = process.env.DATABASE_URL?.match(/@([^/:]+)/)?.[1];
  console.log(`📡 Doel-DB: ${host} (${useProd ? "PRODUCTIE" : "dev"})\n`);

  const pending = await prisma.user.findMany({
    where: { status: "pending" },
    select: { id: true, email: true, role: true },
  });

  if (pending.length === 0) {
    console.log("Geen pending users om te backfillen.");
    return;
  }

  console.log(`Gevonden ${pending.length} pending users:`);
  for (const u of pending) {
    console.log(`  • ${u.email} (${u.role})`);
  }

  const result = await prisma.user.updateMany({
    where: { status: "pending" },
    data: { status: "approved", storyCredits: DEFAULT_CREDITS },
  });

  console.log(
    `\n✅ ${result.count} users op 'approved' gezet met ${DEFAULT_CREDITS} credits.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

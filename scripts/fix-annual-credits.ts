/**
 * One-shot — set the annual subscription plan's creditsPerInterval to
 * 96 if it's currently null (legacy rows from the original seed).
 *
 *   pnpm tsx scripts/fix-annual-credits.ts        # local
 *   pnpm tsx scripts/fix-annual-credits.ts --prod
 */
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const useProd = process.argv.includes("--prod");

if (useProd) {
  const ENV_FILE = ".env.production.local";
  if (!existsSync(resolve(process.cwd(), ENV_FILE))) {
    console.error(`❌ ${ENV_FILE} bestaat niet.`);
    process.exit(1);
  }
  config({ path: ENV_FILE, override: true });
} else {
  config({ path: ".env" });
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const url = process.env.DATABASE_URL!;
  const host = url.match(/@([^/]+)/)?.[1] ?? "?";
  console.log(`📡 Target: ${host}\n`);

  const annual = await prisma.subscriptionPlan.findUnique({
    where: { code: "annual" },
  });
  if (!annual) {
    console.log("ℹ️  Geen annual plan gevonden — overslaan.");
    return;
  }
  if (annual.creditsPerInterval !== null) {
    console.log(
      `ℹ️  Annual heeft al ${annual.creditsPerInterval} credits/period — niets te doen.`,
    );
    return;
  }
  await prisma.subscriptionPlan.update({
    where: { code: "annual" },
    data: { creditsPerInterval: 96 },
  });
  console.log("✓ Annual subscription plan: creditsPerInterval gezet op 96.");
}

main()
  .catch((err) => {
    console.error("❌ Fout:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

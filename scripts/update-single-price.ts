/**
 * One-shot — bump the single-credit pack price from €1,50 to €1,95.
 *
 * Mollie's per-transaction fee (€0,29 for iDEAL) ate ~19% of the old
 * €1,50 price. Raising single to €1,95 keeps healthy margin and makes
 * the bundle of 10 (€12) clearly the smarter choice.
 *
 *   pnpm tsx scripts/update-single-price.ts          # local
 *   pnpm tsx scripts/update-single-price.ts --prod
 *
 * Idempotent: only updates if current price is the legacy 150.
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

  const single = await prisma.creditPack.findUnique({
    where: { code: "single" },
  });
  if (!single) {
    console.log("ℹ️  Geen single-pack gevonden — overslaan.");
    return;
  }
  if (single.priceCents === 195) {
    console.log("ℹ️  Single-pack staat al op €1,95 — niets te doen.");
    return;
  }
  if (single.priceCents !== 150) {
    console.log(
      `⚠️  Single-pack staat op €${(single.priceCents / 100).toFixed(2)} — niet €1,50. Niet automatisch overschrijven; pas handmatig aan via /admin/pricing.`,
    );
    return;
  }
  await prisma.creditPack.update({
    where: { code: "single" },
    data: { priceCents: 195 },
  });
  console.log("✓ Single-credit pack: prijs bijgewerkt van €1,50 → €1,95.");
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

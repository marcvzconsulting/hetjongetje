/**
 * Idempotent seed for the credit-pack and subscription-plan catalogs.
 *
 * Safe to run any number of times — uses `code` as a stable upsert key.
 * Existing rows are NOT overwritten; once admin starts editing prices in
 * the dashboard, this script leaves their changes alone. New packs that
 * don't exist yet get created with the defaults below.
 *
 * Usage:
 *   pnpm tsx scripts/seed-pricing.ts            # local dev DB
 *   pnpm tsx scripts/seed-pricing.ts --prod     # via .env.production.local
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
    console.error(`❌ ${ENV_FILE} bestaat niet in de project-root.`);
    process.exit(1);
  }
  config({ path: ENV_FILE, override: true });
} else {
  config({ path: ".env" });
}

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL niet gezet.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const CREDIT_PACKS = [
  {
    code: "single",
    name: "1 verhaal",
    description: "Eenmalig één extra verhaal.",
    creditAmount: 1,
    priceCents: 150,
    sortOrder: 10,
    badge: null,
  },
  {
    code: "five",
    name: "5 verhalen",
    description: "10% korting, voor een week of twee.",
    creditAmount: 5,
    priceCents: 675,
    sortOrder: 20,
    badge: null,
  },
  {
    code: "ten",
    name: "10 verhalen",
    description: "20% korting, een hele maand vooruit.",
    creditAmount: 10,
    priceCents: 1200,
    sortOrder: 30,
    badge: "populairst",
  },
  {
    code: "twentyfive",
    name: "25 verhalen",
    description: "Beste prijs per verhaal — de hele zomer rond.",
    creditAmount: 25,
    priceCents: 2750,
    sortOrder: 40,
    badge: "beste deal",
  },
];

const SUBSCRIPTION_PLANS = [
  {
    code: "monthly",
    name: "Per maand",
    description: "8 verhalen per maand, opzegbaar per maand.",
    priceCents: 795,
    interval: "1 month",
    creditsPerInterval: 8,
    sortOrder: 10,
    badge: null,
    features: [
      "8 verhalen per maand",
      "Verhalen blijven bewaard",
      "Meerdere kinderen",
      "Opzeggen kan altijd",
    ],
  },
  {
    code: "annual",
    name: "Per jaar",
    description: "Genoeg verhalen voor het hele jaar, plus €10 korting op het boekje.",
    priceCents: 7900,
    interval: "12 months",
    // 96 = 12 × 8 (same per-month rate as the monthly plan). Tunable
    // in /admin/pricing if the business case shifts.
    creditsPerInterval: 96,
    sortOrder: 20,
    badge: "meest gekozen",
    features: [
      "96 verhalen per jaar",
      "Verhalen blijven bewaard",
      "Meerdere kinderen",
      "€10 korting op het boekje",
    ],
  },
];

async function main() {
  const url = process.env.DATABASE_URL!;
  const host = url.match(/@([^/]+)/)?.[1] ?? "?";
  console.log(`📡 Target: ${host}`);
  console.log(`🌱 Seeding pricing catalog…\n`);

  let created = 0;
  let skipped = 0;

  for (const pack of CREDIT_PACKS) {
    const existing = await prisma.creditPack.findUnique({
      where: { code: pack.code },
    });
    if (existing) {
      console.log(`  · ${pack.code} (CreditPack) — already exists, leaving as-is`);
      skipped++;
    } else {
      await prisma.creditPack.create({ data: pack });
      console.log(`  ✓ ${pack.code} (CreditPack) — created`);
      created++;
    }
  }

  for (const plan of SUBSCRIPTION_PLANS) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { code: plan.code },
    });
    if (existing) {
      console.log(`  · ${plan.code} (SubscriptionPlan) — already exists, leaving as-is`);
      skipped++;
    } else {
      await prisma.subscriptionPlan.create({ data: plan });
      console.log(`  ✓ ${plan.code} (SubscriptionPlan) — created`);
      created++;
    }
  }

  console.log(`\n✅ Done — ${created} created, ${skipped} skipped.`);
}

main()
  .catch((err) => {
    console.error("❌ Seed mislukt:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

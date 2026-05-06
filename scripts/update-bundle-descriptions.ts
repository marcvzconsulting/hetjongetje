/**
 * One-shot — strip the legacy "X% korting" copy out of bundle pack
 * descriptions. The discount-percent badge on /credits is now computed
 * at render time relative to the single-pack price, so the hard-coded
 * "10% korting" / "20% korting" lines became misleading once the
 * single price moved to €1,95.
 *
 *   pnpm tsx scripts/update-bundle-descriptions.ts
 *   pnpm tsx scripts/update-bundle-descriptions.ts --prod
 *
 * Idempotent + conservative: only updates rows whose description still
 * matches the legacy copy verbatim. Anything that admin already edited
 * via /admin/pricing is left untouched.
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

const MIGRATIONS: Array<{ code: string; from: string; to: string }> = [
  {
    code: "five",
    from: "10% korting, voor een week of twee.",
    to: "Voor een week of twee vooruit.",
  },
  {
    code: "ten",
    from: "20% korting, een hele maand vooruit.",
    to: "Genoeg voor een hele maand.",
  },
  {
    code: "twentyfive",
    from: "Beste prijs per verhaal — de hele zomer rond.",
    to: "Voor de hele zomer of langer.",
  },
];

async function main() {
  const url = process.env.DATABASE_URL!;
  const host = url.match(/@([^/]+)/)?.[1] ?? "?";
  console.log(`📡 Target: ${host}\n`);

  let updated = 0;
  let skipped = 0;
  for (const m of MIGRATIONS) {
    const row = await prisma.creditPack.findUnique({ where: { code: m.code } });
    if (!row) {
      console.log(`  · ${m.code} — niet gevonden, overslaan`);
      skipped++;
      continue;
    }
    if (row.description !== m.from) {
      console.log(
        `  · ${m.code} — al aangepast door admin ("${row.description}"), overslaan`,
      );
      skipped++;
      continue;
    }
    await prisma.creditPack.update({
      where: { code: m.code },
      data: { description: m.to },
    });
    console.log(`  ✓ ${m.code} — bijgewerkt`);
    updated++;
  }

  console.log(`\n✅ ${updated} bijgewerkt, ${skipped} overgeslagen.`);
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

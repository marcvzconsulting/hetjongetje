/**
 * One-shot diagnostic — list every admin account in the target database
 * with email, status and last login. Useful when someone can't log in and
 * we need to confirm which email is actually the admin record.
 *
 *   pnpm tsx scripts/list-admins.ts          # local
 *   pnpm tsx scripts/list-admins.ts --prod   # via .env.production.local
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

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL niet gezet.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const url = process.env.DATABASE_URL!;
  const host = url.match(/@([^/]+)/)?.[1] ?? "?";
  console.log(`📡 Target: ${host}\n`);

  const admins = await prisma.user.findMany({
    where: { role: "admin" },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (admins.length === 0) {
    console.log("⚠️  Geen admin accounts gevonden!");
    return;
  }

  console.log(`Gevonden: ${admins.length} admin(s).\n`);
  for (const a of admins) {
    console.log(`  email:       ${a.email}`);
    console.log(`  name:        ${a.name}`);
    console.log(`  status:      ${a.status}`);
    console.log(`  lastLogin:   ${a.lastLoginAt?.toISOString() ?? "—"}`);
    console.log(`  createdAt:   ${a.createdAt.toISOString()}`);
    console.log("  ────────────────────────────────");
  }
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

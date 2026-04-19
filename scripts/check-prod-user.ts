/**
 * Inspect whether a user account exists in the PRODUCTION database.
 *   npx tsx scripts/check-prod-user.ts <email>
 *
 * Reads DATABASE_URL from .env.production.local.
 */
import { config } from "dotenv";
config({ path: ".env.production.local", override: true });

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const rawEmail = process.argv[2];
  if (!rawEmail) {
    console.error("Gebruik: npx tsx scripts/check-prod-user.ts <email>");
    process.exit(1);
  }

  const email = rawEmail.trim().toLowerCase();

  console.log(`🔍 Zoeken naar '${email}' in productie-DB...\n`);

  // Also show all users so we can spot typos / casing issues
  const all = await prisma.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  console.log(`Totaal gebruikers in productie: ${all.length}\n`);
  for (const u of all) {
    const match = u.email.toLowerCase() === email ? " ← MATCH" : "";
    console.log(
      `  • ${u.email}  (${u.name})  created ${u.createdAt.toISOString()}${match}`
    );
  }

  const exact = await prisma.user.findUnique({ where: { email } });
  const ci = all.find((u) => u.email.toLowerCase() === email);

  if (exact) {
    console.log(`\n✅ Account '${email}' bestaat exact.`);
  } else if (ci) {
    console.log(
      `\n⚠  Account bestaat wel, maar met andere casing: '${ci.email}'`
    );
  } else {
    console.log(`\n❌ Geen account gevonden voor '${email}'.`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

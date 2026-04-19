/**
 * Create or promote the admin account.
 *   npx tsx scripts/create-admin.ts <password> [--prod]
 *
 * Without --prod it uses DATABASE_URL from .env (dev). With --prod it loads
 * .env.production.local. The email is fixed to admin@onsverhaaltje.nl.
 */
import path from "node:path";
import { config } from "dotenv";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const ADMIN_EMAIL = "admin@onsverhaaltje.nl";
const ADMIN_NAME = "Admin";

const args = process.argv.slice(2);
const useProd = args.includes("--prod");
const password = args.find((a) => !a.startsWith("--"));

if (!password) {
  console.error(
    "Gebruik: npx tsx scripts/create-admin.ts <password> [--prod]"
  );
  process.exit(1);
}

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
  console.log(
    `📡 Doel-DB: ${host} (${useProd ? "PRODUCTIE" : "dev"})\n`
  );

  const passwordHash = await bcrypt.hash(password!, 10);

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { role: "admin", passwordHash },
    });
    console.log(`✅ Bestaand account gepromoveerd tot admin: ${ADMIN_EMAIL}`);
  } else {
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        role: "admin",
      },
    });
    console.log(`✅ Admin account aangemaakt: ${ADMIN_EMAIL}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

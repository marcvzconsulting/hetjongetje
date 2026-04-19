/**
 * List all users in the DEV database (loads DATABASE_URL from .env).
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const host = process.env.DATABASE_URL?.match(/@([^/:]+)/)?.[1];
  console.log(`📡 DB host: ${host}\n`);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: { select: { children: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`👥 ${users.length} users in dev:\n`);
  for (const u of users) {
    console.log(
      `  • ${u.email}  (${u.name})  — ${u._count.children} kindprofielen  — ${u.createdAt.toISOString()}`
    );
  }

  const stories = await prisma.story.count();
  const pages = await prisma.storyPage.count();
  const children = await prisma.childProfile.count();
  console.log(`\n📚 ${stories} verhalen, ${pages} pagina's, ${children} kindprofielen`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

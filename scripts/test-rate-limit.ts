/**
 * Test the rate limiting logic by spamming the same key.
 *   npx tsx scripts/test-rate-limit.ts
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { rateLimit } from "../src/lib/rate-limit/rate-limit";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TEST_KEY = `_test:rate-limit:${Date.now()}`;
const LIMIT = 5;
const WINDOW = 3600; // 1 hour

async function main() {
  console.log(`🧪 Rate limit test (limit=${LIMIT}/${WINDOW}s)\n`);

  for (let i = 1; i <= LIMIT + 3; i++) {
    const result = await rateLimit({
      key: TEST_KEY,
      limit: LIMIT,
      windowSeconds: WINDOW,
    });
    const icon = result.allowed ? "✅" : "🚫";
    console.log(
      `${icon} Request ${i}: allowed=${result.allowed}, remaining=${result.remaining}, retryAfter=${result.retryAfterSeconds}s`
    );
  }

  // Cleanup
  await prisma.rateLimit.delete({ where: { key: TEST_KEY } });
  console.log("\n🧹 Test-key opgeruimd");

  console.log(
    `\nVerwacht: eerste ${LIMIT} requests allowed=true, laatste 3 allowed=false`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

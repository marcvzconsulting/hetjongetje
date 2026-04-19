/**
 * Push the Prisma schema to the production database.
 *
 * Reads DATABASE_URL from .env.production.local (NOT from .env) so your
 * production credentials stay separated from your local dev setup.
 *
 * Usage:
 *   1. Create .env.production.local with a single line:
 *        DATABASE_URL="postgresql://..."
 *   2. Run: pnpm db:push:prod
 */
import { config } from "dotenv";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const ENV_FILE = ".env.production.local";

if (!existsSync(resolve(process.cwd(), ENV_FILE))) {
  console.error(`❌ ${ENV_FILE} bestaat niet in de project-root.`);
  console.error(`\nMaak het aan met één regel:`);
  console.error(`  DATABASE_URL="postgresql://<neon-connection-string>"`);
  process.exit(1);
}

const result = config({ path: ENV_FILE, override: true });
if (result.error) {
  console.error(`❌ Kon ${ENV_FILE} niet lezen:`, result.error);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error(`❌ DATABASE_URL staat niet in ${ENV_FILE}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const host = url.match(/@([^/]+)/)?.[1] ?? "onbekend";

console.log(`📡 Target: ${host}`);
console.log(`📤 Schema pushen naar productie...\n`);

try {
  execSync("prisma db push --config prisma/prisma.config.ts", {
    stdio: "inherit",
    env: { ...process.env },
  });
  console.log("\n✅ Schema gepusht naar productie.");
} catch {
  console.error("\n❌ Push mislukt.");
  process.exit(1);
}

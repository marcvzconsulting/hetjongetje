import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * pg 8 behandelt sslmode=require/prefer/verify-ca al als verify-full, maar
 * waarschuwt bij elke start dat pg 9 de zwakkere libpq-betekenis krijgt
 * (versleuteld, maar zonder certificaatcontrole). Wij willen verify-full,
 * ongeacht wat er in de env van Vercel staat. Lokaal (zonder sslmode) en
 * sslmode=disable blijven ongemoeid.
 */
export function withVerifyFullSsl(url: string | undefined): string | undefined {
  return url?.replace(
    /([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/,
    "$1verify-full",
  );
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: withVerifyFullSsl(process.env.DATABASE_URL),
    // Each warm serverless instance keeps its own pool. Cap it low so a
    // burst of concurrent instances can't collectively exhaust Neon's
    // connection limit. Use the Neon "-pooler" (PgBouncer) endpoint in
    // DATABASE_URL for the real headroom — verify that in Vercel env.
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

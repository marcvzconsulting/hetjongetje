import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const pages = await prisma.storyPage.findMany({
    select: { illustrationUrl: true },
  });
  const profiles = await prisma.childProfile.findMany({
    select: { approvedPreviewUrl: true },
  });

  const classify = (url: string | null) => {
    if (!url) return "null";
    if (url.includes("scw.cloud")) return "scaleway";
    if (url.includes("fal.media") || url.includes("fal.ai")) return "fal";
    return "other";
  };

  const pageCounts = { scaleway: 0, fal: 0, other: 0, null: 0 };
  for (const p of pages) pageCounts[classify(p.illustrationUrl)]++;

  const previewCounts = { scaleway: 0, fal: 0, other: 0, null: 0 };
  for (const p of profiles) previewCounts[classify(p.approvedPreviewUrl)]++;

  console.log("Story pages:", pageCounts);
  console.log("Approved previews:", previewCounts);
}

main().finally(() => prisma.$disconnect());

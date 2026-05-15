import { prisma } from "@/lib/db";

/**
 * FAQ-content komt uit de DB en wordt beheerd via /admin/faq. Initiële
 * seed-content + cleanup staan in scripts/reseed-faq.ts (eenmalig
 * draaien met `npx tsx scripts/reseed-faq.ts`).
 */
export async function loadPublishedFaq() {
  return prisma.faqEntry.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

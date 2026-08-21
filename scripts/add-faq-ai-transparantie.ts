/**
 * Voeg het FAQ-item over AI-transparantie toe (AI Act art. 50 — zie
 * docs/ai-act-transparantie.md). Idempotent: bestaat er al een vraag
 * over AI-gemaakt-zijn, dan doet het script niets. Bestaande entries
 * (mogelijk via /admin/faq bewerkt) blijven onaangeraakt; het item komt
 * achteraan en is via /admin/faq te herordenen.
 *
 * Usage:
 *   npx tsx scripts/add-faq-ai-transparantie.ts          # dev DB
 *   npx tsx scripts/add-faq-ai-transparantie.ts --prod   # .env.production.local
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
    console.error(`❌ ${ENV_FILE} bestaat niet in de project-root.`);
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

const QUESTION = "Worden de verhalen echt met AI gemaakt?";
const ANSWER =
  "Ja. De verhalen worden geschreven door een AI-taalmodel, de illustraties " +
  "worden gemaakt door een AI-beeldmodel en de voorleesstemmen zijn AI-stemmen. " +
  "Jij bepaalt de ingrediënten — het profiel van je kind en de aanleiding — en " +
  "leest het resultaat altijd eerst zelf. Zoals de Europese AI-verordening " +
  "vraagt, vermelden we bij elk verhaal zichtbaar dat het met AI gemaakt is, en " +
  "krijgen illustraties, voorleesaudio en PDF-downloads een machineleesbaar " +
  "metadata-merkje met die herkomst. Dat merkje verandert niets aan hoe het " +
  "verhaal eruitziet of klinkt. En zoals hierboven staat: jouw gegevens worden " +
  "niet gebruikt om AI-modellen te trainen.";

async function main() {
  const existing = await prisma.faqEntry.findFirst({
    where: { question: { contains: "met AI gemaakt", mode: "insensitive" } },
    select: { id: true, question: true },
  });
  if (existing) {
    console.log(`Bestaat al (niets gedaan): "${existing.question}"`);
    return;
  }

  const maxSort = await prisma.faqEntry.aggregate({ _max: { sortOrder: true } });
  const entry = await prisma.faqEntry.create({
    data: {
      question: QUESTION,
      answer: ANSWER,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
      isPublished: true,
    },
  });
  console.log(
    `Toegevoegd (${useProd ? "PROD" : "dev"}): "${entry.question}" (sortOrder ${entry.sortOrder})`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

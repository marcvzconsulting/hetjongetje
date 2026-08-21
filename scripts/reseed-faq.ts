/**
 * Volledige reseed van de FAQ (/veelgestelde-vragen). Wist ALLE entries
 * en zet de onderstaande lijst terug — dit bestand is de bron van
 * waarheid; wijzigingen die via /admin/faq zijn gedaan gaan bij een
 * reseed dus verloren.
 *
 * Teksten geactualiseerd 21 aug 2026 (o.a. verhalen direct in het
 * Nederlands, vier leeftijdsniveaus, credit-model, voorlezen,
 * AI-transparantie).
 *
 * Usage:
 *   npx tsx scripts/reseed-faq.ts          # lokale dev-DB (.env)
 *   npx tsx scripts/reseed-faq.ts --prod   # productie (.env.production.local)
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

const ENTRIES: { question: string; answer: string }[] = [
  {
    question: "Vanaf welke leeftijd is Ons Verhaaltje geschikt?",
    answer:
      "Eigenlijk vanaf de wieg. De verhalen kennen vier taalniveaus — 0–2, 3–4, 5–7 en 8 jaar en ouder — zodat de zinslengte, woordkeus en spanningsboog meegroeien met je kind. Voor de allerkleinsten zijn de verhaaltjes heel kort en ritmisch; voor oudere kinderen langer en avontuurlijker. Je kunt per verhaal ook kiezen tussen een korte en een lange versie. De leeftijd volgt automatisch uit het profiel van je kind.",
  },
  {
    question: "Hoe persoonlijk worden de verhalen?",
    answer:
      "Behoorlijk persoonlijk. We gebruiken de naam, hoe je kind eruitziet, de favoriete knuffel, een lievelingsdier, namen van broertjes en zusjes (of beste vriend/vriendin) en de plek waar het kind woont. Per verhaal kies je daarnaast de setting (bijvoorbeeld fantasiebos, ruimte of onderwaterwereld) en vertel je kort wat er die dag speelde — een verjaardag, de eerste schooldag, logeren bij oma. Je kind speelt de hoofdrol in de illustraties, en op een goed verhaal kun je later een vervolgverhaal laten maken.",
  },
  {
    question: "Worden de verhalen echt met AI gemaakt?",
    answer:
      "Ja. De verhalen worden geschreven door een AI-taalmodel, de illustraties worden gemaakt door een AI-beeldmodel en de voorleesstemmen zijn AI-stemmen. Jij bepaalt de ingrediënten — het profiel van je kind en de aanleiding — en leest het resultaat altijd eerst zelf. Zoals de Europese AI-verordening vraagt, vermelden we bij elk verhaal zichtbaar dat het met AI gemaakt is, en krijgen illustraties, voorleesaudio en PDF-downloads een machineleesbaar metadata-merkje met die herkomst. Dat merkje verandert niets aan hoe het verhaal eruitziet of klinkt. En: jouw gegevens worden niet gebruikt om AI-modellen te trainen.",
  },
  {
    question: "Wat gebeurt er met de gegevens van mijn kind?",
    answer:
      "Profielgegevens staan alleen in jouw account en zijn niet zichtbaar voor andere klanten. We delen niets met derden voor reclame-doeleinden. Onze AI-leveranciers (zoals Anthropic voor de tekst) krijgen tijdelijk alleen te zien wat nodig is om jouw verhaal te maken — die gegevens worden niet gebruikt om hun modellen te trainen. Alles staat op Europese servers. Verwijder je je account, dan worden na een bedenktijd van 30 dagen alle profielen, verhalen, illustraties en audio definitief gewist. De details staan op onze privacy-pagina.",
  },
  {
    question: "Hoe vaak kan ik een nieuw verhaal maken?",
    answer:
      "We werken met tegoed: één verhaal kost één credit, en credits verlopen nooit. Bij het aanmelden krijg je er 5 cadeau om het rustig te proberen. Daarna kies je wat bij je past: losse pakketjes credits, of een abonnement dat elke maand automatisch nieuwe credits klaarzet. De actuele pakketten en prijzen staan op de prijspagina.",
  },
  {
    question: "Kan de app het verhaal ook voorlezen?",
    answer:
      "Ja! Bij elk verhaal kun je een voorleesstem kiezen — rustige Nederlandse en Vlaamse AI-stemmen. Het verhaal wordt per bladzijde voorgelezen, en de woorden lichten op terwijl ze klinken, zodat meelezen vanzelf gaat. Ook opa's en oma's die een gedeeld verhaal openen kunnen de voorleesstem afspelen.",
  },
  {
    question: "Hoe zeg ik mijn abonnement op?",
    answer:
      "In je account onder 'Abonnement' staat een 'Opzeggen'-knop — dat kan elk moment, tot een dag voor de volgende incasso. Je houdt toegang tot het einde van de periode die je al hebt betaald, en al je verhalen én overgebleven credits blijven gewoon van jou. Het opzegproces vraagt kort waarom; dat helpt ons de dienst beter te maken, maar is optioneel.",
  },
  {
    question: "Kan ik de verhalen ook als gedrukt boek bestellen?",
    answer:
      "Daar werken we aan. Je kunt elk verhaal nu al als mooie PDF downloaden en zelf printen. Binnenkort koppelen we een drukker, zodat je je mooiste verhalen kunt bundelen tot een echt boek met harde kaft — tot die tijd zie je 'Binnenkort' op die plek in je bibliotheek.",
  },
  {
    question: "In welke taal worden de verhalen geschreven?",
    answer:
      "Gewoon in het Nederlands — de verhalen worden direct in het Nederlands geschreven, met taalgebruik dat past bij de leeftijd van je kind. Alleen achter de schermen, voor de illustraties, gebruiken we Engelstalige beschrijvingen omdat beeldmodellen daar het beste op reageren. Daar merk je niets van.",
  },
  {
    question: "Wat als een verhaal niet helemaal goed is?",
    answer:
      "Per verhaal kun je het één keer gratis opnieuw laten maken. In de lezer kies je 'Opnieuw maken' en geef je aan wat er anders moet — korter, langer, grappiger of rustiger, of in je eigen woorden (te eng, voeg de oma toe…). Let op: het oude verhaal vervalt dan, dus geef je feedback in één keer mee. Kom je er niet uit, mail ons gerust.",
  },
];

async function main() {
  const host = process.env.DATABASE_URL!.match(/@([^/]+)/)?.[1] ?? "?";
  console.log(`📡 Target: ${host} (${useProd ? "PROD" : "dev"})`);
  const before = await prisma.faqEntry.count();
  await prisma.faqEntry.deleteMany();
  await prisma.faqEntry.createMany({
    data: ENTRIES.map((e, i) => ({
      question: e.question,
      answer: e.answer,
      sortOrder: (i + 1) * 10,
      isPublished: true,
    })),
  });
  const after = await prisma.faqEntry.count();
  console.log(`FAQ reseed klaar: ${before} → ${after} rows`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import "dotenv/config";
import { prisma } from "../src/lib/db";

const ENTRIES: { question: string; answer: string }[] = [
  {
    question: "Vanaf welke leeftijd is Ons Verhaaltje geschikt?",
    answer:
      "Vanaf ongeveer 2 jaar. We schrijven verhalen voor drie leeftijdsgroepen — 2–4, 5–7 en 8–10 — zodat het taalniveau, de zinslengte en de spanningsboog meegroeien met je kind. Je geeft de leeftijd op in het profiel en de AI past zich automatisch aan.",
  },
  {
    question: "Hoe persoonlijk worden de verhalen?",
    answer:
      "Behoorlijk persoonlijk. We gebruiken de naam, het geslacht, de favoriete knuffel, een lievelingsdier, namen van broertjes en zusjes (of beste vriend/vriendin) en de plek waar het kind woont. Daarnaast kies je per verhaal de setting (bv. fantasiebos, ruimte, onderwaterwereld) en eventueel een gebeurtenis (verjaardag, eerste schooldag, slapen bij oma).",
  },
  {
    question: "Wat gebeurt er met de gegevens van mijn kind?",
    answer:
      "Profielgegevens staan alleen in jouw account en zijn niet zichtbaar voor andere klanten. We delen niets met derden voor reclame-doeleinden. De AI-leverancier (Anthropic, voor de verhaaltjes) krijgt de profielgegevens tijdelijk te zien om het verhaal te schrijven — die data wordt niet gebruikt om hun modellen te trainen. Verwijder je je account, dan verwijderen wij alle profielen en gegenereerde verhalen.",
  },
  {
    question: "Hoe vaak kan ik een nieuw verhaal maken?",
    answer:
      "Dat hangt af van je abonnement. Het basis-abonnement geeft je 1 verhaal per maand; daarnaast kun je losse extra verhalen kopen via 'tegoed'. Premium geeft je meer per maand. De actuele aantallen en prijzen staan op de homepage onder 'Prijzen'.",
  },
  {
    question: "Hoe zeg ik mijn abonnement op?",
    answer:
      "In je account onder 'Abonnement' staat een 'Opzeggen'-knop. Je houdt toegang tot het einde van de lopende termijn (maand of jaar) en wordt niet automatisch opnieuw geïncasseerd. Het opzegproces vraagt kort waarom — dat helpt ons om de dienst beter te maken, maar is optioneel.",
  },
  {
    question: "Kan ik de verhalen ook als gedrukt boek bestellen?",
    answer:
      "Daar werken we aan. De PDF-export per verhaal staat er al; binnenkort koppelen we een drukker zodat je geselecteerde verhalen kunt bundelen tot een echt boek met harde kaft. Tot die tijd zie je 'Binnenkort' op die plek in je dashboard.",
  },
  {
    question: "In welke taal worden de verhalen geschreven?",
    answer:
      "De verhalen verschijnen in het Nederlands. Onder de motorkap genereren we de tekst eerst in het Engels (waar het AI-model het beste in is) en vertalen we 'm daarna naar het Nederlands — dat geeft meer creativiteit en woordkeus dan direct in het Nederlands genereren.",
  },
  {
    question: "Wat als een verhaal niet helemaal goed is?",
    answer:
      "Per verhaal heb je één keer een gratis 'opnieuw maken'-knop in de lezer. Je kunt daar in een paar zinnen aangeven wat er anders moet (te eng, te lang, voeg de oma toe…) en de AI probeert het opnieuw. Het oude verhaal raak je dan kwijt; geef daarom altijd je feedback mee.",
  },
];

async function main() {
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

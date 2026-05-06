import { prisma } from "@/lib/db";

/**
 * Catalogue of editable AI-prompt snippets. Each entry has:
 *   - `code`: stable identifier used as the DB primary key
 *   - `label`: short human label for the admin editor
 *   - `description`: one-sentence explanation of where this snippet lands
 *   - `default`: the production-grade Dutch/English text shipped in code
 *
 * Adding a snippet: append a row here, then read it via
 * `loadAiPromptSnippets()` and splice it into your prompt builder.
 *
 * Removing a snippet: delete the row and any DB rows referring to its
 * code (admin Reset will then leave the default behaviour intact).
 */
export const AI_PROMPT_SNIPPETS = [
  {
    code: "age.0-1",
    label: "Leeftijd 0-1: schrijfstijl",
    description:
      "Schrijfinstructie voor verhalen voor baby's t/m 1 jaar. Heel korte zinnen, herhaling, klankwoorden.",
    default: `LEEFTIJD 0-1: Heel korte zinnen van 3-5 woorden. Veel herhaling. Klankwoorden (Boem! Woef! Giechel!).
    Concreet en visueel. Maximaal één ding per pagina. Geen abstracties. Denk aan Nijntje-niveau.`,
  },
  {
    code: "age.1-2",
    label: "Leeftijd 1-2: schrijfstijl",
    description:
      "Schrijfinstructie voor peuters van 1-2 jaar. Iets langer dan 0-1 maar nog steeds heel simpel.",
    default: `LEEFTIJD 1-2: Heel korte zinnen van 3-6 woorden. Veel herhaling. Klankwoorden (Boem! Woef! Giechel!).
    Concreet en visueel. Maximaal één ding per pagina. Geen abstracties.`,
  },
  {
    code: "age.3-4",
    label: "Leeftijd 3-4: schrijfstijl",
    description:
      "Schrijfinstructie voor kleuters van 3-4 jaar. Korte zinnen, simpele gebeurtenissen.",
    default: `LEEFTIJD 3-4: Korte zinnen van 5-8 woorden. Simpele gebeurtenissen. Veel emoties benoemen.
    Herhaling en ritme. Eenvoudige woordenschat.`,
  },
  {
    code: "age.5-7",
    label: "Leeftijd 5-7: schrijfstijl",
    description:
      "Schrijfinstructie voor kleuters/onderbouw 5-7 jaar. Plot met begin-midden-einde, dialogen, lichte spanning.",
    default: `LEEFTIJD 5-7: Zinnen van 8-15 woorden. Duidelijk begin-midden-einde. Wat spanning en oplossing.
    Dialogen welkom. Rijkere woordenschat maar toegankelijk.`,
  },
  {
    code: "age.8-10",
    label: "Leeftijd 8-10: schrijfstijl",
    description:
      "Schrijfinstructie voor middenbouw 8-10 jaar. Echte plot, humor, karakterontwikkeling.",
    default: `LEEFTIJD 8-10: Langere zinnen, echte plot, bijzinnen. Humor en spanning. Karakterontwikkeling.
    Uitgebreide woordenschat, figuurlijk taalgebruik welkom.`,
  },
  {
    code: "illustration.style",
    label: "Illustratie-stijl (visuele toon)",
    description:
      "De stijl-richtlijn voor de illustraties. Wijzig dit om de visuele look van alle nieuwe verhalen aan te passen — bijvoorbeeld van waterverf naar Dick Bruna-stijl.",
    default: `STYLE: soft watercolor illustration, children's picture book, Ernest et Célestine animation aesthetic | warm pastel palette, gentle brushstrokes, visible paper texture | cozy tender atmosphere, consistent character design across all images | no text, no watermark, no words`,
  },
  {
    code: "quality-check",
    label: "Kwaliteitscontrole-regels",
    description:
      "Het lijstje waar Claude zijn eigen tekst op moet checken voor publicatie (de/het, kommafouten, scène-logica).",
    default: `KWALITEITSCONTROLE:
Controleer je eigen tekst na het schrijven op:
• de/het-fouten  • kommafouten  • onnatuurlijke zinnen voor een Nederlands kind
• LOGICA: alles wat gebeurt MOET passen bij de setting. Onder water kun je niet eten, in de ruimte kun je niet zwemmen in een meer, in het bos zijn geen liften, etc. Favoriete dingen van het kind (eten, speelgoed, etc.) mogen ALLEEN voorkomen als ze logisch passen in de setting. Verwerk ze creatief als het past, maar forceer ze nooit.
• Controleer elke scène: "Kan dit echt gebeuren op deze plek?" — zo nee, pas het aan of laat het weg.
Geef alleen de gecorrigeerde versie terug.`,
  },
  {
    code: "side-characters",
    label: "Bijpersonage-instructies",
    description:
      "Hoe Claude bijpersonages (broertje, vriendje, knuffel) consistent moet beschrijven over alle illustraties heen.",
    default: `BIJPERSONAGES — HEEL BELANGRIJK VOOR CONSISTENTIE:
Als er bijpersonages in het verhaal voorkomen (metgezel, broertje/zusje, huisdier), moet je EERST in je JSON een "sideCharacters" object opnemen met een vaste Engelse beschrijving per personage. Gebruik die beschrijving dan LETTERLIJK (copy-paste) in ELKE illustratie waar dat personage voorkomt.

BELANGRIJK: als de ouder hierboven onder "Huisdieren" of "Vriendjes" een uiterlijk-beschrijving heeft opgegeven (achter "— uiterlijk:"), gebruik die dan ONGEWIJZIGD als basis van de beschrijving in "sideCharacters". Vertaal alleen naar het Engels en vul aan met specifieke kleding/kleuren; verzin GEEN ander uiterlijk.

Voorbeeld: als Sam (broertje, 3 jaar) meegaat:
"sideCharacters": { "Sam": "a 3 year old boy, fair skin, short blonde hair, blue eyes, wearing a red sweater and blue jeans" }
Dan moet ELKE illustratie waar Sam in voorkomt exact die zin bevatten.

Zelfde voor huisdieren: "Ofilantje": "a small orange and white guinea pig with round ears"
Gebruik EXACT dezelfde beschrijving in elke illustratie.

ALLEEN personages die als metgezel gekozen zijn of expliciet in de tekst voorkomen mogen in illustraties verschijnen. Geen extra personages verzinnen!
Het EXACTE aantal personages in de illustratie moet kloppen met de tekst. Als er in de tekst 2 personages zijn, teken er dan precies 2, niet meer.`,
  },
] as const;

export type AiPromptCode = (typeof AI_PROMPT_SNIPPETS)[number]["code"];

/**
 * Map of code → effective value, with admin overrides applied on top of
 * the shipped defaults. Caching one DB read per request is fine — the
 * row count is tiny (8) and the prompt-build path runs once per story.
 */
export type AiPromptValues = Record<string, string>;

export async function loadAiPromptSnippets(): Promise<AiPromptValues> {
  const overrides = await prisma.aiPromptOverride.findMany({
    select: { code: true, value: true },
  });
  const overrideMap = new Map(overrides.map((o) => [o.code, o.value]));

  const result: AiPromptValues = {};
  for (const def of AI_PROMPT_SNIPPETS) {
    result[def.code] = overrideMap.get(def.code) ?? def.default;
  }
  return result;
}

export function findAiPromptSnippet(code: string) {
  return AI_PROMPT_SNIPPETS.find((s) => s.code === code);
}

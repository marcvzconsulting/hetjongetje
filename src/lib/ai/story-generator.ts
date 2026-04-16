import Anthropic from "@anthropic-ai/sdk";
import { STORY_SETTINGS, ADVENTURE_TYPES, STORY_MOODS, OCCASIONS, type StorySetting, type AdventureType, type StoryMood, type Occasion } from "./prompts/story-request";
import { calculateAge } from "@/lib/utils/age";

const anthropic = new Anthropic();

// —— Types ————————————————————————————————————————————————————————————

export interface CharacterBible {
  childName: string;
  dateOfBirth: string;
  gender: string;
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  skinColor?: string;
  wearsGlasses?: boolean;
  hasFreckles?: boolean;
  interests: string[];
  pets?: { name: string; type: string; description?: string }[];
  friends?: { name: string; relationship?: string }[];
  favoriteThings?: { color?: string; food?: string; toy?: string; place?: string };
  fears?: string[];
  mainCharacterType: string;
  mainCharacterDescription?: string;
  approvedCharacterPrompt?: string; // locked prompt after parent approval
  previousAdventures?: { title: string; setting: string; summary: string }[];
}

export interface StoryRequest {
  setting: StorySetting | string;
  adventureType: AdventureType;
  mood: StoryMood;
  occasion?: Occasion;
  companion?: string;
  specialDetail?: string;
}

export interface StoryPage {
  text: string;                // Dutch story text for this page
  illustrationPrompt: string;  // English illustration description matching THIS text
  imageUrl?: string | null;
}

export interface GeneratedStory {
  title: string;
  tag: string;
  endingText: string;
  endingSign: string;
  pages: StoryPage[];
  endingIllustrationPrompt: string; // closing scene illustration
  endingImageUrl?: string | null;
  characterBibleUpdate?: string;
}

// —— Leeftijdsgroep → schrijfinstructies ——————————————————————————————

function ageInstructions(age: number): string {
  if (age <= 1) return `
    LEEFTIJD 0-1: Heel korte zinnen van 3-5 woorden. Veel herhaling. Klankwoorden (Boem! Woef! Giechel!).
    Concreet en visueel. Maximaal één ding per pagina. Geen abstracties. Denk aan Nijntje-niveau.`;
  if (age <= 2) return `
    LEEFTIJD 1-2: Heel korte zinnen van 3-6 woorden. Veel herhaling. Klankwoorden (Boem! Woef! Giechel!).
    Concreet en visueel. Maximaal één ding per pagina. Geen abstracties.`;
  if (age <= 4) return `
    LEEFTIJD 3-4: Korte zinnen van 5-8 woorden. Simpele gebeurtenissen. Veel emoties benoemen.
    Herhaling en ritme. Eenvoudige woordenschat.`;
  if (age <= 7) return `
    LEEFTIJD 5-7: Zinnen van 8-15 woorden. Duidelijk begin-midden-einde. Wat spanning en oplossing.
    Dialogen welkom. Rijkere woordenschat maar toegankelijk.`;
  return `
    LEEFTIJD 8-10: Langere zinnen, echte plot, bijzinnen. Humor en spanning. Karakterontwikkeling.
    Uitgebreide woordenschat, figuurlijk taalgebruik welkom.`;
}

// —— Aquarel stijl-handtekening voor illustraties ————————————————————

export function buildCharacterDescription(bible: CharacterBible): string {
  // Use approved prompt if available — this was explicitly approved by the parent
  if (bible.approvedCharacterPrompt) {
    return bible.approvedCharacterPrompt;
  }

  const age = calculateAge(bible.dateOfBirth) ?? 1;
  const gender = bible.gender === "boy" ? "boy" : bible.gender === "girl" ? "girl" : "child";

  // Translate Dutch appearance values to English for image generation
  const skinMap: Record<string, string> = {
    "licht": "fair", "licht getint": "light tan", "getint": "medium tan",
    "donker getint": "dark tan", "donker": "dark brown",
  };
  const hairColorMap: Record<string, string> = {
    "blond": "blonde", "lichtbruin": "light brown", "donkerbruin": "dark brown",
    "zwart": "black", "rood": "red", "rossig": "ginger",
  };
  const hairStyleMap: Record<string, string> = {
    "kort": "short", "halflang": "medium length", "lang": "long", "krullen": "curly",
    "steil": "straight", "staartjes": "pigtails", "vlechtjes": "braids",
    "bob": "bob cut", "knot": "bun", "afro": "afro",
  };
  const eyeColorMap: Record<string, string> = {
    "blauw": "blue", "bruin": "brown", "groen": "green",
    "grijs": "grey", "hazelnoot": "hazel",
  };

  const skin = bible.skinColor ? (skinMap[bible.skinColor] || bible.skinColor) : null;
  const hairColor = bible.hairColor ? (hairColorMap[bible.hairColor] || bible.hairColor) : null;
  const hairStyle = bible.hairStyle ? (hairStyleMap[bible.hairStyle] || bible.hairStyle) : null;
  const eyeColor = bible.eyeColor ? (eyeColorMap[bible.eyeColor] || bible.eyeColor) : null;

  const parts = [
    `a ${age} year old ${gender}`,
  ];

  if (skin) parts.push(`${skin} skin`);
  if (hairColor && hairStyle) {
    parts.push(`${hairStyle} ${hairColor} hair`);
  } else if (hairColor) {
    parts.push(`${hairColor} hair`);
  } else if (hairStyle) {
    parts.push(`${hairStyle} hair`);
  }
  if (eyeColor) parts.push(`${eyeColor} eyes`);
  if (bible.wearsGlasses) parts.push("wearing small round glasses");
  parts.push("round chubby face");
  if (bible.hasFreckles) parts.push("prominently freckled face with many dark freckle spots across nose and cheeks");

  if (bible.mainCharacterDescription) {
    parts.push(bible.mainCharacterDescription);
  }

  return parts.join(", ");
}

export function buildSideCharacterDescriptions(bible: CharacterBible): string {
  const parts: string[] = [];

  if (bible.pets?.length) {
    for (const pet of bible.pets) {
      parts.push(`${pet.name} the ${pet.type}: always the same color and size in every illustration`);
    }
  }

  if (bible.friends?.length) {
    for (const friend of bible.friends) {
      const rel = friend.relationship ? ` (${friend.relationship})` : "";
      parts.push(`${friend.name}${rel}: must look identical in every illustration, consistent hair color, clothing, and features`);
    }
  }

  return parts.length > 0
    ? `RECURRING CHARACTERS (must look identical across all illustrations): ${parts.join(". ")}.`
    : "";
}

export function buildIllustrationStyle(bible: CharacterBible): string {
  const sideChars = buildSideCharacterDescriptions(bible);

  const styleParts = [
    `MAIN CHARACTER (must appear identical in every image): ${buildCharacterDescription(bible)}`,
  ];

  if (sideChars) {
    styleParts.push(sideChars);
  }

  styleParts.push(
    "STYLE: soft watercolor illustration, children's picture book, Ernest et Célestine animation aesthetic",
    "warm pastel palette, gentle brushstrokes, visible paper texture",
    "cozy tender atmosphere, consistent character design across all images",
    "no text, no watermark, no words",
  );

  return styleParts.join(" | ");
}

// —— Hoofdfunctie: verhaal genereren ————————————————————————————————

export async function generateStory(
  characterBible: CharacterBible,
  request: StoryRequest
): Promise<GeneratedStory> {
  const age = calculateAge(characterBible.dateOfBirth) ?? 1;
  const charDescription = buildCharacterDescription(characterBible);
  const styleHint = buildIllustrationStyle(characterBible);

  const settingInfo = STORY_SETTINGS[request.setting as StorySetting];
  const adventureInfo = ADVENTURE_TYPES[request.adventureType];
  const moodInfo = STORY_MOODS[request.mood];
  const occasionInfo = request.occasion && request.occasion !== "none" ? OCCASIONS[request.occasion] : null;

  const settingLabel = settingInfo?.label ?? request.setting;
  const settingEmoji = settingInfo?.emoji ?? "✨";
  const adventureLabel = adventureInfo?.label ?? request.adventureType;

  // Character description
  let characterSection = "";
  if (characterBible.mainCharacterType === "self") {
    characterSection = `De held is ${characterBible.childName} zelf — een ${characterBible.gender === "boy" ? "jongetje" : characterBible.gender === "girl" ? "meisje" : "kind"} van ${age} jaar.`;
  } else if (characterBible.mainCharacterType === "stuffed_animal") {
    characterSection = `De held is ${characterBible.childName}'s knuffeldier: ${characterBible.mainCharacterDescription || "een lief knuffeldier"}. ${characterBible.childName} verschijnt als beste vriend(in).`;
  } else if (characterBible.mainCharacterType === "action_hero") {
    characterSection = `De held is: ${characterBible.mainCharacterDescription || "een dappere held"}. ${characterBible.childName} verschijnt als vriend(in) of hulpje.`;
  } else {
    characterSection = `De held is: ${characterBible.mainCharacterDescription || characterBible.childName}`;
  }

  // Pets and friends are listed for context, but should ONLY appear if chosen as companion
  const petsStr = characterBible.pets?.length
    ? `- Huisdieren (alleen vermelden als ze als metgezel zijn gekozen): ${characterBible.pets.map((p) => `${p.name} de ${p.type}`).join(", ")}`
    : "";
  const friendsStr = characterBible.friends?.length
    ? `- Vriendjes (alleen vermelden als ze als metgezel zijn gekozen): ${characterBible.friends.map((f) => `${f.name}${f.relationship ? ` (${f.relationship})` : ""}`).join(", ")}`
    : "";
  const favStr = characterBible.favoriteThings
    ? `- Favorieten: ${Object.entries(characterBible.favoriteThings).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(", ")}`
    : "";
  const fearsStr = characterBible.fears?.length
    ? `- VERMIJD deze onderwerpen (het kind is hier bang voor): ${characterBible.fears.join(", ")}`
    : "";
  const prevStr = characterBible.previousAdventures?.length
    ? `\nEerdere avonturen (hou hier rekening mee):\n${characterBible.previousAdventures.map((a) => `- "${a.title}" (${a.setting}): ${a.summary}`).join("\n")}`
    : "";

  const prompt = `
Je bent een Nederlandse kinderboekenauteur. Schrijf een persoonlijk kinderverhaaltje voor ${characterBible.childName} (${age} jaar).

${ageInstructions(age)}

KINDPROFIEL:
- Naam: ${characterBible.childName}
- Leeftijd: ${age} jaar
${characterSection}
- Interesses: ${characterBible.interests.join(", ")}
${petsStr}
${friendsStr}
${favStr}
${fearsStr}
${prevStr}

VERHAALINSTELLINGEN:
- Setting: ${settingLabel}
- Type avontuur: ${adventureLabel}
- Sfeer: ${moodInfo?.label ?? request.mood}
${occasionInfo ? `- Aanleiding/feestdag: ${occasionInfo.label} — ${occasionInfo.description}` : ""}
${request.companion ? `- Metgezel op het avontuur: ${request.companion}` : ""}
${request.specialDetail ? `- Verwerk dit detail: ${request.specialDetail}` : ""}
- Slaapverhaaltje: ${request.mood === "bedtime" ? "ja — rustig tempo, zacht einde" : "nee"}
- Grappig: ${request.mood === "funny" ? "ja — humor en grappige wendingen welkom" : "nee"}

KWALITEITSCONTROLE:
Controleer je eigen tekst na het schrijven op:
• de/het-fouten  • kommafouten  • onnatuurlijke zinnen voor een Nederlands kind
• LOGICA: alles wat gebeurt MOET passen bij de setting. Onder water kun je niet eten, in de ruimte kun je niet zwemmen in een meer, in het bos zijn geen liften, etc. Favoriete dingen van het kind (eten, speelgoed, etc.) mogen ALLEEN voorkomen als ze logisch passen in de setting. Verwerk ze creatief als het past, maar forceer ze nooit.
• Controleer elke scène: "Kan dit echt gebeuren op deze plek?" — zo nee, pas het aan of laat het weg.
Geef alleen de gecorrigeerde versie terug.

ILLUSTRATIE-INSTRUCTIES:
Elke illustratiebeschrijving MOET in het Engels zijn en MOET beginnen met exact deze karakteromschrijving:
"${charDescription}"

Voeg daarna de scène toe. Het karakter moet er in ELKE illustratie IDENTIEK uitzien — zelfde gezicht, zelfde lichaamsbouw, zelfde stijl.

BIJPERSONAGES — HEEL BELANGRIJK VOOR CONSISTENTIE:
Als er bijpersonages in het verhaal voorkomen (metgezel, broertje/zusje, huisdier), moet je EERST in je JSON een "sideCharacters" object opnemen met een vaste Engelse beschrijving per personage. Gebruik die beschrijving dan LETTERLIJK (copy-paste) in ELKE illustratie waar dat personage voorkomt.

Voorbeeld: als Sam (broertje, 3 jaar) meegaat:
"sideCharacters": { "Sam": "a 3 year old boy, fair skin, short blonde hair, blue eyes, wearing a red sweater and blue jeans" }
Dan moet ELKE illustratie waar Sam in voorkomt exact die zin bevatten.

Zelfde voor huisdieren: "Ofilantje": "a small orange and white guinea pig with round ears"
Gebruik EXACT dezelfde beschrijving in elke illustratie.

ALLEEN personages die als metgezel gekozen zijn of expliciet in de tekst voorkomen mogen in illustraties verschijnen. Geen extra personages verzinnen!
Het EXACTE aantal personages in de illustratie moet kloppen met de tekst. Als er in de tekst 2 personages zijn, teken er dan precies 2, niet meer.

BELANGRIJK: illustraties moeten ook logisch passen bij de setting! Geen huisdieren of aardse dieren in de ruimte, geen alledaagse voorwerpen onder water, etc. Alleen dingen die in de gekozen wereld thuishoren.

Stijl voor alle illustraties: ${styleHint}

UITVOER — geef ALLEEN geldige JSON terug, geen markdown, geen uitleg.
BELANGRIJK: elke pagina bevat ZOWEL tekst ALS de illustratiebeschrijving die bij DIE tekst hoort.
De illustratie moet exact weergeven wat er in de tekst op DEZELFDE pagina gebeurt — niet de volgende of vorige pagina.

{
  "title": "Verhaaltitel",
  "endingText": "Afsluitende zin voor de eindpagina (poëtisch, 1-2 zinnen)",
  "endingSign": "Welterusten/Tot ziens, lieve ${characterBible.childName}!",
  "sideCharacters": { "Naam": "vaste Engelse beschrijving die je LETTERLIJK herhaalt in elke illustratie" },
  "endingIllustrationPrompt": "${charDescription}, [rustige afsluitscène]. Soft watercolor, children's picture book style.",
  "characterBibleUpdate": "Kort over wat er nieuw is vastgesteld in dit verhaal",
  "pages": [
    {
      "text": "Nederlandse verhaaltekst voor pagina 1",
      "illustrationPrompt": "${charDescription}, [scène]. Als bijpersonage aanwezig: plak hun EXACTE beschrijving uit sideCharacters erin. Soft watercolor, children's picture book style."
    },
    {
      "text": "Nederlandse verhaaltekst voor pagina 2",
      "illustrationPrompt": "${charDescription}, [scène]. Soft watercolor, children's picture book style."
    },
    {
      "text": "Nederlandse verhaaltekst voor pagina 3",
      "illustrationPrompt": "${charDescription}, [scène die EXACT de tekst op DEZE pagina illustreert]. Soft watercolor, children's picture book style."
    },
    {
      "text": "Nederlandse verhaaltekst voor pagina 4 (afsluiting)",
      "illustrationPrompt": "${charDescription}, [scène die EXACT de tekst op DEZE pagina illustreert]. Soft watercolor, children's picture book style."
    }
  ]
}

Regels:
- BELANGRIJK: huisdieren en vriendjes mogen ALLEEN in het verhaal voorkomen als ze expliciet als metgezel zijn gekozen bij "Metgezel op het avontuur". Als er geen metgezel is gekozen, komen ze NIET voor in het verhaal.
- Schrijf warm en verhalend Nederlands — gebruik ${characterBible.childName} regelmatig bij de naam
- Precies 4 pagina's, elke pagina heeft tekst EN een bijpassende illustratiebeschrijving
- De illustratiebeschrijving op elke pagina toont PRECIES wat er in de tekst van DIE pagina gebeurt
- Elke illustratiebeschrijving BEGINT met de exacte karakteromschrijving hierboven
- endingIllustrationPrompt is een aparte, rustige afsluitillustratie (slapend kind, zonsondergang, knuffelmoment)
- Totaal ${age <= 2 ? "50-100" : age <= 4 ? "150-250" : age <= 7 ? "300-450" : "400-600"} woorden
`.trim();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    system: "Je bent een Nederlandse kinderboekenauteur. Schrijf warm, persoonlijk en leeftijdsgeschikt. Geef altijd JSON terug.",
    messages: [{ role: "user", content: prompt }],
  });

  const raw = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Geen geldige JSON in API-response");

  const parsed = JSON.parse(jsonMatch[0]) as {
    title: string;
    endingText: string;
    endingSign: string;
    endingIllustrationPrompt: string;
    characterBibleUpdate?: string;
    pages: { text: string; illustrationPrompt: string }[];
  };

  return {
    title: parsed.title,
    tag: `${settingEmoji} ${settingLabel} · ${adventureInfo?.emoji ?? "✨"} ${adventureLabel}`,
    endingText: parsed.endingText,
    endingSign: parsed.endingSign,
    endingIllustrationPrompt: parsed.endingIllustrationPrompt || "",
    characterBibleUpdate: parsed.characterBibleUpdate,
    pages: parsed.pages.map((p) => ({
      text: p.text,
      illustrationPrompt: p.illustrationPrompt,
    })),
  };
}

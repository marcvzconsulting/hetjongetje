import Anthropic from "@anthropic-ai/sdk";
import { STORY_SETTINGS, ADVENTURE_TYPES, STORY_MOODS, OCCASIONS, type StorySetting, type AdventureType, type StoryMood, type Occasion } from "./prompts/story-request";
import { loadAiPromptSnippets, type AiPromptValues } from "./prompts/store";
import { calculateAge } from "@/lib/utils/age";
import {
  sanitizePromptShort,
  sanitizePromptDescription,
} from "./sanitize";

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
  friends?: { name: string; relationship?: string; description?: string }[];
  favoriteThings?: { color?: string; food?: string; toy?: string; place?: string };
  fears?: string[];
  mainCharacterType: string;
  mainCharacterDescription?: string;
  approvedCharacterPrompt?: string; // locked prompt after parent approval
  previousAdventures?: { title: string; setting: string; summary: string }[];
  /** Trained LoRA URL — activates personalised character model when present */
  loraUrl?: string;
  /** Unique trigger word baked into the LoRA; must appear in every prompt */
  loraTriggerWord?: string;
}

export interface StoryRequest {
  setting: StorySetting | string;
  adventureType: AdventureType;
  mood: StoryMood;
  occasion?: Occasion;
  companion?: string;
  specialDetail?: string;
  /** Free-text guidance from the parent on what to change vs. the
   *  previous version. Only set on regenerate calls; null/undefined for
   *  first-time generation. Sanitised + clamped before splicing into
   *  the prompt. */
  regenerationFeedback?: string;
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
  /** Anthropic-token-usage uit deze generatie. Wordt gebruikt voor
   *  kostentracking; null kan voorkomen als de Claude-call faalde. */
  textUsage?: { inputTokens: number; outputTokens: number };
  /** Aantal succesvolle illustraties + welk fal.ai-pad gebruikt is.
   *  Wordt door generateIllustrations gevuld; bij 0 = generatie sloeg
   *  over of mislukte. */
  imageUsage?: { imageCount: number; model: "lora" | "pro" };
}

// —— Leeftijdsgroep → schrijfinstructies ——————————————————————————————

/**
 * Pick the right per-age writing instruction from the loaded snippets
 * map. Boundaries:
 *   age <= 1  → age.0-1
 *   age <= 2  → age.1-2
 *   age <= 4  → age.3-4
 *   age <= 7  → age.5-7
 *   else      → age.8-10
 *
 * The snippets themselves are admin-editable in /admin/ai-prompts; the
 * map here just routes to the matching code.
 */
function ageInstructions(age: number, snippets: AiPromptValues): string {
  if (age <= 1) return snippets["age.0-1"];
  if (age <= 2) return snippets["age.1-2"];
  if (age <= 4) return snippets["age.3-4"];
  if (age <= 7) return snippets["age.5-7"];
  return snippets["age.8-10"];
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
    parts.push(sanitizePromptDescription(bible.mainCharacterDescription));
  }

  return parts.join(", ");
}

export function buildSideCharacterDescriptions(bible: CharacterBible): string {
  const parts: string[] = [];

  if (bible.pets?.length) {
    for (const pet of bible.pets) {
      const name = sanitizePromptShort(pet.name);
      const type = sanitizePromptShort(pet.type);
      const desc = sanitizePromptDescription(pet.description);
      const extra = desc ? `, ${desc}` : "";
      parts.push(
        `${name} the ${type}${extra}: always the same color and size in every illustration`
      );
    }
  }

  if (bible.friends?.length) {
    for (const friend of bible.friends) {
      const name = sanitizePromptShort(friend.name);
      const relRaw = sanitizePromptShort(friend.relationship);
      const rel = relRaw ? ` (${relRaw})` : "";
      const desc = sanitizePromptDescription(friend.description);
      const extra = desc ? `, ${desc}` : "";
      parts.push(
        `${name}${rel}${extra}: must look identical in every illustration, consistent hair, clothing and features`
      );
    }
  }

  return parts.length > 0
    ? `RECURRING CHARACTERS (must look identical across all illustrations): ${parts.join(". ")}.`
    : "";
}

/**
 * Compose the per-image style hint that gets pasted into every
 * illustration prompt. Combines:
 *   - the locked main-character description
 *   - any side-character pinned descriptions for consistency
 *   - the admin-editable visual style line (defaults to soft watercolor)
 *
 * `snippets` is optional so callers that haven't loaded the override
 * map yet (e.g. tests) still get the production default.
 */
export function buildIllustrationStyle(
  bible: CharacterBible,
  snippets?: AiPromptValues,
): string {
  const sideChars = buildSideCharacterDescriptions(bible);

  const styleParts = [
    `MAIN CHARACTER (must appear identical in every image): ${buildCharacterDescription(bible)}`,
  ];

  if (sideChars) {
    styleParts.push(sideChars);
  }

  // Fall back to the in-code default so this function still works in
  // the rare path that calls it without first loading the snippet map.
  const styleLine =
    snippets?.["illustration.style"] ??
    "STYLE: soft watercolor illustration, children's picture book, Ernest et Célestine animation aesthetic | warm pastel palette, gentle brushstrokes, visible paper texture | cozy tender atmosphere, consistent character design across all images | no text, no watermark, no words";
  styleParts.push(styleLine);

  return styleParts.join(" | ");
}

// —— Hoofdfunctie: verhaal genereren ————————————————————————————————

/**
 * Return a copy of the bible with every parent-supplied free-text field
 * sanitized so it's safe to splice into LLM prompts. Static enums
 * (gender, mainCharacterType, dateOfBirth) pass through untouched.
 */
function sanitizeBible(bible: CharacterBible): CharacterBible {
  return {
    ...bible,
    childName: sanitizePromptShort(bible.childName),
    hairColor: sanitizePromptShort(bible.hairColor),
    hairStyle: sanitizePromptShort(bible.hairStyle),
    eyeColor: sanitizePromptShort(bible.eyeColor),
    skinColor: sanitizePromptShort(bible.skinColor),
    interests: (bible.interests ?? []).map(sanitizePromptShort).filter(Boolean),
    pets: bible.pets?.map((p) => ({
      name: sanitizePromptShort(p.name),
      type: sanitizePromptShort(p.type),
      description: p.description
        ? sanitizePromptDescription(p.description)
        : undefined,
    })),
    friends: bible.friends?.map((f) => ({
      name: sanitizePromptShort(f.name),
      relationship: f.relationship
        ? sanitizePromptShort(f.relationship)
        : undefined,
      description: f.description
        ? sanitizePromptDescription(f.description)
        : undefined,
    })),
    favoriteThings: bible.favoriteThings
      ? {
          color: sanitizePromptShort(bible.favoriteThings.color),
          food: sanitizePromptShort(bible.favoriteThings.food),
          toy: sanitizePromptShort(bible.favoriteThings.toy),
          place: sanitizePromptShort(bible.favoriteThings.place),
        }
      : undefined,
    fears: bible.fears?.map(sanitizePromptShort).filter(Boolean),
    mainCharacterDescription: bible.mainCharacterDescription
      ? sanitizePromptDescription(bible.mainCharacterDescription)
      : undefined,
    // approvedCharacterPrompt is reviewed by an admin before use, so it
    // gets the long-text treatment but stays editable. Still strip control
    // chars to harden against accidental newlines or copy-paste artefacts.
    approvedCharacterPrompt: bible.approvedCharacterPrompt
      ? sanitizePromptDescription(bible.approvedCharacterPrompt)
      : undefined,
    previousAdventures: bible.previousAdventures?.map((a) => ({
      title: sanitizePromptShort(a.title),
      setting: sanitizePromptShort(a.setting),
      summary: sanitizePromptDescription(a.summary),
    })),
    // loraTriggerWord is generated server-side, so a strict short cap is
    // enough — no description treatment needed.
    loraTriggerWord: bible.loraTriggerWord
      ? sanitizePromptShort(bible.loraTriggerWord)
      : undefined,
  };
}

function sanitizeRequest(request: StoryRequest): StoryRequest {
  return {
    ...request,
    companion: request.companion
      ? sanitizePromptShort(request.companion)
      : undefined,
    specialDetail: request.specialDetail
      ? sanitizePromptDescription(request.specialDetail)
      : undefined,
    regenerationFeedback: request.regenerationFeedback
      ? sanitizePromptDescription(request.regenerationFeedback)
      : undefined,
  };
}

export async function generateStory(
  rawBible: CharacterBible,
  rawRequest: StoryRequest
): Promise<GeneratedStory> {
  const characterBible = sanitizeBible(rawBible);
  const request = sanitizeRequest(rawRequest);

  const age = calculateAge(characterBible.dateOfBirth) ?? 1;
  const charDescription = buildCharacterDescription(characterBible);
  // Load admin-editable snippets once per generation. Defaults are used
  // when no override row exists, so this is safe even on a fresh DB.
  const snippets = await loadAiPromptSnippets();
  const styleHint = buildIllustrationStyle(characterBible, snippets);

  const settingInfo = STORY_SETTINGS[request.setting as StorySetting];
  const adventureInfo = ADVENTURE_TYPES[request.adventureType];
  const moodInfo = STORY_MOODS[request.mood];
  const occasionInfo = request.occasion && request.occasion !== "none" ? OCCASIONS[request.occasion] : null;

  const settingLabel = settingInfo?.label ?? request.setting;
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
    ? `- Huisdieren (alleen vermelden als ze als metgezel zijn gekozen): ${characterBible.pets
        .map(
          (p) =>
            `${p.name} de ${p.type}${p.description ? ` — uiterlijk: ${p.description}` : ""}`
        )
        .join(", ")}`
    : "";
  const friendsStr = characterBible.friends?.length
    ? `- Vriendjes (alleen vermelden als ze als metgezel zijn gekozen): ${characterBible.friends
        .map(
          (f) =>
            `${f.name}${f.relationship ? ` (${f.relationship})` : ""}${
              f.description ? ` — uiterlijk: ${f.description}` : ""
            }`
        )
        .join(", ")}`
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

${ageInstructions(age, snippets)}

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
${request.regenerationFeedback ? `
HERSCHRIJF-OPDRACHT VAN DE OUDER:
De ouder vond de vorige versie van dit verhaal niet helemaal goed. Ze gaven deze toelichting:
"${request.regenerationFeedback}"
Maak een NIEUWE versie die hier rekening mee houdt: vermijd wat ze niet goed vonden, behoud wat wel werkte, en kies waar nodig een andere invalshoek of toon. Het verhaal moet voelbaar anders zijn dan een eerste poging — anders is het werk verspilling.` : ""}

${snippets["quality-check"]}

ILLUSTRATIE-INSTRUCTIES:
Elke illustratiebeschrijving MOET in het Engels zijn en MOET beginnen met exact deze karakteromschrijving:
"${charDescription}"

Voeg daarna de scène toe. Het karakter moet er in ELKE illustratie IDENTIEK uitzien — zelfde gezicht, zelfde lichaamsbouw, zelfde stijl.

${snippets["side-characters"]}

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
    tag: `${settingLabel} · ${adventureLabel}`,
    endingText: parsed.endingText,
    endingSign: parsed.endingSign,
    endingIllustrationPrompt: parsed.endingIllustrationPrompt || "",
    characterBibleUpdate: parsed.characterBibleUpdate,
    pages: parsed.pages.map((p) => ({
      text: p.text,
      illustrationPrompt: p.illustrationPrompt,
    })),
    textUsage: {
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    },
  };
}

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

/**
 * Content-moderatie op geüploade kindfoto's (LoRA-trainingsset), vóór
 * er iets in de bucket of richting fal.ai gaat. Kindveiligheid gaat hier
 * boven gemak: bij twijfel of bij een technisch probleem keuren we AF
 * (fail-closed) — een geblokkeerde legitieme foto is een ongemak, een
 * doorgelaten foute foto een incident.
 *
 * De foto zelf wordt nooit gelogd; alleen de categorie en een korte
 * interne reden.
 */

export type PhotoModerationVerdict = {
  allowed: boolean;
  /** "ok" | "nudity" | "sexual" | "violence" | "substances" |
   *  "not_a_photo" | "no_child" | "other" | "unsupported_format" |
   *  "parse_error" */
  category: string;
  /** Korte interne uitleg (NL) — alleen voor logging, niet voor de UI. */
  reason: string;
};

/** Media types die de Claude vision-API accepteert. */
const SUPPORTED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const);

type SupportedMediaType =
  typeof SUPPORTED_MEDIA_TYPES extends Set<infer T> ? T : never;

const MODERATION_SYSTEM = `Je bent de kindveiligheids-moderator van een Nederlandse kinderverhalen-app. Ouders uploaden foto's van hun eigen kind om er een AI-tekenpersonage van te maken.

Beoordeel of de foto geschikt is als bronfoto.

GESCHIKT (allowed=true, category="ok") is uitsluitend: een normale, echte foto van een gekleed kind — eventueel samen met gezinsleden of huisdieren — in een alledaagse setting.

ONGESCHIKT (allowed=false) met bijbehorende category:
- "nudity": naakt of gedeeltelijk naakt, ook onschuldig bedoelde bad-, strand-, zwem- of verschoonfoto's
- "sexual": seksueel getinte poses, kleding of context
- "violence": geweld, verwondingen, bloed of wapens
- "substances": drugs-, rook- of alcoholcontext
- "not_a_photo": screenshot, meme, document, tekstafbeelding, tekening of AI-gegenereerd beeld in plaats van een echte foto
- "no_child": geen herkenbaar kind in beeld
- "other": alles wat verder niet in een familie-app thuishoort

BIJ TWIJFEL: allowed=false.

Antwoord UITSLUITEND met JSON, zonder toelichting eromheen:
{"allowed": boolean, "category": "...", "reason": "korte Nederlandse uitleg (max 1 zin, intern)"}`;

/**
 * Beoordeel één foto. Gooit bij API-fouten (caller vangt af en weigert de
 * upload — fail-closed); een onparseerbaar antwoord keurt zelf al af.
 */
export async function moderateChildPhoto(
  base64: string,
  mediaType: string,
): Promise<PhotoModerationVerdict> {
  if (!SUPPORTED_MEDIA_TYPES.has(mediaType as SupportedMediaType)) {
    return {
      allowed: false,
      category: "unsupported_format",
      reason: `media type ${mediaType} niet controleerbaar`,
    };
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 200,
    system: MODERATION_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as SupportedMediaType,
              data: base64,
            },
          },
          { type: "text", text: "Beoordeel deze foto." },
        ],
      },
    ],
  });

  const text =
    message.content[0]?.type === "text" ? message.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      allowed: false,
      category: "parse_error",
      reason: "moderatie-antwoord bevatte geen JSON",
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<PhotoModerationVerdict>;
    return {
      allowed: parsed.allowed === true,
      category: typeof parsed.category === "string" ? parsed.category : "other",
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    };
  } catch {
    return {
      allowed: false,
      category: "parse_error",
      reason: "moderatie-antwoord was geen geldige JSON",
    };
  }
}

/**
 * Vriendelijke, niet-beschuldigende NL-melding voor de ouder bij een
 * afgekeurde foto. `position` is 1-based (volgorde in de picker).
 */
export function photoRejectionMessage(
  position: number,
  category: string,
): string {
  const prefix = `Foto ${position} kunnen we niet gebruiken. `;
  switch (category) {
    case "nudity":
    case "sexual":
      return (
        prefix +
        "Gebruik alleen foto's waarop je kind gewoon gekleed is — dus ook geen bad-, zwem- of verschoonfoto's."
      );
    case "violence":
    case "substances":
    case "other":
      return (
        prefix +
        "Kies een gewone, vrolijke foto van je kind in een alledaagse situatie."
      );
    case "not_a_photo":
      return (
        prefix +
        "Het lijkt geen echte foto te zijn (bijvoorbeeld een screenshot, tekening of AI-plaatje). Gebruik gewone foto's van je kind."
      );
    case "no_child":
      return (
        prefix +
        "We herkennen er geen kind op. Gebruik duidelijke foto's waarop je kind goed zichtbaar is."
      );
    case "unsupported_format":
      return (
        prefix + "Dit bestandsformaat kunnen we niet controleren. Gebruik JPG, PNG of WebP."
      );
    default:
      return prefix + "Probeer een andere foto.";
  }
}

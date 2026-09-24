import { fal } from "@fal-ai/client";

if (process.env.FAL_KEY) {
  fal.config({ credentials: process.env.FAL_KEY });
}

/**
 * Portret + karakterblad van het hoofdpersonage (sinds sept 2026).
 *
 * Het goedgekeurde portret was tot nu toe alleen een plaatje voor de
 * ouder. Nu is het óók de referentie waarmee FLUX.2 het kind op elke
 * verhaalpagina hetzelfde tekent. Eén portret bleek daarvoor te weinig:
 * het gezicht op een portret ten voeten uit is ~60 px groot, waardoor
 * oogkleur en gezichtsvorm wegdreven. Daarom maken we bij goedkeuring een
 * karakterblad: een close-up van het gezicht en een driekwart-aanzicht,
 * beide afgeleid van het goedgekeurde portret. Test 24-09-2026: met deze
 * drie referenties was FLUX.2 op alle pagina's consistent.
 *
 * Kosten (fal.ai, sept 2026): portret ~$0.03, karakterblad ~$0.06,
 * eenmalig per goedkeuring. Per verhaalpagina tellen de referenties als
 * input-megapixels mee (zie pricing.ts).
 */
export const PORTRAIT_MODEL = "fal-ai/flux-2-pro";
export const SHEET_MODEL = "fal-ai/flux-2-pro/edit";

type FalImages = { data?: { images?: { url: string }[] } };

function firstImageUrl(result: unknown): string | null {
  return (result as FalImages).data?.images?.[0]?.url ?? null;
}

/** Wizard-portretprompt; ook gebruikt door de vergelijkingsscripts. */
export function buildPortraitPrompt(
  charDescription: string,
  styleSignature: string,
): string {
  return `${charDescription}, standing in a sunny meadow with flowers, smiling and waving, full body portrait, looking at the viewer. ${styleSignature}`;
}

/**
 * Portret (vierkant, 1024px) met FLUX.2 Pro. Gooit bij fal-fouten, zodat
 * de aanroeper de saldo-alert kan afvuren; null als er geen beeld terugkomt.
 */
export async function generatePortrait(
  prompt: string,
  seed?: number,
): Promise<string | null> {
  const result = await fal.subscribe(PORTRAIT_MODEL, {
    input: {
      prompt,
      image_size: "square_hd",
      seed: seed ?? Math.floor(Math.random() * 9_999_999),
      // Streng (schaal 1-5): dit is een portret van een kind. Zelfde stand
      // als het oude flux-pro/v1.1-pad.
      safety_tolerance: "2",
      output_format: "jpeg",
    },
  });
  return firstImageUrl(result);
}

export type CharacterSheet = { faceUrl: string; bodyUrl: string };

// Let op: noem hier geen attributen die het kind misschien niet heeft
// (bril, sproeten, hoed) — zie de les in illustration-generator.ts. De
// echte kenmerken zitten al in de styleSignature die erachter komt.
const FACE_PROMPT =
  "Close-up portrait of the child in image 1: head and shoulders, facing the viewer, gentle soft smile, eyes clearly visible. Exactly the same face, hair, eye colour, skin tone and clothes as in image 1. Plain soft cream background.";
const BODY_PROMPT =
  "Full-body view of the child in image 1 standing and turned three-quarters to the left, arms relaxed, looking slightly past the viewer. Exactly the same face, hair, eye colour, skin tone and clothes as in image 1. Plain soft cream background.";

/**
 * Karakterblad afleiden van een publiek bereikbaar portret. Beide
 * aanzichten parallel; mislukt er één, dan null (een half blad voegt
 * weinig toe en de aanroeper valt terug op het portret alleen).
 */
export async function generateCharacterSheet(
  portraitUrl: string,
  styleSignature: string,
): Promise<CharacterSheet | null> {
  const [face, body] = await Promise.all([
    fal.subscribe(SHEET_MODEL, {
      input: {
        prompt: `${FACE_PROMPT} ${styleSignature}`,
        image_urls: [portraitUrl],
        image_size: "square_hd",
        seed: Math.floor(Math.random() * 9_999_999),
        safety_tolerance: "2",
        output_format: "jpeg",
      },
    }),
    fal.subscribe(SHEET_MODEL, {
      input: {
        prompt: `${BODY_PROMPT} ${styleSignature}`,
        image_urls: [portraitUrl],
        // 512px volstaat voor houding en kleding, en houdt de input-MP (en
        // dus de prijs per verhaalpagina) laag.
        image_size: "square",
        seed: Math.floor(Math.random() * 9_999_999),
        safety_tolerance: "2",
        output_format: "jpeg",
      },
    }),
  ]);
  const faceUrl = firstImageUrl(face);
  const bodyUrl = firstImageUrl(body);
  if (!faceUrl || !bodyUrl) return null;
  return { faceUrl, bodyUrl };
}

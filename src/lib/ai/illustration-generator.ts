import { fal } from "@fal-ai/client";
import type { GeneratedStory, CharacterBible } from "./story-generator";
import { buildIllustrationStyle } from "./story-generator";
import type { IllustrationModel } from "./pricing";

fal.config({
  credentials: process.env.FAL_KEY!,
});

/**
 * Engine-keuze voor pagina-illustraties.
 *
 * Sinds sept 2026 gaan het goedgekeurde AI-portret van het kind
 * (Child.approvedPreviewUrl) en het karakterblad (Child.referenceSheetUrls:
 * close-up gezicht + driekwart, zie character-sheet.ts) als referentie-
 * beelden mee in élke pagina-call.
 * Het model tekent dan "dit kind" in plaats van een tekstbeschrijving te
 * interpreteren; dat is wat de gezichten over de pagina's heen gelijk
 * houdt. Seed en tekstbeschrijving gaan daarnaast gewoon mee.
 *
 *   flux2          fal-ai/flux-2-pro/edit (default). Zelfde leverancier
 *                  als vanouds, ~$0.07/beeld (1 MP uit + ~2,3 MP referenties).
 *   nano-banana-2  fal-ai/nano-banana-2/edit: Google Gemini 3.1 Flash
 *                  Image, ~$0.08/beeld. Sterkste reputatie voor karakter-
 *                  consistentie, maar strenger op kinderen: een blokkering
 *                  komt als failure terug → retry → partial-flow.
 *   flux1          Kill-switch: altijd het oude tekst+seed-pad
 *                  (fal-ai/flux-pro/v1.1), ook mét portret.
 *
 * Zonder portret, of met een getrainde LoRA, verandert er niets aan het
 * bestaande gedrag. Instelbaar via env ILLUSTRATION_ENGINE.
 */
export type IllustrationEngine = "flux1" | "flux2" | "nano-banana-2";
export type ReferenceEngine = Exclude<IllustrationEngine, "flux1">;

const DEFAULT_ENGINE: IllustrationEngine = "flux2";

export function resolveIllustrationEngine(
  raw: string | undefined = process.env.ILLUSTRATION_ENGINE,
): IllustrationEngine {
  if (raw === "flux1" || raw === "flux2" || raw === "nano-banana-2") {
    return raw;
  }
  if (raw) {
    console.warn(
      `[fal.ai] Onbekende ILLUSTRATION_ENGINE "${raw}", terugval op ${DEFAULT_ENGINE}`,
    );
  }
  return DEFAULT_ENGINE;
}

// Tekst+seed-pad (geen portret / kill-switch): de beste consistentie die
// met prompt + seed alléén haalbaar is.
const TEXT_ONLY_MODEL = "fal-ai/flux-pro/v1.1";
// Swap-in when a child has a trained character LoRA. flux-lora supports
// loading a custom LoRA at inference with an adjustable scale.
const LORA_MODEL = "fal-ai/flux-lora";
// Referentiebeeld-pad: edit-endpoints die één of meer input-beelden
// accepteren ("image 1" in de prompt verwijst naar image_urls[0]).
const REFERENCE_MODELS: Record<ReferenceEngine, string> = {
  flux2: "fal-ai/flux-2-pro/edit",
  "nano-banana-2": "fal-ai/nano-banana-2/edit",
};

// Vaste instructie vóór elke scène op het referentiepad. Edit-modellen
// zijn geneigd het referentiebeeld te "bewerken" (zelfde weide, zelfde
// pose als het portret); wij willen een nieuwe compositie met hetzelfde
// kind erin. Noem hier GEEN concrete attributen (bril, sproeten, hoed):
// alleen het woord "glasses" in deze zin gaf in de test van 23-09-2026
// op 5 van 10 pagina's een bril bij een kind zonder bril. De echte
// kenmerken zitten al in de karakteromschrijving (styleSignature).
// De pyjama-regel is er omdat "same clothes" anders letterlijk wordt
// genomen: bretels en rugzak aan in bed op de afsluitpagina.
function buildReferenceInstruction(refCount: number): string {
  const subject =
    refCount > 1
      ? `The child shown in images 1 to ${refCount} (the same child from different angles) is the main character`
      : "The child in image 1 is the main character";
  const source = refCount > 1 ? "the reference images" : "image 1";
  return `Create a brand-new illustration. ${subject}: keep exactly the same face, hair, skin tone, eyes and the same clothes as in ${source}. If the child is in bed or asleep, draw pyjamas instead of those clothes. Do not add anything to the child that is not visible in ${source}. Do NOT copy the background, pose or composition of ${source}. Scene:`;
}

type LoraConfig = {
  loraUrl: string;
  triggerWord: string;
};

type ReferenceConfig = {
  /**
   * Publiek bereikbare URL(s). [0] = het goedgekeurde portret; daarna
   * optionele extra views van hetzelfde kind (close-up gezicht, driekwart)
   * die het model meer houvast geven. FLUX.2 Pro edit accepteert er
   * maximaal 9, Nano Banana 2 maximaal 14.
   */
  urls: string[];
  engine: ReferenceEngine;
};

export type RenderOptions = {
  lora?: LoraConfig | null;
  reference?: ReferenceConfig | null;
};

type FalImageResponse = {
  data?: {
    images?: { url: string }[];
    has_nsfw_concepts?: boolean[];
  };
};

// Trekt de eerste image-URL uit een fal-respons, maar behandelt een
// safety-flag als failure. Flux' filter geeft bij een trigger een zwart
// frame mét geldige URL terug — zonder deze check kwam dat als "zwarte
// pagina" bij de klant in de reader. Liever null → retry → partial-flow.
function extractImageUrl(result: unknown): string | null {
  const data = (result as FalImageResponse).data;
  const url = data?.images?.[0]?.url;
  if (!url) return null;
  if (data?.has_nsfw_concepts?.[0] === true) {
    console.warn("[fal.ai] NSFW-flag op illustratie — als failure behandeld");
    return null;
  }
  return url;
}

/**
 * Eén illustratie renderen. Padkeuze: LoRA > referentiebeeld > tekst+seed.
 * Geëxporteerd zodat scripts/compare-illustration-engines.ts exact dezelfde
 * code aanroept als productie. Geeft null bij falen of safety-flag.
 */
export async function renderIllustration(
  prompt: string,
  styleSignature: string,
  seed: number,
  opts: RenderOptions = {},
): Promise<string | null> {
  const lora = opts.lora ?? null;
  const reference = opts.reference ?? null;
  try {
    if (lora) {
      // Prompt must include the trigger word to activate the character
      // embedding baked into the LoRA at training time.
      const result = await fal.subscribe(LORA_MODEL, {
        input: {
          prompt: `${lora.triggerWord}, ${prompt}. ${styleSignature}`,
          image_size: "landscape_4_3",
          num_images: 1,
          seed,
          loras: [{ path: lora.loraUrl, scale: 1.0 }],
          num_inference_steps: 28,
          // Safety-checker AAN op het LoRA-pad. Dit pad genereert de
          // gelijkenis van een echt kind, dus een NSFW-vangnet weegt zwaarder
          // dan de kans op een false-positive. extractImageUrl behandelt de
          // has_nsfw_concepts-flag als failure → retry → partial-flow met
          // credit-refund. Beter een zeldzame herkansing dan ongepast beeld
          // met een kindgezicht dat in de bucket belandt.
          enable_safety_checker: true,
        },
      });
      return extractImageUrl(result);
    }

    if (reference) {
      const fullPrompt = `${buildReferenceInstruction(reference.urls.length)} ${prompt}. ${styleSignature}`;
      const input =
        reference.engine === "flux2"
          ? {
              prompt: fullPrompt,
              image_urls: reference.urls,
              image_size: "landscape_4_3",
              seed,
              // Dit endpoint kent 1-5 (v1.1 kent 1-6). 5 = meest
              // permissief; zelfde afweging als op het tekst-pad hieronder.
              safety_tolerance: "5",
              output_format: "jpeg",
            }
          : {
              prompt: fullPrompt,
              image_urls: reference.urls,
              aspect_ratio: "4:3",
              resolution: "1K",
              num_images: 1,
              seed,
              output_format: "jpeg",
              // safety_tolerance bewust op de fal-default: het gaat om
              // kinderscènes, dit vangnet zetten we niet losser.
            };
      const result = await fal.subscribe(REFERENCE_MODELS[reference.engine], {
        input,
      });
      return extractImageUrl(result);
    }

    // Fallback: tekst+seed-pad (geen portret / geen LoRA / kill-switch)
    const result = await fal.subscribe(TEXT_ONLY_MODEL, {
      input: {
        prompt: `${prompt}. ${styleSignature}`,
        image_size: "landscape_4_3",
        num_images: 1,
        seed,
        // 6 = meest permissief. Onze prompt komt van Claude (NL→EN
        // pipeline) en is al inhoudelijk gecontroleerd; false-positives
        // op kinderverhaal-scènes zijn duurder dan het marginale risico.
        safety_tolerance: "6",
      },
    });

    return extractImageUrl(result);
  } catch (err) {
    console.error("[fal.ai] Illustratie mislukt:", err);
    return null;
  }
}

export async function generateIllustrations(
  story: GeneratedStory,
  characterBible: CharacterBible,
  engineOverride?: IllustrationEngine,
): Promise<GeneratedStory> {
  const style = buildIllustrationStyle(characterBible);
  // Use a fixed seed per story for consistency across all illustrations
  const seed = Math.floor(Math.random() * 9_999_999);

  // Use LoRA if the child has a trained one. Falls back to default otherwise.
  const lora: LoraConfig | null =
    characterBible.loraUrl && characterBible.loraTriggerWord
      ? {
          loraUrl: characterBible.loraUrl,
          triggerWord: characterBible.loraTriggerWord,
        }
      : null;

  // Referentiepad alleen zonder LoRA (die is al persoonlijker) en met een
  // goedgekeurd portret. Portret + karakterblad komen server-side uit het
  // kindprofiel (zie stories/route.ts en regenerate/route.ts). Zonder blad
  // (oud profiel, mislukte generatie) doet het portret alleen dienst.
  const engine = engineOverride ?? resolveIllustrationEngine();
  const reference: ReferenceConfig | null =
    !lora && engine !== "flux1" && characterBible.approvedPreviewUrl
      ? {
          urls: [
            characterBible.approvedPreviewUrl,
            ...(characterBible.referenceSheetUrls ?? []),
          ],
          engine,
        }
      : null;

  if (process.env.NODE_ENV === "development") {
    // Child name is PII and shouldn't end up in production runtime logs.
    const pad = lora
      ? `LoRA (trigger: ${lora.triggerWord})`
      : reference
        ? `referentieportret via ${reference.engine}`
        : "tekst+seed (flux-pro/v1.1)";
    console.log(`[fal.ai] Pad: ${pad} voor ${characterBible.childName}`);
  }

  const allPrompts = [
    ...story.pages.map((p) => p.illustrationPrompt),
    story.endingIllustrationPrompt,
  ];
  const opts: RenderOptions = { lora, reference };

  // Generate all illustrations with the same seed for consistency
  let results = await Promise.all(
    allPrompts.map((prompt) => renderIllustration(prompt, style, seed, opts))
  );

  // Retry-pas voor pagina's die null teruggaven — fal.ai-fails zijn vaak
  // transient (rate limit, content-filter-flikker, netwerk). Eén retry
  // met dezelfde prompt+seed is goedkoop en redt het meeste.
  const failedIndices = results
    .map((r, i) => (r === null ? i : -1))
    .filter((i) => i !== -1);
  if (failedIndices.length > 0) {
    console.warn(
      `[fal.ai] ${failedIndices.length}/${results.length} illustraties mislukt — retry`,
    );
    const retryResults = await Promise.all(
      failedIndices.map((i) =>
        renderIllustration(allPrompts[i], style, seed, opts),
      ),
    );
    results = results.slice();
    failedIndices.forEach((origIdx, retryIdx) => {
      results[origIdx] = retryResults[retryIdx];
    });
    const stillFailed = results.filter((r) => r === null).length;
    if (stillFailed > 0) {
      console.error(
        `[fal.ai] ${stillFailed} illustraties NOG mislukt na retry — verhaal wordt partial`,
      );
    }
  }

  const updatedPages = story.pages.map((page, i) => ({
    ...page,
    imageUrl: results[i],
  }));

  // Tel succesvolle (non-null) results — gefaalde images kosten ook
  // niets bij fal.ai dus we tellen ze niet mee in de billing.
  const imageCount = results.filter((r) => r !== null).length;
  const model: IllustrationModel = lora
    ? "lora"
    : reference
      ? reference.engine === "flux2"
        ? "flux2-ref"
        : "nano-banana-2-ref"
      : "pro";

  return {
    ...story,
    pages: updatedPages,
    endingImageUrl: results[results.length - 1],
    imageUsage: { imageCount, model },
  };
}

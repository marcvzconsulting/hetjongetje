import { fal } from "@fal-ai/client";
import type { GeneratedStory, CharacterBible } from "./story-generator";
import { buildIllustrationStyle } from "./story-generator";

fal.config({
  credentials: process.env.FAL_KEY!,
});

// Default model — best character consistency via prompt + seed alone.
const DEFAULT_MODEL = "fal-ai/flux-pro/v1.1";
// Swap-in when a child has a trained character LoRA. flux-lora supports
// loading a custom LoRA at inference with an adjustable scale.
const LORA_MODEL = "fal-ai/flux-lora";

type LoraConfig = {
  loraUrl: string;
  triggerWord: string;
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

async function generateOne(
  prompt: string,
  styleSignature: string,
  seed: number,
  lora: LoraConfig | null
): Promise<string | null> {
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
          // Safety-checker uit — kinderverhalen met door-Claude-opgestelde
          // prompts triggeren regelmatig false-positives (bv. "in bad",
          // "slapen in pyjama"). Liever consistent gedrag dan zwarte vlakken.
          enable_safety_checker: false,
        },
      });
      return extractImageUrl(result);
    }

    // Fallback: default flux-pro path (no LoRA trained yet)
    const result = await fal.subscribe(DEFAULT_MODEL, {
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
  characterBible: CharacterBible
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

  if (lora && process.env.NODE_ENV === "development") {
    // Child name is PII and shouldn't end up in production runtime logs.
    console.log(
      `[fal.ai] Using trained LoRA for ${characterBible.childName} (trigger: ${lora.triggerWord})`
    );
  }

  const allPrompts = [
    ...story.pages.map((p) => p.illustrationPrompt),
    story.endingIllustrationPrompt,
  ];

  // Generate all illustrations with the same seed for consistency
  let results = await Promise.all(
    allPrompts.map((prompt) => generateOne(prompt, style, seed, lora))
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
      failedIndices.map((i) => generateOne(allPrompts[i], style, seed, lora)),
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

  return {
    ...story,
    pages: updatedPages,
    endingImageUrl: results[results.length - 1],
    imageUsage: { imageCount, model: lora ? "lora" : "pro" },
  };
}

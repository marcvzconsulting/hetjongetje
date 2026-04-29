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
        },
      });
      const images = (result as { data?: { images?: { url: string }[] } }).data
        ?.images;
      return images?.[0]?.url ?? null;
    }

    // Fallback: default flux-pro path (no LoRA trained yet)
    const result = await fal.subscribe(DEFAULT_MODEL, {
      input: {
        prompt: `${prompt}. ${styleSignature}`,
        image_size: "landscape_4_3",
        num_images: 1,
        seed,
        safety_tolerance: "2",
      },
    });

    const images = (result as { data?: { images?: { url: string }[] } }).data
      ?.images;
    return images?.[0]?.url ?? null;
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
  const results = await Promise.all(
    allPrompts.map((prompt) => generateOne(prompt, style, seed, lora))
  );

  const updatedPages = story.pages.map((page, i) => ({
    ...page,
    imageUrl: results[i],
  }));

  return {
    ...story,
    pages: updatedPages,
    endingImageUrl: results[results.length - 1],
  };
}

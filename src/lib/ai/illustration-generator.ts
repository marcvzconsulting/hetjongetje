import { fal } from "@fal-ai/client";
import type { GeneratedStory, CharacterBible } from "./story-generator";
import { buildIllustrationStyle } from "./story-generator";

fal.config({
  credentials: process.env.FAL_KEY!,
});

const MODEL = "fal-ai/flux-pro/v1.1"; // Pro model for better character consistency

async function generateOne(
  prompt: string,
  styleSignature: string,
  seed: number
): Promise<string | null> {
  try {
    const result = await fal.subscribe(MODEL, {
      input: {
        prompt: `${prompt}. ${styleSignature}`,
        image_size: "landscape_4_3",
        num_images: 1,
        seed,
        safety_tolerance: "2",
      },
    });

    const images = (result as { data?: { images?: { url: string }[] } }).data?.images;
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

  const allPrompts = [
    ...story.pages.map((p) => p.illustrationPrompt),
    story.endingIllustrationPrompt,
  ];

  // Generate all illustrations with the same seed for consistency
  const results = await Promise.all(
    allPrompts.map((prompt) => generateOne(prompt, style, seed))
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

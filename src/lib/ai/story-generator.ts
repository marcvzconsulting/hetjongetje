import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "./prompts/system";
import { buildStoryRequestPrompt, type StorySetting, type AdventureType, type StoryMood } from "./prompts/story-request";

const anthropic = new Anthropic();

export interface StoryOutput {
  title: string;
  subtitle: string;
  pages: {
    pageNumber: number;
    text: string;
    illustrationPrompt: string;
    illustrationDescription: string;
  }[];
  characterBibleUpdate: string;
}

export interface CharacterBible {
  childName: string;
  age: number;
  gender: string;
  interests: string[];
  pets?: { name: string; type: string; description?: string }[];
  friends?: { name: string; relationship?: string }[];
  favoriteThings?: { color?: string; food?: string; toy?: string; place?: string };
  fears?: string[];
  mainCharacterType: string;
  mainCharacterDescription?: string;
  previousAdventures?: { title: string; setting: string; summary: string }[];
}

export interface StoryRequest {
  setting: StorySetting | string;
  adventureType: AdventureType;
  mood: StoryMood;
  companion?: string;
  specialDetail?: string;
}

export async function generateStory(
  characterBible: CharacterBible,
  request: StoryRequest
): Promise<StoryOutput> {
  const systemPrompt = buildSystemPrompt(characterBible);
  const userPrompt = buildStoryRequestPrompt(request);

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from response (handle possible markdown code blocks)
  let jsonStr = textContent.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }

  const story: StoryOutput = JSON.parse(jsonStr.trim());
  return story;
}

export async function translateToNl(text: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system:
      "You are a translator. Translate the following English text to Dutch. " +
      "Keep it natural and child-friendly. Maintain the same tone and style. " +
      "Only output the translated text, nothing else.",
    messages: [{ role: "user", content: text }],
  });

  const textContent = message.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No translation response");
  }

  return textContent.text;
}

export async function translateStory(story: StoryOutput): Promise<StoryOutput> {
  // Translate title, subtitle, and all page texts in parallel
  const [translatedTitle, translatedSubtitle, ...translatedPages] =
    await Promise.all([
      translateToNl(story.title),
      story.subtitle ? translateToNl(story.subtitle) : Promise.resolve(""),
      ...story.pages.map(async (page) => {
        const translatedText = await translateToNl(page.text);
        const translatedAlt = await translateToNl(page.illustrationDescription);
        return {
          ...page,
          text: translatedText,
          illustrationDescription: translatedAlt,
        };
      }),
    ]);

  return {
    ...story,
    title: translatedTitle,
    subtitle: translatedSubtitle,
    pages: translatedPages,
  };
}

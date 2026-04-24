import type { Spread, IllustrationTheme } from "@/lib/story/spread-types";
import { STORY_SETTINGS } from "@/lib/ai/prompts/story-request";

export interface StoryPageData {
  pageNumber: number;
  text: string;
  illustrationUrl: string | null;
  illustrationDescription: string | null;
  illustrationPrompt: string | null;
}

export interface StoryForSpreads {
  title: string;
  subtitle: string | null;
  setting: string;
  childName: string;
  createdAt: Date;
  pages: StoryPageData[];
}

function formatDateLabel(date: Date): string {
  // "3 mei 2026" → "3 MEI 2026", past bij mono/letterSpacing van het label
  const human = date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `ONS VERHAALTJE · ${human.toUpperCase()}`;
}

const THEMES: IllustrationTheme[] = ["forest", "warm", "soft", "dusk", "sunset", "night"];

export function storyToSpreads(story: StoryForSpreads): Spread[] {
  const spreads: Spread[] = [];
  let pageNumber = 1;
  let themeIndex = 0;

  const settingInfo = STORY_SETTINGS[story.setting as keyof typeof STORY_SETTINGS];
  const tag = settingInfo
    ? settingInfo.label
    : story.subtitle || "Verhaal";

  // Each DB page now has BOTH text and illustration (they belong together).
  // Content pages = pages with text, ending page = page without text (just illustration).
  const contentPages = story.pages.filter((p) => p.text && p.text.trim().length > 0);
  const endingPage = story.pages.find((p) => !p.text || p.text.trim().length === 0);

  // Spread 0: cover — first page's illustration (left) + title (right)
  const firstPage = contentPages[0];
  spreads.push({
    left: {
      type: "illustration",
      description: firstPage?.illustrationDescription || "",
      url: firstPage?.illustrationUrl || undefined,
      colorTheme: THEMES[themeIndex++ % THEMES.length],
    },
    right: {
      type: "title",
      tag,
      title: story.title,
      subtitle: `Een verhaal voor ${story.childName}`,
      dateLabel: formatDateLabel(story.createdAt),
    },
    pageNumbers: [pageNumber++, pageNumber++],
  });

  // Content spreads: text (left) + its own illustration (right)
  // Each page's text and illustration already match because the AI generated them together.
  for (let i = 0; i < contentPages.length; i++) {
    const page = contentPages[i];

    spreads.push({
      left: {
        type: "text",
        content: page.text,
        layout: i === 0 ? "dropcap" : "default",
      },
      right: {
        type: "illustration",
        description: page.illustrationDescription || "",
        url: page.illustrationUrl || undefined,
        colorTheme: THEMES[themeIndex++ % THEMES.length],
      },
      pageNumbers: [pageNumber++, pageNumber++],
    });
  }

  // Ending spread: ending illustration (left) + ending text (right)
  spreads.push({
    left: endingPage
      ? {
          type: "illustration",
          description: endingPage.illustrationDescription || "",
          url: endingPage.illustrationUrl || undefined,
          colorTheme: THEMES[themeIndex % THEMES.length],
        }
      : { type: "text", content: "" },
    right: {
      type: "ending",
      text: `En zo eindigde het avontuur van ${story.childName}.`,
      sign: `Welterusten, lieve ${story.childName}!`,
    },
    pageNumbers: [pageNumber++, pageNumber++],
  });

  return spreads;
}

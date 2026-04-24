import { prisma } from "@/lib/db";
import { storyToSpreads } from "@/lib/story/storyToSpreads";
import type { Spread } from "@/lib/story/spread-types";

export type LandingPreviewSlot = "girl-2" | "girl-4" | "boy-2" | "boy-4";

export const PREVIEW_SLOTS: {
  id: LandingPreviewSlot;
  label: string;
  readTime: string;
}[] = [
  { id: "girl-2", label: "Meisje, 2 jaar", readTime: "~ 1 MIN VOORLEZEN" },
  { id: "girl-4", label: "Meisje, 4 jaar", readTime: "~ 2 MIN VOORLEZEN" },
  { id: "boy-2", label: "Jongen, 2 jaar", readTime: "~ 1 MIN VOORLEZEN" },
  { id: "boy-4", label: "Jongen, 4 jaar", readTime: "~ 2 MIN VOORLEZEN" },
];

export type LandingPreview = {
  slot: LandingPreviewSlot;
  label: string;
  readTime: string;
  /** null when no story is marked for this slot yet. */
  data: {
    title: string;
    childName: string;
    spreads: Spread[];
  } | null;
};

function emptyPreviews(): LandingPreview[] {
  return PREVIEW_SLOTS.map((s) => ({
    slot: s.id,
    label: s.label,
    readTime: s.readTime,
    data: null,
  }));
}

/**
 * Load the 4 landing-page previews. For slots without a marked story the
 * data is null, so the component can fall back to the editorial CSS scene.
 *
 * Defensive: DB/schema errors (e.g. a missing migration during a new
 * deploy) return empty previews instead of crashing the homepage build.
 */
export async function fetchLandingPreviews(): Promise<LandingPreview[]> {
  try {
    const stories = await prisma.story.findMany({
      where: {
        landingPreviewSlot: { not: null },
        status: "ready",
      },
      include: {
        pages: { orderBy: { pageNumber: "asc" } },
        childProfile: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Pick the most recent story per slot (orderBy desc + first wins).
    const bySlot = new Map<LandingPreviewSlot, (typeof stories)[number]>();
    for (const story of stories) {
      const slot = story.landingPreviewSlot as LandingPreviewSlot | null;
      if (!slot) continue;
      if (!bySlot.has(slot)) bySlot.set(slot, story);
    }

    return PREVIEW_SLOTS.map((s) => {
      const story = bySlot.get(s.id);
      if (!story) {
        return { slot: s.id, label: s.label, readTime: s.readTime, data: null };
      }
      const spreads = storyToSpreads({
        title: story.title,
        subtitle: story.subtitle,
        setting: story.setting,
        childName: story.childProfile.name,
        createdAt: story.createdAt,
        pages: story.pages.map((p) => ({
          pageNumber: p.pageNumber,
          text: p.text,
          illustrationUrl: p.illustrationUrl,
          illustrationDescription: p.illustrationDescription,
          illustrationPrompt: p.illustrationPrompt,
        })),
      });
      return {
        slot: s.id,
        label: s.label,
        readTime: s.readTime,
        data: {
          title: story.title,
          childName: story.childProfile.name,
          spreads,
        },
      };
    });
  } catch (err) {
    console.error("[landing-previews] fetch failed, falling back", err);
    return emptyPreviews();
  }
}

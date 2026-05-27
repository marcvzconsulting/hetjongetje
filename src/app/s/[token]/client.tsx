"use client";

import type { Spread } from "@/lib/story/spread-types";
import { BookViewerV3 } from "@/components/v2/story/BookViewerV3";

interface Props {
  storyId: string;
  childName: string;
  storyTitle: string;
  spreads: Spread[];
}

export function PublicStoryReader({
  storyId,
  childName,
  storyTitle,
  spreads,
}: Props) {
  return (
    <main>
      <BookViewerV3
        readOnly
        storyId={storyId}
        childName={childName}
        storyTitle={storyTitle}
        spreads={spreads}
        isFavorite={false}
      />
    </main>
  );
}

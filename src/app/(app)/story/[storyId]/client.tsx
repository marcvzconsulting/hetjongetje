"use client";

import { useState } from "react";
import type { Spread } from "@/lib/story/spread-types";
import { BookViewerV3 } from "@/components/v2/story/BookViewerV3";

interface Props {
  storyId: string;
  childId: string;
  childName: string;
  storyTitle: string;
  spreads: Spread[];
  isFavorite: boolean;
}

export function StoryPageClient({
  storyId,
  childId,
  childName,
  storyTitle,
  spreads,
  isFavorite: initialFavorite,
}: Props) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);

  async function toggleFavorite() {
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });
    } catch {
      setIsFavorite(!newValue);
    }
  }

  return (
    <BookViewerV3
      spreads={spreads}
      childName={childName}
      childId={childId}
      storyId={storyId}
      storyTitle={storyTitle}
      isFavorite={isFavorite}
      onToggleFavorite={toggleFavorite}
    />
  );
}

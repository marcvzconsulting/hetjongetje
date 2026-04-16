"use client";

import { useState } from "react";
import BookViewer, { type Spread } from "@/components/story/BookViewer";

interface Props {
  storyId: string;
  childId: string;
  childName: string;
  spreads: Spread[];
  isFavorite: boolean;
}

export function StoryPageClient({ storyId, childId, childName, spreads, isFavorite: initialFavorite }: Props) {
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
    <BookViewer
      spreads={spreads}
      childName={childName}
      childId={childId}
      storyId={storyId}
      isFavorite={isFavorite}
      onToggleFavorite={toggleFavorite}
    />
  );
}

"use client";

import { useState } from "react";
import type { Spread } from "@/lib/story/spread-types";
import { BookViewerV3 } from "@/components/v2/story/BookViewerV3";
import {
  StoryAudioPlayer,
  type StoryAudioEntry,
} from "@/components/v2/story/StoryAudioPlayer";

interface Props {
  storyId: string;
  childName: string;
  storyTitle: string;
  spreads: Spread[];
  /** Al gegenereerde voorlees-audio's. De deelpagina speelt alleen af —
   *  genereren kan uitsluitend de eigenaar. */
  audios: StoryAudioEntry[];
}

export function PublicStoryReader({
  storyId,
  childName,
  storyTitle,
  spreads,
  audios,
}: Props) {
  const [listenOpen, setListenOpen] = useState(false);
  const hasAudio = audios.length > 0;

  return (
    <main>
      <BookViewerV3
        readOnly
        storyId={storyId}
        childName={childName}
        storyTitle={storyTitle}
        spreads={spreads}
        isFavorite={false}
        onListenClick={hasAudio ? () => setListenOpen(true) : undefined}
        hasAudio={hasAudio}
      />
      {listenOpen && (
        <StoryAudioPlayer
          storyId={storyId}
          audios={audios}
          canGenerate={false}
          onClose={() => setListenOpen(false)}
        />
      )}
    </main>
  );
}

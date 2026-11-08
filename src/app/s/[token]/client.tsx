"use client";

import type { Spread } from "@/lib/story/spread-types";
import { BookViewerV3 } from "@/components/v2/story/BookViewerV3";
import { BookViewerV4 } from "@/components/v2/story/BookViewerV4";
import type { ReaderSettings } from "@/lib/reader/night";
import type { OverflowMode, ReaderVersion } from "@/lib/reader/version";

interface Props {
  storyId: string;
  childName: string;
  storyTitle: string;
  spreads: Spread[];
  /** "v3" = de vorige lezer (terugvaloptie). */
  readerVersion: ReaderVersion;
  overflowMode: OverflowMode;
  readerSettings: ReaderSettings;
  serverMinutes: number;
}

export function PublicStoryReader({
  storyId,
  childName,
  storyTitle,
  spreads,
  readerVersion,
  overflowMode,
  readerSettings,
  serverMinutes,
}: Props) {
  return (
    <main>
      {readerVersion === "v4" ? (
        <BookViewerV4
          key={storyId}
          readOnly
          storyId={storyId}
          childName={childName}
          storyTitle={storyTitle}
          spreads={spreads}
          isFavorite={false}
          readerSettings={readerSettings}
          serverMinutes={serverMinutes}
          overflowMode={overflowMode}
        />
      ) : (
        <BookViewerV3
          readOnly
          storyId={storyId}
          childName={childName}
          storyTitle={storyTitle}
          spreads={spreads}
          isFavorite={false}
        />
      )}
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Spread } from "@/lib/story/spread-types";
import { spreadsToPageNumbers } from "@/lib/story/spread-audio";
import {
  BookViewerV3,
  type WordHighlight,
} from "@/components/v2/story/BookViewerV3";
import {
  StoryAudioPlayer,
  type StoryAudioEntry,
} from "@/components/v2/story/StoryAudioPlayer";

interface Props {
  storyId: string;
  childName: string;
  storyTitle: string;
  spreads: Spread[];
  /** Al gegenereerde voorlees-audio's (per stem per pagina). De
   *  deelpagina speelt alleen af — genereren kan uitsluitend de
   *  eigenaar. Een stem is hier pas kiesbaar als ALLE pagina's voor die
   *  stem audio hebben. */
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
  const [currentSpreadIdx, setCurrentSpreadIdx] = useState(0);
  const [wordHighlight, setWordHighlight] = useState<WordHighlight | null>(
    null,
  );

  // Per spread het voorleesbare DB-paginanummer (null = titel/einde).
  const spreadPageNumbers = useMemo(
    () => spreadsToPageNumbers(spreads),
    [spreads],
  );
  const pageNumbers = useMemo(
    () => spreadPageNumbers.filter((p): p is number => p !== null),
    [spreadPageNumbers],
  );
  const currentPageNumber = spreadPageNumbers[currentSpreadIdx] ?? null;
  const afterLastPage =
    currentPageNumber === null &&
    spreadPageNumbers.slice(currentSpreadIdx + 1).every((p) => p === null) &&
    pageNumbers.length > 0;

  // De luisterknop tonen zodra minstens één stem compleet is; de picker
  // zelf dimt onvolledige stemmen ("Nog niet gegenereerd").
  const hasCompleteVoice = useMemo(() => {
    const byVoice = new Map<string, Set<number>>();
    for (const a of audios) {
      const set = byVoice.get(a.voiceKey) ?? new Set<number>();
      set.add(a.pageNumber);
      byVoice.set(a.voiceKey, set);
    }
    if (pageNumbers.length === 0) return false;
    for (const set of byVoice.values()) {
      if (pageNumbers.every((p) => set.has(p))) return true;
    }
    return false;
  }, [audios, pageNumbers]);

  return (
    <main>
      <BookViewerV3
        readOnly
        storyId={storyId}
        childName={childName}
        storyTitle={storyTitle}
        spreads={spreads}
        isFavorite={false}
        onListenClick={hasCompleteVoice ? () => setListenOpen(true) : undefined}
        hasAudio={hasCompleteVoice}
        onSpreadChange={setCurrentSpreadIdx}
        wordHighlight={listenOpen ? wordHighlight : null}
      />
      {listenOpen && (
        <StoryAudioPlayer
          storyId={storyId}
          audios={audios}
          canGenerate={false}
          currentPageNumber={currentPageNumber}
          pageNumbers={pageNumbers}
          afterLastPage={afterLastPage}
          onClose={() => {
            setListenOpen(false);
            setWordHighlight(null);
          }}
          onHighlightChange={setWordHighlight}
        />
      )}
    </main>
  );
}

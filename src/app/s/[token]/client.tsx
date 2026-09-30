"use client";

import { useMemo, useState } from "react";
import type { Spread } from "@/lib/story/spread-types";
import {
  endingNarrationPageNumber,
  spreadsToPageNumbers,
} from "@/lib/story/spread-audio";
import {
  BookViewerV3,
  type WordHighlight,
} from "@/components/v2/story/BookViewerV3";
import { BookViewerV4 } from "@/components/v2/story/BookViewerV4";
import {
  StoryAudioPlayer,
  type StoryAudioEntry,
} from "@/components/v2/story/StoryAudioPlayer";
import type { ReaderSettings } from "@/lib/reader/night";
import type { OverflowMode, ReaderVersion } from "@/lib/reader/version";

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
  audios,
  readerVersion,
  overflowMode,
  readerSettings,
  serverMinutes,
}: Props) {
  const v4 = readerVersion === "v4";
  const [listenSlot, setListenSlot] = useState<HTMLElement | null>(null);
  const [listenOpen, setListenOpen] = useState(false);
  // Nachtstand van de lezer (alleen V4 meldt die); de stemkiezer kleurt mee.
  const [night, setNight] = useState(false);
  const [currentSpreadIdx, setCurrentSpreadIdx] = useState(0);
  const [wordHighlight, setWordHighlight] = useState<WordHighlight | null>(
    null,
  );

  // Per spread het voorlees-item: 0 = titel, daarna de tekstpagina's,
  // als laatste de eindpagina (null = spread zonder audio).
  const spreadPageNumbers = useMemo(
    () => spreadsToPageNumbers(spreads),
    [spreads],
  );
  const pageNumbers = useMemo(
    () => spreadPageNumbers.filter((p): p is number => p !== null),
    [spreadPageNumbers],
  );
  const endingPageNumber = useMemo(
    () => endingNarrationPageNumber(spreads),
    [spreads],
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
      {v4 ? (
        <BookViewerV4
          key={storyId}
          readOnly
          storyId={storyId}
          childName={childName}
          storyTitle={storyTitle}
          spreads={spreads}
          isFavorite={false}
          onListenClick={
            hasCompleteVoice ? () => setListenOpen(true) : undefined
          }
          hasAudio={hasCompleteVoice}
          listenOpen={listenOpen}
          onListenSlot={setListenSlot}
          onSpreadChange={setCurrentSpreadIdx}
          wordHighlight={listenOpen ? wordHighlight : null}
          readerSettings={readerSettings}
          serverMinutes={serverMinutes}
          overflowMode={overflowMode}
          onNightChange={setNight}
        />
      ) : (
        <BookViewerV3
          readOnly
          storyId={storyId}
          childName={childName}
          storyTitle={storyTitle}
          spreads={spreads}
          isFavorite={false}
          onListenClick={
            hasCompleteVoice ? () => setListenOpen(true) : undefined
          }
          hasAudio={hasCompleteVoice}
          onSpreadChange={setCurrentSpreadIdx}
          wordHighlight={listenOpen ? wordHighlight : null}
        />
      )}
      {listenOpen && (
        <StoryAudioPlayer
          variant={v4 ? "pill" : "bar"}
          portalTarget={v4 ? listenSlot : null}
          night={night}
          storyId={storyId}
          audios={audios}
          canGenerate={false}
          currentPageNumber={currentPageNumber}
          pageNumbers={pageNumbers}
          endingPageNumber={endingPageNumber}
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

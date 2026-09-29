"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";
import {
  expandUnits,
  type BaseUnit,
  type DisplayUnit,
} from "@/lib/story/reader-units";
import { minutesOfDay } from "@/lib/reader/night";
import type { OverflowMode } from "@/lib/reader/version";
import { computeLayout, type ReaderLayout } from "./layout";
import { measureStory } from "./measure";

/** Volgt een media query; `serverValue` geldt tijdens server-rendering. */
export function useMediaQuery(query: string, serverValue: boolean): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

function subscribeClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 30_000);
  // Na slaapstand of tabwissel direct bijwerken, niet pas na 30 s.
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * Minuten sinds middernacht op de klok van het toestel. De server kent
 * die klok niet en rekent met `serverMinutes` (Nederlandse tijd).
 */
export function useMinuteClock(serverMinutes: number): number {
  return useSyncExternalStore(
    subscribeClock,
    () => minutesOfDay(new Date()),
    () => serverMinutes,
  );
}

const NIGHT_KEY = "ov_reader_night";
const NIGHT_EVENT = "ov-reader-night";

function subscribeNightOverride(onChange: () => void) {
  window.addEventListener(NIGHT_EVENT, onChange);
  return () => window.removeEventListener(NIGHT_EVENT, onChange);
}

function readNightOverride(): string | null {
  try {
    return window.sessionStorage.getItem(NIGHT_KEY);
  } catch {
    return null;
  }
}

/**
 * Handmatige nachtmodus-keuze, geldig voor deze sessie (sessionStorage).
 * Null = geen keuze gemaakt, het automatische tijdvak beslist.
 */
export function useNightOverride(): [
  boolean | null,
  (value: boolean) => void,
] {
  const raw = useSyncExternalStore(
    subscribeNightOverride,
    readNightOverride,
    () => null,
  );
  const set = useCallback((value: boolean) => {
    try {
      window.sessionStorage.setItem(NIGHT_KEY, value ? "1" : "0");
    } catch {
      // Opslag geblokkeerd: de keuze geldt dan alleen tot de volgende
      // weergave, de lezer blijft werken.
    }
    window.dispatchEvent(new Event(NIGHT_EVENT));
  }, []);
  return [raw === null ? null : raw === "1", set];
}

export type ReaderView = {
  layout: ReaderLayout;
  units: DisplayUnit[];
  /** Aandeel van de hoogte voor de illustratie in de staande lay-out. */
  imageShare: number;
};

/**
 * Lay-out en pagina-indeling voor de huidige afmetingen van de lezer.
 * Null tot er gemeten is (server-rendering en de eerste weergave):
 * oriëntatie en tekstmaat zijn pas in de browser bekend.
 */
export function useReaderView(
  rootRef: RefObject<HTMLElement | null>,
  baseUnits: BaseUnit[],
  mode: OverflowMode,
  listening: boolean,
): ReaderView | null {
  const [view, setView] = useState<ReaderView | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    let disposed = false;

    const measure = () => {
      if (disposed) return;
      const rect = root.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const layout = computeLayout(rect.width, rect.height, listening);
      const { layouts, imageShare } = measureStory(
        root,
        baseUnits,
        layout,
        mode,
      );
      setView({
        layout,
        units: expandUnits(baseUnits, layouts),
        imageShare,
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    // De observer meldt zich direct na `observe` een eerste keer: dat is
    // de eerste meting. Daarna bij elke verandering van afmeting.
    const observer = new ResizeObserver(schedule);
    observer.observe(root);
    // Meten vóór de lettertypes geladen zijn geeft de verkeerde maat.
    void document.fonts?.ready.then(schedule);

    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [rootRef, baseUnits, mode, listening]);

  return view;
}

/**
 * True zodra het element kinderen heeft (het voorleespaneel is erin
 * gezet). Kijkt naar de DOM zelf, zodat het ook werkt terwijl het
 * element nog verborgen is.
 */
export function useHasChildren(el: HTMLElement | null): boolean {
  const [has, setHas] = useState(false);
  useEffect(() => {
    if (!el) return;
    const observer = new MutationObserver(() => {
      setHas(el.childElementCount > 0);
    });
    observer.observe(el, { childList: true });
    return () => observer.disconnect();
  }, [el]);
  return has;
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

// —— Types ————————————————————————————————————————————————————————————

export type PageType =
  | { type: "title"; title: string; subtitle?: string; tag: string; meta?: string }
  | { type: "text"; content: string; layout?: "default" | "dropcap" }
  | { type: "illustration"; description: string; url?: string; colorTheme?: IllustrationTheme }
  | { type: "ending"; text: string; sign?: string };

export type IllustrationTheme = "forest" | "warm" | "soft" | "dusk" | "night" | "sunset";

export interface Spread {
  left: PageType;
  right: PageType;
  fullSpread?: boolean;  // true = left page fills entire spread
  pageNumbers?: [number, number];
}

export interface BookViewerProps {
  spreads: Spread[];
  childName?: string;
  childId: string;
  storyId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

// —— Illustration themes — inline styles (Tailwind v4 purges dynamic classes) ——

const ILLUS_THEMES: Record<IllustrationTheme, { bg: string; glow: string }> = {
  forest:  { bg: "linear-gradient(145deg,#EAF4D8 0%,#D4ECC4 55%,#C4E4B4 100%)", glow: "rgba(200,240,160,.45)" },
  warm:    { bg: "linear-gradient(135deg,#F8EAD0 0%,#F0D8A8 50%,#E8CC98 100%)", glow: "rgba(255,224,160,.40)" },
  soft:    { bg: "linear-gradient(145deg,#FCF0E4 0%,#F4E0C8 55%,#ECD4B4 100%)", glow: "rgba(255,230,200,.45)" },
  dusk:    { bg: "linear-gradient(145deg,#EEE8DC 0%,#E4DCCC 50%,#D8D0BC 100%)", glow: "rgba(240,220,180,.50)" },
  night:   { bg: "linear-gradient(145deg,#E4E8F8 0%,#D4DCEE 55%,#C8D4E8 100%)", glow: "rgba(200,220,255,.40)" },
  sunset:  { bg: "linear-gradient(145deg,#F8EACC 0%,#F0D4A0 40%,#E8C890 100%)", glow: "rgba(255,210,140,.40)" },
};

// —— Blob shapes (organic feel per page) ——————————————————————————————

const BLOB_SHAPES = [
  "rounded-[60%_40%_55%_45%/45%_55%_45%_55%]",
  "rounded-[40%_60%_50%_50%/55%_45%_55%_45%]",
  "rounded-[50%_50%_40%_60%/60%_40%_60%_40%]",
  "rounded-[45%_55%_60%_40%/50%_60%_40%_50%]",
] as const;

// —— Sub-components ——————————————————————————————————————————————————

function TitlePage({ page, isRight }: { page: Extract<PageType, { type: "title" }>; isRight: boolean }) {
  return (
    <div className={`flex flex-col justify-center h-full pb-6 ${isRight ? "items-end text-right" : ""}`}>
      <span
        className="inline-block text-[0.67rem] font-bold uppercase tracking-[0.09em] px-3 py-1 rounded-2xl mb-3 w-fit"
        style={{ color: "#9A4E28", background: "rgba(200,105,60,.1)" }}
      >
        {page.tag}
      </span>
      <h1
        className="font-serif text-[clamp(1.4rem,3.5vw,2.1rem)] font-bold leading-[1.18] mb-1"
        style={{ color: "#C8693C" }}
      >
        {page.title}
      </h1>
      <div className="w-9 h-0.5 rounded-full my-3" style={{ background: "#C8903A" }} />
      {page.subtitle && (
        <p className="font-serif text-base italic" style={{ color: "#6B4030" }}>
          {page.subtitle}
        </p>
      )}
      {page.meta && (
        <p className="text-[0.72rem] mt-2" style={{ color: "#A07060" }}>
          {page.meta}
        </p>
      )}
    </div>
  );
}

function TextPage({ page, spreadIndex }: { page: Extract<PageType, { type: "text" }>; spreadIndex: number }) {
  const isDropcap = page.layout === "dropcap" || spreadIndex === 0;
  const paragraphs = page.content.split(/\n\n+/).filter(Boolean);

  return (
    <div
      className="font-serif leading-[1.95] text-[1.05rem] sm:text-[1.15rem]"
      style={{ color: "#3A2418" }}
    >
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={`${i > 0 ? "mt-3" : ""} ${isDropcap && i === 0 ? "first-letter-terra" : ""}`}
        >
          {p}
        </p>
      ))}
    </div>
  );
}

function IllustrationPage({
  page,
  blobIndex,
  full = false,
}: {
  page: Extract<PageType, { type: "illustration" }>;
  blobIndex: number;
  full?: boolean;
  float?: "left" | "right";
}) {
  const theme = ILLUS_THEMES[page.colorTheme ?? "forest"];
  const blob = BLOB_SHAPES[blobIndex % BLOB_SHAPES.length];

  const inner = (
    <div
      className="relative flex flex-col items-center justify-center text-center p-3 overflow-hidden w-full h-full"
      style={{ background: theme.bg }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 60% 30%, ${theme.glow} 0%, transparent 60%)`,
        }}
      />
      {page.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.url}
          alt={page.description}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="relative flex flex-col items-center gap-1">
          <span className="text-2xl opacity-30">🎨</span>
          <span
            className="text-[0.6rem] font-bold uppercase tracking-widest"
            style={{ color: "rgba(107,64,48,.42)" }}
          >
            Aquarel illustratie
          </span>
          <p
            className="text-[0.72rem] italic leading-[1.4] max-w-[180px]"
            style={{ color: "#6B4030" }}
          >
            {page.description}
          </p>
        </div>
      )}
    </div>
  );

  // Fill the entire page area
  return <div className="absolute inset-0" style={{ background: theme.bg }}>{inner}</div>;
}

function EndingPage({ page }: { page: Extract<PageType, { type: "ending" }> }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-6">
      <motion.span
        className="text-4xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        🌙
      </motion.span>
      <p
        className="font-serif text-[0.9rem] italic leading-[1.8]"
        style={{ color: "#6B4030" }}
      >
        {page.text}
      </p>
      {page.sign && (
        <p
          className="font-serif text-[1.15rem] font-bold mt-1"
          style={{ color: "#C8693C" }}
        >
          {page.sign}
        </p>
      )}
      <p className="font-serif text-[0.7rem] italic opacity-70" style={{ color: "#A07060" }}>
        ~ einde ~
      </p>
    </div>
  );
}

// —— Page renderer ———————————————————————————————————————————————————

function PageRenderer({
  page,
  isRight,
  spreadIndex,
  blobIndex,
}: {
  page: PageType;
  isRight: boolean;
  spreadIndex: number;
  blobIndex: number;
}) {
  switch (page.type) {
    case "title":
      return <TitlePage page={page} isRight={isRight} />;
    case "text":
      return <TextPage page={page} spreadIndex={spreadIndex} />;
    case "illustration":
      return <IllustrationPage page={page} blobIndex={blobIndex} full />;
    case "ending":
      return <EndingPage page={page} />;
    default:
      return null;
  }
}

// —— Page backgrounds ————————————————————————————————————————————————

const PAGE_BACKGROUNDS: Record<string, string> = {
  title:        "#FDF2E6",
  illustration: "#E8EDD4",
  ending:       "#F2EEF8",
  text:         "#FDF6EE",
};

function pageBackground(page: PageType): string {
  if (page.type === "illustration") {
    const theme = (page as Extract<PageType, { type: "illustration" }>).colorTheme ?? "forest";
    const tints: Record<IllustrationTheme, string> = {
      forest: "#DFEaCE", warm: "#F0E4CC", soft: "#EEE2D2",
      dusk: "#E8E2D4", night: "#E0E4F0", sunset: "#EEE0C0",
    };
    return tints[theme];
  }
  return PAGE_BACKGROUNDS[page.type] ?? "#FDF6EE";
}

// —— Main BookViewer ————————————————————————————————————————————————

export default function BookViewer({
  spreads,
  childName,
  childId,
  storyId,
  isFavorite,
  onToggleFavorite,
}: BookViewerProps) {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  const canPrev = current > 0;
  const canNext = current < spreads.length - 1;

  function go(n: number) {
    setDirection(n > current ? 1 : -1);
    setCurrent(n);
  }

  // Swipe handling
  const [touchStart, setTouchStart] = useState<number | null>(null);
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStart(e.touches[0].clientX);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStart === null) return;
    const diff = touchStart - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && canNext) go(current + 1);
      else if (diff < 0 && canPrev) go(current - 1);
    }
    setTouchStart(null);
  }

  async function saveTitle() {
    if (!editTitle.trim()) { setIsEditingTitle(false); return; }
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      // Update the title page in the spread
      const titleSpread = spreads[0];
      if (titleSpread.left.type === "title") {
        titleSpread.left.title = editTitle.trim();
      }
    } catch { /* ignore */ }
    setIsEditingTitle(false);
  }

  const spread = spreads[current];
  const isLastSpread = current === spreads.length - 1;

  const variants = {
    enter:  (d: number) => ({ opacity: 0, x: d > 0 ? 30 : -30 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -30 : 30 }),
  };

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: "#F5EDE0" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors hover:bg-amber-100/60"
          style={{ color: "#6B4030" }}
        >
          📚 Bibliotheek
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleFavorite}
            className="text-lg transition-transform hover:scale-110"
            title={isFavorite ? "Uit bibliotheek verwijderen" : "Opslaan in bibliotheek"}
          >
            {isFavorite ? "❤️" : "🤍"}
          </button>
          <Link
            href={`/generate/${childId}`}
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: "#C8693C" }}
          >
            + Nieuw verhaal
          </Link>
        </div>
      </div>

      {/* Book area */}
      <div
        className="flex-1 flex items-center justify-center px-2 sm:px-4 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="relative flex w-full max-w-5xl overflow-hidden"
          style={{
            borderRadius: "3px 14px 14px 3px",
            boxShadow: "-3px 3px 16px rgba(58,36,24,.15), 4px 4px 16px rgba(58,36,24,.10)",
            maxHeight: "calc(100vh - 120px)",
          }}
        >
          {/* Spine shadow (hide on full spread) */}
          {!spread.fullSpread && (
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{
                left: "calc(50% - 3px)",
                width: 6,
                background: "linear-gradient(90deg,rgba(58,36,24,.14),rgba(58,36,24,.03),rgba(58,36,24,.10))",
              }}
            />
          )}

          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="flex flex-1"
            >
              {spread.fullSpread ? (
                /* Full spread — single page fills both sides */
                <div
                  className="flex-1 relative min-h-[50vh] sm:min-h-[60vh] overflow-hidden"
                  style={{ borderRadius: "3px 14px 14px 3px" }}
                >
                  <PageRenderer
                    page={spread.left}
                    isRight={false}
                    spreadIndex={current}
                    blobIndex={current * 2}
                  />
                </div>
              ) : (
              <>
              {/* Left page */}
              <div
                className="flex-1 relative min-h-[50vh] sm:min-h-[60vh] p-5 sm:p-6 overflow-hidden"
                style={{
                  background: pageBackground(spread.left),
                  borderRadius: "3px 0 0 3px",
                  borderRight: "1px solid rgba(58,36,24,.07)",
                }}
              >
                <PageRenderer
                  page={spread.left}
                  isRight={false}
                  spreadIndex={current}
                  blobIndex={current * 2}
                />
                {spread.pageNumbers && (
                  <span
                    className="absolute bottom-2 left-5 text-[0.62rem] tracking-wider"
                    style={{ color: "rgba(58,36,24,.28)", fontFamily: "Georgia, serif" }}
                  >
                    {spread.pageNumbers[0]}
                  </span>
                )}
              </div>

              {/* Right page */}
              <div
                className="flex-1 relative min-h-[50vh] sm:min-h-[60vh] p-5 sm:p-6 overflow-hidden"
                style={{
                  background: pageBackground(spread.right),
                  borderRadius: "0 14px 14px 0",
                }}
              >
                <PageRenderer
                  page={spread.right}
                  isRight={true}
                  spreadIndex={current}
                  blobIndex={current * 2 + 1}
                />
                {spread.pageNumbers && (
                  <span
                    className="absolute bottom-2 right-5 text-[0.62rem] tracking-wider"
                    style={{ color: "rgba(58,36,24,.28)", fontFamily: "Georgia, serif" }}
                  >
                    {spread.pageNumbers[1]}
                  </span>
                )}
              </div>
              </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="flex flex-col items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => go(current - 1)}
            disabled={!canPrev}
            className="w-9 h-9 rounded-full border flex items-center justify-center text-lg transition-all disabled:opacity-25"
            style={{ borderColor: "#EDD9BC", background: "#FFFDF8", color: "#6B4030" }}
          >
            ‹
          </button>

          <div className="flex gap-1.5">
            {spreads.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === current ? "#C8693C" : "#EDD9BC",
                  transform: i === current ? "scale(1.25)" : "scale(1)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => go(current + 1)}
            disabled={!canNext}
            className="w-9 h-9 rounded-full border flex items-center justify-center text-lg transition-all disabled:opacity-25"
            style={{ borderColor: "#EDD9BC", background: "#FFFDF8", color: "#6B4030" }}
          >
            ›
          </button>
        </div>

        {/* End actions */}
        {isLastSpread && (
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={onToggleFavorite}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ borderColor: "#EDD9BC", background: isFavorite ? "#FDE8E8" : "#F5E8D4", color: "#6B4030" }}
            >
              {isFavorite ? "❤️ Opgeslagen" : "🤍 Opslaan in bibliotheek"}
            </button>
            <Link
              href={`/generate/${childId}`}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-bold transition-all hover:scale-[1.02]"
              style={{ borderColor: "#EDD9BC", background: "#F5E8D4", color: "#6B4030" }}
            >
              ✨ Nieuw verhaal
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

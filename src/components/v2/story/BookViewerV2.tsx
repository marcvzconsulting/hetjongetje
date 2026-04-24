"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { V2 } from "@/components/v2/tokens";
import { Logo, IconV2 } from "@/components/v2";
import { SignOutButtonV2 } from "@/components/v2/app/SignOutButton";
import type { Spread, PageType } from "@/lib/story/spread-types";

type Props = {
  spreads: Spread[];
  childName: string;
  childId: string;
  storyId: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  storyTitle: string;
};

export function BookViewerV2({
  spreads,
  childName,
  childId,
  storyId,
  isFavorite,
  onToggleFavorite,
  storyTitle,
}: Props) {
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Remember position per story
  useEffect(() => {
    const key = `ov_reader_${storyId}`;
    const saved = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= 0 && n < spreads.length) setIdx(n);
    }
  }, [storyId, spreads.length]);

  useEffect(() => {
    const key = `ov_reader_${storyId}`;
    if (typeof window !== "undefined")
      localStorage.setItem(key, String(idx));
  }, [idx, storyId]);

  const go = (d: 1 | -1) => {
    const next = idx + d;
    if (next < 0 || next >= spreads.length) return;
    setDirection(d);
    setIdx(next);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, spreads.length]);

  const spread = spreads[idx];

  return (
    <div
      className="v2-root"
      style={{
        minHeight: "100vh",
        background: V2.paperDeep,
        color: V2.ink,
        fontFamily: V2.body,
      }}
    >
      {/* Top bar */}
      <nav
        style={{
          padding: "16px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: `1px solid ${V2.paperShade}`,
          background: V2.paper,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link href="/dashboard" aria-label="Terug naar bibliotheek">
            <Logo size={18} />
          </Link>
          <Link
            href="/dashboard"
            style={{
              fontFamily: V2.ui,
              fontSize: 13,
              color: V2.inkMute,
              textDecoration: "none",
            }}
          >
            ← Plankje
          </Link>
        </div>
        <div
          style={{
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 18,
            color: V2.ink,
            maxWidth: 480,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {storyTitle}
        </div>
        <div
          style={{
            display: "flex",
            gap: 20,
            alignItems: "center",
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
          }}
        >
          <button
            type="button"
            onClick={onToggleFavorite}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: isFavorite ? V2.heart : V2.inkMute,
              fontFamily: V2.ui,
              fontSize: 13,
              fontWeight: isFavorite ? 500 : 400,
              padding: 0,
            }}
          >
            <IconV2
              name="heart"
              size={15}
              color={isFavorite ? V2.heart : V2.inkMute}
              filled={isFavorite}
            />
            {isFavorite ? "Favoriet" : "Favoriet maken"}
          </button>
          <Link
            href={`/generate/${childId}`}
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            Nieuw verhaal
          </Link>
          <SignOutButtonV2 />
        </div>
      </nav>

      {/* Book stage */}
      <div
        style={{
          padding: "48px 40px 24px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <BookFrame>
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={idx}
              custom={direction}
              initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              style={{ display: "contents" }}
            >
              {spread.fullSpread ? (
                <FullBleedPage page={spread.left} childName={childName} />
              ) : (
                <>
                  <Page side="left" page={spread.left} childName={childName} />
                  <Page side="right" page={spread.right} childName={childName} />
                </>
              )}
            </motion.div>
          </AnimatePresence>
          {/* spine shadow */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: 0,
              bottom: 0,
              width: 40,
              transform: "translateX(-50%)",
              background: `linear-gradient(to right, transparent 0%, rgba(0,0,0,0.12) 48%, rgba(0,0,0,0.12) 52%, transparent 100%)`,
              pointerEvents: "none",
              zIndex: 3,
            }}
          />
        </BookFrame>
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 32,
          paddingBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <NavButton
          direction="prev"
          disabled={idx === 0}
          onClick={() => go(-1)}
        />
        <PageDots
          count={spreads.length}
          current={idx}
          onPick={(i) => {
            setDirection(i > idx ? 1 : -1);
            setIdx(i);
          }}
        />
        <NavButton
          direction="next"
          disabled={idx === spreads.length - 1}
          onClick={() => go(1)}
        />
      </div>

      <div
        style={{
          textAlign: "center",
          paddingBottom: 32,
          fontFamily: V2.mono,
          fontSize: 11,
          color: V2.inkMute,
          letterSpacing: "0.12em",
        }}
      >
        SPREAD {idx + 1} / {spreads.length} · GEBRUIK ← →
      </div>
    </div>
  );
}

// ── Book frame ──────────────────────────────────────────────────

function BookFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        maxWidth: 920,
        aspectRatio: "920 / 600",
        boxShadow:
          "0 30px 80px rgba(20,20,46,0.18), 0 10px 30px rgba(20,20,46,0.1)",
        background: V2.paper,
      }}
    >
      {children}
    </div>
  );
}

function Page({
  side,
  page,
  childName,
}: {
  side: "left" | "right";
  page: PageType;
  childName: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        [side]: 0,
        width: "50%",
        height: "100%",
        background: V2.paper,
        overflow: "hidden",
      }}
    >
      <PageContent page={page} side={side} childName={childName} />
    </div>
  );
}

function FullBleedPage({
  page,
  childName,
}: {
  page: PageType;
  childName: string;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: V2.paper,
        overflow: "hidden",
      }}
    >
      <PageContent page={page} side="full" childName={childName} />
    </div>
  );
}

function PageContent({
  page,
  side,
  childName,
}: {
  page: PageType;
  side: "left" | "right" | "full";
  childName: string;
}) {
  if (page.type === "title") {
    return <TitlePage page={page} />;
  }
  if (page.type === "ending") {
    return <EndingPage page={page} />;
  }
  if (page.type === "illustration") {
    return <IllustrationPage page={page} childName={childName} full={side === "full"} />;
  }
  // text
  return <TextPage page={page} side={side === "right" ? "right" : "left"} />;
}

// ── Page variants ───────────────────────────────────────────────

function TitlePage({
  page,
}: {
  page: Extract<PageType, { type: "title" }>;
}) {
  return (
    <div
      style={{
        height: "100%",
        padding: "56px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontFamily: V2.mono,
          fontSize: 11,
          letterSpacing: "0.2em",
          color: V2.inkMute,
          textTransform: "uppercase",
        }}
      >
        {page.tag}
      </span>
      <div>
        <h1
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 48px)",
            letterSpacing: -1.2,
            lineHeight: 1.05,
            margin: 0,
            color: V2.ink,
          }}
        >
          {page.title}
        </h1>
        <div
          style={{
            width: 48,
            height: 1,
            background: V2.goldDeep,
            margin: "20px 0",
          }}
        />
        {page.subtitle && (
          <p
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: 18,
              color: V2.inkSoft,
              margin: 0,
            }}
          >
            {page.subtitle}
          </p>
        )}
      </div>
      <span
        style={{
          fontFamily: V2.mono,
          fontSize: 10,
          letterSpacing: "0.2em",
          color: V2.inkMute,
        }}
      >
        {page.dateLabel ?? "ONS VERHAALTJE · 2026"}
      </span>
    </div>
  );
}

function TextPage({
  page,
  side,
}: {
  page: Extract<PageType, { type: "text" }>;
  side: "left" | "right";
}) {
  const isDropcap = page.layout === "dropcap";
  const text = page.content.trim();
  const first = text.charAt(0);
  const rest = text.slice(1);
  return (
    <div
      style={{
        height: "100%",
        padding: "56px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: V2.display,
          fontSize: 20,
          fontWeight: 400,
          lineHeight: 1.55,
          letterSpacing: -0.1,
          color: V2.ink,
          maxWidth: "42ch",
          marginLeft: side === "right" ? "auto" : undefined,
          marginRight: side === "left" ? "auto" : undefined,
        }}
      >
        {isDropcap ? (
          <>
            <span
              style={{
                fontSize: 72,
                float: "left",
                lineHeight: 0.8,
                marginRight: 10,
                marginTop: 8,
                fontWeight: 400,
              }}
            >
              {first}
            </span>
            {rest}
          </>
        ) : (
          text
        )}
      </div>
    </div>
  );
}

function IllustrationPage({
  page,
  full,
}: {
  page: Extract<PageType, { type: "illustration" }>;
  childName: string;
  full: boolean;
}) {
  if (page.url) {
    // Real fal.ai illustration
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={page.url}
        alt={page.description || "Illustratie"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
        draggable={false}
      />
    );
  }
  // Fallback placeholder: night-sky decoration
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: `linear-gradient(175deg, ${V2.night} 0%, ${V2.nightSoft} 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: full ? "30%" : "24%",
          right: full ? "22%" : "24%",
          width: full ? 96 : 72,
          height: full ? 96 : 72,
          borderRadius: "50%",
          background: V2.gold,
          opacity: 0.9,
        }}
      />
      {Array.from({ length: 14 }).map((_, i) => {
        const x = ((i * 97) % 100) + 0.5;
        const y = ((i * 53 + 11) % 100) + 0.5;
        const s = 1 + ((i * 17) % 6) / 4;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${x}%`,
              top: `${y}%`,
              width: s,
              height: s,
              borderRadius: "50%",
              background: V2.gold,
              opacity: 0.6,
            }}
          />
        );
      })}
      {page.description && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 24,
            right: 24,
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 15,
            color: V2.paper,
            opacity: 0.78,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          {page.description}
        </div>
      )}
    </div>
  );
}

function EndingPage({
  page,
}: {
  page: Extract<PageType, { type: "ending" }>;
}) {
  return (
    <div
      style={{
        height: "100%",
        padding: "56px 48px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: V2.display,
          fontSize: 24,
          fontStyle: "italic",
          color: V2.inkSoft,
          lineHeight: 1.5,
          maxWidth: "36ch",
          margin: "0 auto 28px",
          fontWeight: 400,
        }}
      >
        {page.text}
      </div>
      <div
        style={{
          width: 40,
          height: 1,
          background: V2.goldDeep,
          margin: "0 auto 28px",
        }}
      />
      {page.sign && (
        <div
          style={{
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 20,
            color: V2.goldDeep,
          }}
        >
          {page.sign}
        </div>
      )}
    </div>
  );
}

// ── Controls ────────────────────────────────────────────────────

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "Vorige pagina" : "Volgende pagina"}
      style={{
        width: 52,
        height: 52,
        background: isPrev ? V2.paper : V2.ink,
        color: isPrev ? V2.ink : V2.paper,
        border: isPrev ? `1px solid ${V2.paperShade}` : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isPrev ? V2.ink : V2.paper}
        strokeWidth="1.4"
        strokeLinecap="round"
      >
        <path d={isPrev ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

function PageDots({
  count,
  current,
  onPick,
}: {
  count: number;
  current: number;
  onPick: (i: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onPick(i)}
          aria-label={`Spread ${i + 1}`}
          style={{
            width: i === current ? 18 : 6,
            height: 6,
            borderRadius: 0,
            border: "none",
            background: i === current ? V2.ink : V2.paperShade,
            cursor: "pointer",
            padding: 0,
            transition: "width .3s, background .2s",
          }}
        />
      ))}
    </div>
  );
}

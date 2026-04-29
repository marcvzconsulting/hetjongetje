"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
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

// SVG fractal-noise texture, inlined as data URL. Subtle paper grain,
// looks crisp on retina because it scales as a vector.
const PAPER_NOISE = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.12  0 0 0 0 0.10  0 0 0 0 0.18  0 0 0 0.55 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/></svg>")`;

const MOBILE_BP = 768;

/**
 * Decide whether to show the compact (single-page) reader.
 *
 * - Width ≥ 768: spread (desktop / tablet)
 * - Width 560–767 in landscape: spread (phone held sideways — parents can
 *   show text + illustration side-by-side)
 * - Otherwise: compact single-page mode
 */
function shouldUseCompact(w: number, h: number): boolean {
  if (w >= MOBILE_BP) return false;
  if (w >= 560 && w > h) return false;
  return true;
}

export function BookViewerV3({
  spreads,
  childName,
  childId,
  storyId,
  isFavorite,
  onToggleFavorite,
  storyTitle,
}: Props) {
  // ── Viewport ─────────────────────────────────────────────────
  // `isMobile` here = "use compact single-page mode". A phone in landscape
  // is technically still mobile, but gets the spread for richer reading.
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? shouldUseCompact(window.innerWidth, window.innerHeight)
      : false,
  );
  useEffect(() => {
    const onResize = () =>
      setIsMobile(shouldUseCompact(window.innerWidth, window.innerHeight));
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // ── Pages: on mobile we flatten spreads to single pages ──────
  const pages = useMemo(() => flattenSpreads(spreads), [spreads]);
  const totalUnits = isMobile ? pages.length : spreads.length;

  // ── Position (saved per story) ───────────────────────────────
  const [idx, setIdx] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const key = `ov_reader_v3_${storyId}_${isMobile ? "m" : "d"}`;
    const saved =
      typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= 0 && n < totalUnits) {
        setIdx(n);
        return;
      }
    }
    setIdx(0);
  }, [storyId, isMobile, totalUnits]);

  useEffect(() => {
    const key = `ov_reader_v3_${storyId}_${isMobile ? "m" : "d"}`;
    if (typeof window !== "undefined") localStorage.setItem(key, String(idx));
  }, [idx, storyId, isMobile]);

  const go = useCallback(
    (d: 1 | -1) => {
      setIdx((prev) => {
        const next = prev + d;
        if (next < 0 || next >= totalUnits) return prev;
        setDirection(d);
        return next;
      });
    },
    [totalUnits],
  );

  // Keyboard
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        go(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // ── Auto-hide chrome ─────────────────────────────────────────
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    function bump() {
      setChromeVisible(true);
      if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
      chromeTimerRef.current = setTimeout(() => setChromeVisible(false), 3500);
    }
    bump();
    window.addEventListener("mousemove", bump, { passive: true });
    window.addEventListener("touchstart", bump, { passive: true });
    window.addEventListener("keydown", bump);
    return () => {
      if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
      window.removeEventListener("mousemove", bump);
      window.removeEventListener("touchstart", bump);
      window.removeEventListener("keydown", bump);
    };
  }, [idx]);

  // ── Render ───────────────────────────────────────────────────
  const progress = totalUnits > 1 ? idx / (totalUnits - 1) : 1;

  return (
    <div
      style={{
        minHeight: "100svh", // mobile-friendly small viewport units
        background: V2.paperDeep,
        color: V2.ink,
        fontFamily: V2.body,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient vignette */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(20,20,46,0.18) 100%)`,
          zIndex: 1,
        }}
      />

      {/* Top bar */}
      <nav
        aria-label="Verhaal navigatie"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
          padding: isMobile ? "10px 14px" : "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          background: `${V2.paper}f0`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: `1px solid ${V2.paperShade}`,
          opacity: chromeVisible ? 1 : 0.08,
          transform: chromeVisible ? "translateY(0)" : "translateY(-4px)",
          transition:
            "opacity 0.5s ease, transform 0.5s ease",
        }}
        onMouseEnter={() => setChromeVisible(true)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <Link href="/dashboard" aria-label="Terug naar bibliotheek">
            <Logo size={isMobile ? 16 : 18} />
          </Link>
          <Link
            href="/dashboard"
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.inkMute,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← {isMobile ? "Plankje" : "Plankje"}
          </Link>
        </div>

        {!isMobile && (
          <div
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: 17,
              color: V2.ink,
              maxWidth: 420,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              opacity: 0.92,
            }}
          >
            {storyTitle}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: isMobile ? 10 : 18,
            alignItems: "center",
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
          }}
        >
          <ChromeButton
            label={isFavorite ? "Favoriet" : "Bewaren"}
            iconName="heart"
            active={isFavorite}
            activeColor={V2.heart}
            onClick={onToggleFavorite}
            compact={isMobile}
          />
          {!isMobile && (
            <Link
              href={`/generate/${childId}`}
              style={{ color: V2.inkMute, textDecoration: "none", whiteSpace: "nowrap" }}
            >
              Nieuw verhaal
            </Link>
          )}
          {!isMobile && <SignOutButtonV2 />}
        </div>
      </nav>

      {/* Mobile: title strip beneath nav (so the nav stays compact) */}
      {isMobile && (
        <div
          style={{
            textAlign: "center",
            padding: "8px 16px 0",
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 14,
            color: V2.inkMute,
            opacity: chromeVisible ? 0.9 : 0,
            transition: "opacity 0.5s ease",
            zIndex: 5,
            position: "relative",
          }}
        >
          {storyTitle}
        </div>
      )}

      {/* Stage */}
      <div
        style={{
          padding: isMobile ? "12px 0 80px" : "40px 24px 96px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          zIndex: 2,
          minHeight: isMobile ? "calc(100svh - 120px)" : "auto",
        }}
      >
        {isMobile ? (
          <MobilePager
            page={pages[idx]}
            childName={childName}
            direction={direction}
            idx={idx}
            onSwipe={(d) => go(d)}
          />
        ) : (
          <DesktopBookFrame
            spread={spreads[idx]}
            childName={childName}
            direction={direction}
            idx={idx}
          />
        )}
      </div>

      {/* Controls */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: isMobile ? "10px 16px 14px" : "16px 24px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          background: `linear-gradient(to top, ${V2.paperDeep} 0%, ${V2.paperDeep}cc 70%, transparent 100%)`,
          zIndex: 15,
          opacity: chromeVisible ? 1 : 0.15,
          transition: "opacity 0.5s ease",
          pointerEvents: chromeVisible ? "auto" : "none",
        }}
      >
        {/* Ribbon progress */}
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            height: 2,
            background: V2.paperShade,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              height: "100%",
              background: `linear-gradient(to right, ${V2.gold}, ${V2.goldDeep})`,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 18 : 28,
          }}
        >
          <NavButton
            direction="prev"
            disabled={idx === 0}
            onClick={() => go(-1)}
            size={isMobile ? 48 : 52}
          />
          <div
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: isMobile ? 14 : 15,
              color: V2.inkMute,
              minWidth: isMobile ? 78 : 110,
              textAlign: "center",
              letterSpacing: 0.2,
            }}
          >
            <span style={{ color: V2.ink }}>{toRoman(idx + 1)}</span>{" "}
            <span style={{ opacity: 0.55 }}>·</span>{" "}
            {toRoman(totalUnits)}
          </div>
          <NavButton
            direction="next"
            disabled={idx === totalUnits - 1}
            onClick={() => go(1)}
            size={isMobile ? 48 : 52}
          />
        </div>
      </div>

      {/* Floating bookmark ribbon when favorited */}
      {isFavorite && (
        <BookmarkRibbon isMobile={isMobile} chromeVisible={chromeVisible} />
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// MOBILE PAGER — single page, swipe horizontally
// ────────────────────────────────────────────────────────────────

function MobilePager({
  page,
  childName,
  direction,
  idx,
  onSwipe,
}: {
  page: PageType;
  childName: string;
  direction: 1 | -1;
  idx: number;
  onSwipe: (d: 1 | -1) => void;
}) {
  const SWIPE_THRESHOLD = 60;

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 400;
    if (!swipe) return;
    if (offset.x < 0) onSwipe(1);
    else onSwipe(-1);
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 460,
        aspectRatio: "3 / 4.4",
        // Stay inside viewport on small phones
        maxHeight: "calc(100svh - 200px)",
        margin: "0 14px",
        perspective: 1400,
      }}
    >
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={idx}
          custom={direction}
          drag="x"
          dragElastic={0.18}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleDragEnd}
          initial={{
            opacity: 0,
            x: direction > 0 ? 80 : -80,
            rotateY: direction > 0 ? 18 : -18,
          }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          exit={{
            opacity: 0,
            x: direction > 0 ? -60 : 60,
            rotateY: direction > 0 ? -14 : 14,
          }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: "absolute",
            inset: 0,
            background: V2.paper,
            backgroundImage: PAPER_NOISE,
            backgroundBlendMode: "multiply",
            boxShadow:
              "0 24px 60px rgba(20,20,46,0.22), 0 6px 18px rgba(20,20,46,0.12)",
            transformStyle: "preserve-3d",
            cursor: "grab",
            overflow: "hidden",
            borderRadius: 2,
          }}
        >
          <PageContent page={page} side="full" childName={childName} />
          {/* Inner page edge highlight */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `linear-gradient(to right, rgba(0,0,0,0.05) 0%, transparent 4%, transparent 96%, rgba(0,0,0,0.05) 100%)`,
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Subtle hint on first page */}
      {idx === 0 && (
        <div
          style={{
            position: "absolute",
            bottom: -28,
            left: 0,
            right: 0,
            textAlign: "center",
            fontFamily: V2.ui,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: 0.6,
            pointerEvents: "none",
          }}
        >
          ← veeg om te bladeren →
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// DESKTOP BOOK FRAME — two-page spread with page-flip
// ────────────────────────────────────────────────────────────────

function DesktopBookFrame({
  spread,
  childName,
  direction,
  idx,
}: {
  spread: Spread;
  childName: string;
  direction: 1 | -1;
  idx: number;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "min(100%, 980px)",
        aspectRatio: "980 / 620",
        maxHeight: "calc(100vh - 200px)",
        perspective: 2400,
      }}
    >
      {/* Page-edge stack illusion (bottom + right) */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -2,
          background: `repeating-linear-gradient(to bottom, ${V2.paperShade} 0px, ${V2.paperShade} 1px, ${V2.paper} 1px, ${V2.paper} 3px)`,
          opacity: 0.6,
          zIndex: 0,
          transform: "translate(4px, 4px)",
          filter: "blur(0.4px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: V2.paper,
          backgroundImage: PAPER_NOISE,
          backgroundBlendMode: "multiply",
          boxShadow:
            "0 36px 90px rgba(20,20,46,0.30), 0 12px 36px rgba(20,20,46,0.14)",
          transformStyle: "preserve-3d",
          overflow: "hidden",
          zIndex: 2,
        }}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={idx}
            custom={direction}
            initial={{
              opacity: 0,
              rotateY: direction > 0 ? 24 : -24,
              x: direction > 0 ? 28 : -28,
            }}
            animate={{ opacity: 1, rotateY: 0, x: 0 }}
            exit={{
              opacity: 0,
              rotateY: direction > 0 ? -24 : 24,
              x: direction > 0 ? -28 : 28,
            }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              transformStyle: "preserve-3d",
              transformOrigin: direction > 0 ? "left center" : "right center",
            }}
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

        {/* Spine shadow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 56,
            transform: "translateX(-50%)",
            background:
              "linear-gradient(to right, transparent 0%, rgba(20,20,46,0.18) 48%, rgba(20,20,46,0.18) 52%, transparent 100%)",
            pointerEvents: "none",
            zIndex: 5,
          }}
        />

        {/* Inner page-edge highlights */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "linear-gradient(to right, rgba(0,0,0,0.06) 0%, transparent 3%, transparent 97%, rgba(0,0,0,0.06) 100%), linear-gradient(to bottom, rgba(0,0,0,0.04) 0%, transparent 4%, transparent 96%, rgba(0,0,0,0.04) 100%)",
            zIndex: 4,
          }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// PAGES
// ────────────────────────────────────────────────────────────────

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
        position: "relative",
        width: "50%",
        height: "100%",
        background: "transparent",
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
        background: "transparent",
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
  if (page.type === "title") return <TitlePage page={page} />;
  if (page.type === "ending") return <EndingPage page={page} childName={childName} />;
  if (page.type === "illustration")
    return <IllustrationPage page={page} childName={childName} full={side === "full"} />;
  return <TextPage page={page} side={side === "right" ? "right" : "left"} />;
}

// ── Title ──────────────────────────────────────────────────────

function TitlePage({ page }: { page: Extract<PageType, { type: "title" }> }) {
  return (
    <div
      style={{
        height: "100%",
        padding: "clamp(28px, 6vw, 64px) clamp(20px, 5vw, 56px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <span
        style={{
          fontFamily: V2.mono,
          fontSize: 11,
          letterSpacing: "0.22em",
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
            fontSize: "clamp(30px, 7vw, 52px)",
            letterSpacing: -1.2,
            lineHeight: 1.04,
            margin: 0,
            color: V2.ink,
          }}
        >
          {page.title}
        </h1>
        <Flourish />
        {page.subtitle && (
          <p
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: "clamp(15px, 3.4vw, 19px)",
              color: V2.inkSoft,
              margin: 0,
              lineHeight: 1.4,
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
          letterSpacing: "0.22em",
          color: V2.inkMute,
        }}
      >
        {page.dateLabel ?? "ONS VERHAALTJE · 2026"}
      </span>
    </div>
  );
}

// ── Text (with ornamented drop cap) ────────────────────────────

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
        padding: "clamp(28px, 6vw, 64px) clamp(22px, 5vw, 56px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: V2.body,
          fontSize: "clamp(17px, 2.4vw, 20px)",
          fontWeight: 400,
          lineHeight: 1.62,
          letterSpacing: 0.02,
          color: V2.ink,
          maxWidth: "44ch",
          marginLeft: side === "right" ? "auto" : 0,
          marginRight: side === "left" ? "auto" : 0,
          textShadow: "0 0 0.4px rgba(31,30,58,0.4)",
        }}
      >
        {isDropcap ? (
          <>
            <span
              style={{
                fontFamily: V2.display,
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "clamp(58px, 9vw, 84px)",
                float: "left",
                lineHeight: 0.82,
                marginRight: 12,
                marginTop: 6,
                color: V2.goldDeep,
                paddingBottom: 4,
                borderBottom: `1px solid ${V2.gold}`,
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

// ── Illustration ───────────────────────────────────────────────

function IllustrationPage({
  page,
  full,
}: {
  page: Extract<PageType, { type: "illustration" }>;
  childName: string;
  full: boolean;
}) {
  if (page.url) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
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
        {/* Soft inner vignette on illustration so type-pages on the other side feel balanced */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(20,20,46,0.18) 100%)",
          }}
        />
      </div>
    );
  }

  // Fallback: night-sky placeholder
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
          opacity: 0.92,
          boxShadow: `0 0 60px ${V2.gold}66`,
        }}
      />
      {Array.from({ length: 18 }).map((_, i) => {
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

// ── Ending (keepsake) ──────────────────────────────────────────

function EndingPage({
  page,
  childName,
}: {
  page: Extract<PageType, { type: "ending" }>;
  childName: string;
}) {
  return (
    <div
      style={{
        height: "100%",
        padding: "clamp(32px, 6vw, 64px) clamp(20px, 5vw, 56px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
      }}
    >
      <div
        style={{
          fontFamily: V2.display,
          fontSize: "clamp(20px, 4vw, 26px)",
          fontStyle: "italic",
          color: V2.inkSoft,
          lineHeight: 1.5,
          maxWidth: "34ch",
          margin: "0 auto 24px",
          fontWeight: 400,
        }}
      >
        {page.text}
      </div>
      <Flourish center />
      <div
        style={{
          fontFamily: V2.mono,
          fontSize: 10,
          letterSpacing: "0.24em",
          color: V2.inkMute,
          margin: "8px auto 14px",
          textTransform: "uppercase",
        }}
      >
        Welterusten,
      </div>
      <div
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: "clamp(28px, 6vw, 44px)",
          fontWeight: 300,
          color: V2.goldDeep,
          letterSpacing: -0.8,
          lineHeight: 1,
        }}
      >
        {childName}
      </div>
      {page.sign && (
        <div
          style={{
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: "clamp(14px, 2.6vw, 17px)",
            color: V2.inkMute,
            marginTop: 18,
            opacity: 0.85,
          }}
        >
          {page.sign}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// CONTROLS
// ────────────────────────────────────────────────────────────────

function NavButton({
  direction,
  disabled,
  onClick,
  size = 52,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
  size?: number;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "Vorige pagina" : "Volgende pagina"}
      style={{
        width: size,
        height: size,
        background: isPrev ? V2.paper : V2.ink,
        color: isPrev ? V2.ink : V2.paper,
        border: isPrev ? `1px solid ${V2.paperShade}` : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.25 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 999,
        boxShadow: disabled
          ? "none"
          : isPrev
            ? "0 2px 8px rgba(20,20,46,0.08)"
            : "0 4px 14px rgba(20,20,46,0.22)",
        transition: "transform 0.15s ease, box-shadow 0.2s ease",
      }}
      onMouseDown={(e) =>
        !disabled && (e.currentTarget.style.transform = "scale(0.94)")
      }
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isPrev ? V2.ink : V2.paper}
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d={isPrev ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

function ChromeButton({
  label,
  iconName,
  active,
  activeColor,
  onClick,
  compact,
}: {
  label: string;
  iconName: "heart" | "speaker" | "x";
  active: boolean;
  activeColor?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const color = active ? activeColor ?? V2.ink : V2.inkMute;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color,
        fontFamily: V2.ui,
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        padding: compact ? "8px 6px" : "8px 4px",
        minHeight: 36,
      }}
      aria-pressed={active}
      aria-label={label}
    >
      <ButtonIcon name={iconName} color={color} active={active} />
      {!compact && <span>{label}</span>}
    </button>
  );
}

function ButtonIcon({
  name,
  color,
  active,
}: {
  name: "heart" | "speaker" | "x";
  color: string;
  active: boolean;
}) {
  if (name === "heart") {
    return (
      <IconV2 name="heart" size={16} color={color} filled={active} />
    );
  }
  if (name === "x") {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  // speaker / read-aloud
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16 8a5 5 0 0 1 0 8" />
      <path d="M19 5a9 9 0 0 1 0 14" />
    </svg>
  );
}

// ── Bookmark ribbon ─────────────────────────────────────────────

function BookmarkRibbon({
  isMobile,
  chromeVisible,
}: {
  isMobile: boolean;
  chromeVisible: boolean;
}) {
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      aria-hidden
      style={{
        position: "fixed",
        top: isMobile ? 56 : 60,
        right: isMobile ? 16 : 36,
        width: isMobile ? 22 : 26,
        height: isMobile ? 86 : 110,
        background: V2.heart,
        boxShadow: "0 6px 14px rgba(176,74,65,0.34)",
        clipPath:
          "polygon(0 0, 100% 0, 100% 100%, 50% 82%, 0 100%)",
        zIndex: 12,
        opacity: chromeVisible ? 1 : 0.55,
        transition: "opacity 0.4s ease",
      }}
    />
  );
}

// ── Flourish (small ornament) ──────────────────────────────────

function Flourish({ center = false }: { center?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: center ? "center" : "flex-start",
        gap: 8,
        margin: "18px 0",
      }}
    >
      <span
        style={{
          width: 36,
          height: 1,
          background: V2.goldDeep,
          opacity: 0.7,
        }}
      />
      <span
        style={{
          width: 4,
          height: 4,
          background: V2.gold,
          transform: "rotate(45deg)",
        }}
      />
      <span
        style={{
          width: 36,
          height: 1,
          background: V2.goldDeep,
          opacity: 0.7,
        }}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// HELPERS
// ────────────────────────────────────────────────────────────────

function flattenSpreads(spreads: Spread[]): PageType[] {
  const out: PageType[] = [];
  for (const s of spreads) {
    if (s.fullSpread) {
      out.push(s.left);
    } else {
      out.push(s.left);
      out.push(s.right);
    }
  }
  return out;
}

function toRoman(n: number): string {
  if (n <= 0) return "";
  const map: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let res = "";
  let v = n;
  for (const [num, sym] of map) {
    while (v >= num) {
      res += sym;
      v -= num;
    }
  }
  return res;
}

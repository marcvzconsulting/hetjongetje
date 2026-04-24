"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { V2 } from "@/components/v2/tokens";
import type { PageType, Spread } from "@/lib/story/spread-types";

type Props = {
  spreads: Spread[];
  /** Reset-key: switching stories within a tab-group should snap to page 0. */
  resetKey?: string;
};

export function StoryPreviewReader({ spreads, resetKey }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [resetKey]);

  if (spreads.length === 0) return null;
  const safeIdx = Math.min(idx, spreads.length - 1);
  const spread = spreads[safeIdx];

  return (
    <div>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 640,
          aspectRatio: "640 / 440",
          margin: "0 auto",
          background: V2.paper,
          boxShadow:
            "0 24px 60px rgba(20,20,46,0.18), 0 8px 20px rgba(20,20,46,0.08)",
          overflow: "hidden",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={safeIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.28 }}
            style={{ position: "absolute", inset: 0, display: "flex" }}
          >
            <Half page={spread.left} />
            <Half page={spread.right} />
          </motion.div>
        </AnimatePresence>
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 24,
            transform: "translateX(-50%)",
            background:
              "linear-gradient(to right, transparent, rgba(0,0,0,0.08) 48%, rgba(0,0,0,0.08) 52%, transparent)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      </div>

      <div
        style={{
          marginTop: 22,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Arrow
          dir="prev"
          disabled={safeIdx === 0}
          onClick={() => setIdx(Math.max(0, safeIdx - 1))}
        />
        <div style={{ display: "flex", gap: 4 }}>
          {spreads.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Spread ${i + 1}`}
              style={{
                width: i === safeIdx ? 14 : 4,
                height: 4,
                border: "none",
                background: i === safeIdx ? V2.ink : V2.paperShade,
                cursor: "pointer",
                padding: 0,
                transition: "width .2s, background .2s",
              }}
            />
          ))}
        </div>
        <Arrow
          dir="next"
          disabled={safeIdx === spreads.length - 1}
          onClick={() => setIdx(Math.min(spreads.length - 1, safeIdx + 1))}
        />
      </div>
      <div
        style={{
          marginTop: 10,
          textAlign: "center",
          fontFamily: V2.mono,
          fontSize: 10,
          color: V2.inkMute,
          letterSpacing: "0.18em",
        }}
      >
        SPREAD {safeIdx + 1} / {spreads.length}
      </div>
    </div>
  );
}

function Arrow({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const prev = dir === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 34,
        height: 34,
        background: prev ? V2.paper : V2.ink,
        border: prev ? `1px solid ${V2.paperShade}` : "none",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label={prev ? "Vorige" : "Volgende"}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={prev ? V2.ink : V2.paper}
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d={prev ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
      </svg>
    </button>
  );
}

// ── Halves ─────────────────────────────────────────────────────────

function Half({ page }: { page: PageType }) {
  if (page.type === "title") return <TitleHalf page={page} />;
  if (page.type === "text") return <TextHalf page={page} />;
  if (page.type === "illustration") return <IllustrationHalf page={page} />;
  return <EndingHalf page={page} />;
}

function TitleHalf({
  page,
}: {
  page: Extract<PageType, { type: "title" }>;
}) {
  return (
    <div
      style={{
        width: "50%",
        height: "100%",
        background: V2.paper,
        padding: "8% 9%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
      }}
    >
      <span
        style={{
          fontFamily: V2.mono,
          fontSize: 9,
          letterSpacing: "0.2em",
          color: V2.inkMute,
          textTransform: "uppercase",
        }}
      >
        {page.tag}
      </span>
      <div>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(18px, 2.6vw, 26px)",
            letterSpacing: -0.6,
            lineHeight: 1.05,
            margin: 0,
            color: V2.ink,
          }}
        >
          {page.title}
        </h2>
        <div
          style={{
            width: 28,
            height: 1,
            background: V2.goldDeep,
            margin: "10px 0",
          }}
        />
        {page.subtitle && (
          <p
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontSize: 12,
              color: V2.inkSoft,
              margin: 0,
            }}
          >
            {page.subtitle}
          </p>
        )}
      </div>
      {page.dateLabel && (
        <span
          style={{
            fontFamily: V2.mono,
            fontSize: 8,
            letterSpacing: "0.18em",
            color: V2.inkMute,
          }}
        >
          {page.dateLabel}
        </span>
      )}
    </div>
  );
}

function TextHalf({ page }: { page: Extract<PageType, { type: "text" }> }) {
  const dropcap = page.layout === "dropcap" && page.content.length > 0;
  const body = dropcap ? page.content.slice(1) : page.content;
  return (
    <div
      style={{
        width: "50%",
        height: "100%",
        background: V2.paper,
        padding: "8% 9%",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <p
        style={{
          fontFamily: V2.display,
          fontSize: 13,
          lineHeight: 1.55,
          color: V2.ink,
          margin: 0,
          fontWeight: 400,
          letterSpacing: -0.2,
        }}
      >
        {dropcap && (
          <span
            style={{
              fontSize: 42,
              float: "left",
              lineHeight: 0.8,
              marginRight: 8,
              marginTop: 3,
              color: V2.goldDeep,
              fontStyle: "italic",
            }}
          >
            {page.content.charAt(0)}
          </span>
        )}
        {body}
      </p>
    </div>
  );
}

function IllustrationHalf({
  page,
}: {
  page: Extract<PageType, { type: "illustration" }>;
}) {
  return (
    <div
      style={{
        width: "50%",
        height: "100%",
        background: V2.night,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {page.url ? (
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
        />
      ) : (
        <NightFallback />
      )}
    </div>
  );
}

function EndingHalf({
  page,
}: {
  page: Extract<PageType, { type: "ending" }>;
}) {
  return (
    <div
      style={{
        width: "50%",
        height: "100%",
        background: V2.paper,
        padding: "10% 9%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: V2.display,
          fontStyle: "italic",
          fontWeight: 300,
          fontSize: 14,
          lineHeight: 1.5,
          color: V2.ink,
          margin: 0,
          maxWidth: "28ch",
        }}
      >
        {page.text}
      </p>
      {page.sign && (
        <p
          style={{
            fontFamily: V2.display,
            fontSize: 11,
            fontStyle: "italic",
            color: V2.goldDeep,
            marginTop: 16,
          }}
        >
          {page.sign}
        </p>
      )}
    </div>
  );
}

function NightFallback() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: "22%",
          right: "22%",
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: V2.gold,
          opacity: 0.9,
        }}
      />
      {[
        { x: 14, y: 22 },
        { x: 30, y: 36 },
        { x: 54, y: 18 },
        { x: 76, y: 48 },
        { x: 20, y: 60 },
        { x: 64, y: 62 },
        { x: 42, y: 74 },
      ].map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: V2.gold,
            opacity: 0.7,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "38%",
          background: V2.nightSoft,
          opacity: 0.6,
        }}
      />
    </>
  );
}

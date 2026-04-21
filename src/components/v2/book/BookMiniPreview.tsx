"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { V2 } from "@/components/v2/tokens";

export type MiniSpread =
  | { type: "cover"; title: string; childName: string; storyCount: number }
  | { type: "dedication"; text: string }
  | {
      type: "toc";
      items: { title: string; startPage: number }[];
    }
  | {
      type: "story";
      illustrationUrl: string | null;
      title: string;
      firstParagraph: string;
      pageL: number;
      pageR: number;
    }
  | { type: "colophon"; year: string };

type Props = {
  spreads: MiniSpread[];
};

/**
 * Compact flippable preview of the whole compiled book. Not as richly
 * animated as the real reader — just two static pages with dot navigation
 * and smooth cross-fade transitions.
 */
export function BookMiniPreview({ spreads }: Props) {
  const [idx, setIdx] = useState(0);
  // Clamp during render instead of via a setState-in-effect — when the
  // parent removes spreads, we just snap to the last one next render.
  const safeIdx = Math.min(idx, Math.max(spreads.length - 1, 0));

  if (spreads.length === 0) {
    return (
      <div
        style={{
          padding: 40,
          background: V2.paperDeep,
          border: `1px solid ${V2.paperShade}`,
          fontFamily: V2.display,
          fontStyle: "italic",
          color: V2.inkMute,
          textAlign: "center",
        }}
      >
        Kies minstens één verhaal om de voorproef te zien.
      </div>
    );
  }

  const spread = spreads[safeIdx];

  return (
    <div>
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          maxWidth: 560,
          aspectRatio: "560 / 380",
          margin: "0 auto",
          boxShadow:
            "0 20px 50px rgba(20,20,46,0.15), 0 6px 20px rgba(20,20,46,0.08)",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={safeIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            style={{ position: "absolute", inset: 0 }}
          >
            <MiniSpreadRender spread={spread} />
          </motion.div>
        </AnimatePresence>
        {/* spine */}
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
              "linear-gradient(to right, transparent, rgba(0,0,0,0.1) 48%, rgba(0,0,0,0.1) 52%, transparent)",
            pointerEvents: "none",
            zIndex: 3,
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          marginTop: 20,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 16,
        }}
      >
        <MiniArrow
          disabled={safeIdx === 0}
          dir="prev"
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
                width: i === safeIdx ? 12 : 4,
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
        <MiniArrow
          disabled={safeIdx === spreads.length - 1}
          dir="next"
          onClick={() =>
            setIdx(Math.min(spreads.length - 1, safeIdx + 1))
          }
        />
      </div>
      <div
        style={{
          marginTop: 10,
          textAlign: "center",
          fontFamily: V2.mono,
          fontSize: 10,
          color: V2.inkMute,
          letterSpacing: "0.16em",
        }}
      >
        SPREAD {safeIdx + 1} / {spreads.length}
      </div>
    </div>
  );
}

function MiniArrow({
  disabled,
  dir,
  onClick,
}: {
  disabled: boolean;
  dir: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = dir === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 32,
        height: 32,
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
        width="12"
        height="12"
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

function MiniSpreadRender({ spread }: { spread: MiniSpread }) {
  if (spread.type === "cover") {
    return (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <HalfPage side="left">
          <span style={{ opacity: 0 }}>.</span>
        </HalfPage>
        <div
          style={{
            width: "50%",
            height: "100%",
            background: V2.night,
            color: V2.paper,
            position: "relative",
            padding: "18% 8% 14%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
          }}
        >
          {/* moon crescent */}
          <div
            style={{
              position: "absolute",
              top: "14%",
              right: "14%",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: V2.gold,
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "14%",
              right: "8%",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: V2.night,
            }}
          />
          <span />
          <div>
            <div
              style={{
                fontFamily: V2.mono,
                fontSize: 8,
                letterSpacing: "0.2em",
                color: V2.gold,
                opacity: 0.8,
                marginBottom: 8,
              }}
            >
              — VERZAMELD MMXXVI —
            </div>
            <div
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 16,
                lineHeight: 1.05,
                letterSpacing: -0.4,
              }}
            >
              {spread.title.split(spread.childName)[0]}
              <span style={{ fontStyle: "italic" }}>{spread.childName}</span>
            </div>
            <div
              style={{
                width: 24,
                height: 1,
                background: V2.gold,
                margin: "10px 0 8px",
                opacity: 0.5,
              }}
            />
            <div
              style={{
                fontFamily: V2.mono,
                fontSize: 8,
                letterSpacing: "0.18em",
                color: V2.gold,
                opacity: 0.7,
              }}
            >
              {spread.storyCount} VERHALEN
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (spread.type === "dedication") {
    return (
      <HalfSpread>
        <HalfPage side="left" centered>
          <div
            style={{
              fontFamily: V2.display,
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: 11,
              lineHeight: 1.6,
              color: V2.ink,
              whiteSpace: "pre-line",
              textAlign: "center",
              maxWidth: "24ch",
            }}
          >
            {spread.text}
          </div>
        </HalfPage>
        <HalfPage side="right" />
      </HalfSpread>
    );
  }

  if (spread.type === "toc") {
    return (
      <HalfSpread>
        <HalfPage side="left">
          <div
            style={{
              fontFamily: V2.mono,
              fontSize: 8,
              letterSpacing: "0.2em",
              color: V2.inkMute,
              marginBottom: 12,
              textTransform: "uppercase",
            }}
          >
            Inhoud
          </div>
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              fontFamily: V2.display,
              fontSize: 11,
              color: V2.ink,
              lineHeight: 1.8,
            }}
          >
            {spread.items.slice(0, 6).map((it, i) => (
              <li
                key={i}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ fontStyle: "italic" }}>{it.title}</span>
                <span style={{ fontFamily: V2.mono, color: V2.inkMute }}>
                  {it.startPage}
                </span>
              </li>
            ))}
          </ol>
        </HalfPage>
        <HalfPage side="right">
          <ol
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              fontFamily: V2.display,
              fontSize: 11,
              color: V2.ink,
              lineHeight: 1.8,
            }}
          >
            {spread.items.slice(6, 12).map((it, i) => (
              <li
                key={i}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ fontStyle: "italic" }}>{it.title}</span>
                <span style={{ fontFamily: V2.mono, color: V2.inkMute }}>
                  {it.startPage}
                </span>
              </li>
            ))}
          </ol>
        </HalfPage>
      </HalfSpread>
    );
  }

  if (spread.type === "story") {
    return (
      <HalfSpread>
        <div
          style={{
            width: "50%",
            height: "100%",
            background: V2.night,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {spread.illustrationUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spread.illustrationUrl}
              alt={spread.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <>
              <div
                style={{
                  position: "absolute",
                  top: "24%",
                  right: "24%",
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: V2.gold,
                  opacity: 0.9,
                }}
              />
              {Array.from({ length: 8 }).map((_, i) => {
                const x = ((i * 97) % 100) + 0.5;
                const y = ((i * 53 + 11) % 100) + 0.5;
                return (
                  <span
                    key={i}
                    style={{
                      position: "absolute",
                      left: `${x}%`,
                      top: `${y}%`,
                      width: 2,
                      height: 2,
                      borderRadius: "50%",
                      background: V2.gold,
                      opacity: 0.6,
                    }}
                  />
                );
              })}
            </>
          )}
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: 10,
              fontFamily: V2.mono,
              fontSize: 7,
              color: V2.gold,
              letterSpacing: "0.14em",
              opacity: 0.8,
            }}
          >
            {spread.pageL}
          </div>
        </div>
        <HalfPage side="right">
          <div
            style={{
              fontFamily: V2.mono,
              fontSize: 8,
              letterSpacing: "0.2em",
              color: V2.inkMute,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            {spread.title}
          </div>
          <div
            style={{
              fontFamily: V2.display,
              fontSize: 11,
              lineHeight: 1.5,
              color: V2.ink,
            }}
          >
            {truncate(spread.firstParagraph, 220)}
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 8,
              right: 10,
              fontFamily: V2.mono,
              fontSize: 7,
              color: V2.inkMute,
              letterSpacing: "0.14em",
            }}
          >
            {spread.pageR}
          </div>
        </HalfPage>
      </HalfSpread>
    );
  }

  // colophon
  return (
    <HalfSpread>
      <HalfPage side="left" />
      <HalfPage side="right" centered>
        <div
          style={{
            fontFamily: V2.mono,
            fontSize: 9,
            letterSpacing: "0.22em",
            color: V2.inkMute,
            textTransform: "uppercase",
            textAlign: "center",
            lineHeight: 2,
          }}
        >
          Gedrukt in kleine oplage
          <br />
          Ons Verhaaltje · {spread.year}
          <br />
          onsverhaaltje.nl
        </div>
      </HalfPage>
    </HalfSpread>
  );
}

function HalfSpread({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", width: "100%", height: "100%" }}>{children}</div>;
}

function HalfPage({
  side,
  centered,
  children,
}: {
  side: "left" | "right";
  centered?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "50%",
        height: "100%",
        background: V2.paper,
        padding: "8% 9%",
        display: "flex",
        flexDirection: "column",
        justifyContent: centered ? "center" : "flex-start",
        alignItems: centered ? "center" : side === "right" ? "flex-start" : "flex-start",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

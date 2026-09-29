"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { toRoman } from "@/lib/story/reader-units";
import type { ReaderLayout } from "./layout";
import type { ReaderPalette } from "./palette";

// ── Iconen (inline SVG, 1.7 px lijn) ───────────────────────────

type IconName =
  | "moon"
  | "speaker"
  | "share"
  | "more"
  | "prev"
  | "next"
  | "again"
  | "back";

const ICONS: Record<IconName, ReactNode> = {
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  speaker: (
    <>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  prev: <path d="M15 6l-6 6 6 6" />,
  next: <path d="M9 6l6 6-6 6" />,
  again: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  back: (
    <>
      <path d="M20 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </>
  ),
};

export function ReaderIcon({
  name,
  size = 18,
  strokeWidth = 1.7,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[name]}
    </svg>
  );
}

function RoundButton({
  label,
  icon,
  iconSize,
  onClick,
  background = "none",
  color,
  pressed,
  expanded,
}: {
  label: string;
  icon: IconName;
  iconSize?: number;
  onClick: () => void;
  background?: string;
  color: string;
  pressed?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        flex: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background,
        border: "none",
        borderRadius: 999,
        cursor: "pointer",
        color,
        padding: 0,
      }}
    >
      <ReaderIcon name={icon} size={iconSize} />
    </button>
  );
}

// ── Bovenbalk ──────────────────────────────────────────────────

type TopBarProps = {
  layout: ReaderLayout;
  c: ReaderPalette;
  visible: boolean;
  title: string;
  readOnly: boolean;
  night: boolean;
  onToggleNight: () => void;
  /** Undefined = geen voorleesknop (deelpagina zonder audio). */
  onListen?: () => void;
  listening: boolean;
  onShare: () => void;
  isShared: boolean;
  onCover: () => void;
  /** Undefined = geen menu (deelpagina). */
  onMenu?: () => void;
  menuOpen: boolean;
};

export function ReaderTopBar({
  layout,
  c,
  visible,
  title,
  readOnly,
  night,
  onToggleNight,
  onListen,
  listening,
  onShare,
  isShared,
  onCover,
  onMenu,
  menuOpen,
}: TopBarProps) {
  // Met vier knoppen en de plankje-link is er op een telefoon geen
  // ruimte meer voor de titel; die staat al op de kaft.
  const showTitle = !(layout.narrow && !readOnly);

  return (
    <div
      inert={!visible}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
        padding: layout.topPad,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        background: c.chromeBg,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: `1px solid ${c.line}`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-6px)",
        transition: "opacity .5s ease, transform .5s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: layout.narrow ? 6 : 14,
          flex: "none",
        }}
      >
        {!readOnly && (
          <Link
            href="/dashboard"
            aria-label="Terug naar het plankje"
            style={
              layout.narrow
                ? {
                    width: 36,
                    height: 36,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 999,
                    border: `1px solid ${c.line}`,
                    color: c.ink,
                    textDecoration: "none",
                  }
                : {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px 7px 10px",
                    borderRadius: 999,
                    border: `1px solid ${c.line}`,
                    background: c.paper,
                    color: c.ink,
                    fontFamily: V2.ui,
                    fontSize: 13,
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }
            }
          >
            <ReaderIcon name="back" size={15} />
            {!layout.narrow && <span>Plankje</span>}
          </Link>
        )}
        <button
          type="button"
          aria-label="Terug naar de kaft"
          onClick={onCover}
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 4,
            background: "none",
            border: "none",
            padding: "6px 0",
            cursor: "pointer",
            fontFamily: V2.display,
            fontSize: 16,
            fontWeight: 300,
            letterSpacing: -0.4,
            color: c.ink,
            lineHeight: 1,
          }}
        >
          <span>ons</span>
          <span style={{ fontStyle: "italic" }}>verhaaltje</span>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: "center",
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: 13,
          color: c.mute,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {showTitle ? title : null}
      </div>

      <div
        style={{ display: "flex", alignItems: "center", gap: 2, flex: "none" }}
      >
        <RoundButton
          label={night ? "Nachtmodus uitzetten" : "Nachtmodus aanzetten"}
          icon="moon"
          iconSize={17}
          onClick={onToggleNight}
          pressed={night}
          background={night ? "rgba(201,169,97,0.18)" : "none"}
          color={night ? V2.gold : c.mute}
        />
        {onListen && (
          <RoundButton
            label="Voorlezen"
            icon="speaker"
            onClick={onListen}
            pressed={listening}
            background={listening ? V2.gold : "none"}
            color={listening ? V2.night : c.mute}
          />
        )}
        <RoundButton
          label="Delen"
          icon="share"
          onClick={onShare}
          color={isShared ? c.goldDeep : c.mute}
        />
        {onMenu && (
          <RoundButton
            label="Meer"
            icon="more"
            onClick={onMenu}
            expanded={menuOpen}
            color={c.mute}
          />
        )}
      </div>
    </div>
  );
}

// ── Onderbalk ──────────────────────────────────────────────────

type BottomBarProps = {
  layout: ReaderLayout;
  c: ReaderPalette;
  visible: boolean;
  index: number;
  total: number;
  /** Melding over de automatische nachtmodus, alleen op de kaft. */
  autoNote: string | null;
  /** Bezig met omslaan: hint en melding even weg. */
  flipping: boolean;
  /** Toon de uitnodiging om zelf een verhaal te maken (deelpagina). */
  showCta: boolean;
  onPrev: () => void;
  onNext: () => void;
  onGoTo: (index: number) => void;
  onCover: () => void;
  /** Hier zet de voorleesspeler z'n paneel in. */
  listenSlotRef: Ref<HTMLDivElement>;
  /** Het voorleespaneel staat in het slot. */
  listening: boolean;
};

export function ReaderBottomBar({
  layout,
  c,
  visible,
  index,
  total,
  autoNote,
  flipping,
  showCta,
  onPrev,
  onNext,
  onGoTo,
  onCover,
  listenSlotRef,
  listening,
}: BottomBarProps) {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const small: CSSProperties = {
    fontFamily: V2.ui,
    color: c.mute,
  };

  return (
    <div
      inert={!visible}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        padding: layout.bottomPad,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: layout.bottomGap,
        background: c.bottomBg,
        opacity: visible ? 1 : 0,
        transition: "opacity .5s ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      {isFirst && !flipping && !autoNote && (
        <div
          style={{
            ...small,
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            opacity: 0.8,
          }}
        >
          ← veeg of tik om te bladeren →
        </div>
      )}
      {isFirst && !flipping && autoNote && (
        <div
          style={{
            ...small,
            fontSize: 11,
            letterSpacing: "0.04em",
            padding: "4px 12px",
            borderRadius: 999,
            border: `1px solid ${c.line}`,
            textAlign: "center",
          }}
        >
          {autoNote}
        </div>
      )}

      {/* Leeg (en uit de lay-out) tot de voorleesspeler z'n paneel
          hierin zet. */}
      <div
        ref={listenSlotRef}
        data-ovr-ui
        style={{
          maxWidth: "100%",
          display: listening ? "flex" : "none",
          justifyContent: "center",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          // De stipjes zijn 6 px hoog maar 20 px hoog aan te tikken.
          margin: "-7px 0",
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ga naar pagina ${i + 1}`}
            aria-current={i === index ? "page" : undefined}
            onClick={() => onGoTo(i)}
            style={{
              height: 20,
              padding: 0,
              border: "none",
              background: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                display: "block",
                width: i === index ? 22 : 6,
                height: 6,
                borderRadius: 999,
                background: i === index ? V2.gold : c.dot,
                transition:
                  "width .35s cubic-bezier(.4,0,.2,1), background .35s",
              }}
            />
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <NavButton
          direction="prev"
          size={layout.navSize}
          disabled={isFirst}
          onClick={onPrev}
          c={c}
        />
        <div
          style={{
            fontFamily: V2.display,
            fontStyle: "italic",
            fontSize: 14,
            color: c.mute,
            minWidth: 78,
            textAlign: "center",
          }}
        >
          <span style={{ color: c.ink }}>{toRoman(index + 1)}</span>{" "}
          <span style={{ opacity: 0.55 }}>·</span> {toRoman(total)}
        </div>
        <NavButton
          direction="next"
          size={layout.navSize}
          disabled={isLast}
          onClick={onNext}
          c={c}
        />
      </div>

      {isLast && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onCover}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              background: V2.gold,
              color: V2.night,
              border: "none",
              borderRadius: 999,
              fontFamily: V2.ui,
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.03em",
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(20,20,46,0.2)",
            }}
          >
            <ReaderIcon name="again" size={14} strokeWidth={2} />
            Nog een keer!
          </button>
          {showCta && (
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "9px 18px",
                background: c.paper,
                color: c.ink,
                border: `1px solid ${c.line}`,
                borderRadius: 999,
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: "0.03em",
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Maak je eigen verhaal →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function NavButton({
  direction,
  size,
  disabled,
  onClick,
  c,
}: {
  direction: "prev" | "next";
  size: number;
  disabled: boolean;
  onClick: () => void;
  c: ReaderPalette;
}) {
  const prev = direction === "prev";
  return (
    <button
      type="button"
      aria-label={prev ? "Vorige pagina" : "Volgende pagina"}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        border: prev ? `1px solid ${c.line}` : "none",
        background: prev ? c.paper : c.ink,
        color: prev ? c.ink : c.paper,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.3 : 1,
        padding: 0,
        boxShadow: prev
          ? "0 2px 8px rgba(20,20,46,0.08)"
          : "0 4px 14px rgba(20,20,46,0.22)",
      }}
    >
      <ReaderIcon name={direction} size={16} strokeWidth={1.6} />
    </button>
  );
}

// ── Melding ────────────────────────────────────────────────────

export function ReaderToast({ text }: { text: string }) {
  return (
    <div
      role="status"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 40,
        padding: "12px 18px",
        borderRadius: 12,
        background: "rgba(20,20,46,0.92)",
        color: V2.paper,
        fontFamily: V2.ui,
        fontSize: 13,
        boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {text}
    </div>
  );
}

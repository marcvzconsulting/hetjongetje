"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { V2 } from "@/components/v2/tokens";
import type { ReaderLayout } from "./layout";
import type { ReaderPalette } from "./palette";

type Props = {
  layout: ReaderLayout;
  c: ReaderPalette;
  onClose: () => void;
  storyId: string;
  childId?: string;
  isFavorite: boolean;
  onToggleFavorite?: () => void;
  onReact?: () => void;
  hasFeedback: boolean;
  /** Undefined = de browser kan geen volledig scherm (iOS Safari). */
  onToggleFullscreen?: () => void;
  isFullscreen: boolean;
};

/**
 * Menu achter de "⋯"-knop: alles wat de eigenaar met een verhaal kan
 * doen, behalve lezen. Op een telefoon schuift het van onderen in beeld,
 * op grotere schermen hangt het onder de knop.
 */
export function ReaderMenu({
  layout,
  c,
  onClose,
  storyId,
  childId,
  isFavorite,
  onToggleFavorite,
  onReact,
  hasFeedback,
  onToggleFullscreen,
  isFullscreen,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sheet = layout.width < 700;

  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current
      ?.querySelector<HTMLElement>("button, a")
      ?.focus({ preventScroll: true });
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, [onClose]);

  const row: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    minHeight: 48,
    padding: "0 20px",
    boxSizing: "border-box",
    background: "none",
    border: "none",
    textAlign: "left",
    textDecoration: "none",
    cursor: "pointer",
    fontFamily: V2.ui,
    fontSize: 14,
    color: c.ink,
  };
  const divider: CSSProperties = {
    height: 1,
    background: c.line,
    margin: "6px 0",
  };

  function act(fn?: () => void) {
    return () => {
      onClose();
      fn?.();
    };
  }

  return (
    <div
      data-ovr-ui
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: sheet ? "rgba(20,20,46,0.45)" : "transparent",
        display: "flex",
        alignItems: sheet ? "flex-end" : "flex-start",
        justifyContent: sheet ? "center" : "flex-end",
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Meer mogelijkheden"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxSizing: "border-box",
          width: sheet ? "100%" : 280,
          maxHeight: "86%",
          overflowY: "auto",
          margin: sheet ? 0 : "68px 24px 0 0",
          padding: sheet
            ? "10px 0 max(14px, env(safe-area-inset-bottom, 0px))"
            : "8px 0",
          background: c.night ? V2.nightSoft : V2.paper,
          border: sheet ? "none" : `1px solid ${c.line}`,
          borderRadius: sheet ? "14px 14px 0 0" : 10,
          boxShadow: sheet
            ? "0 -10px 40px rgba(20,20,46,0.28)"
            : "0 18px 48px rgba(20,20,46,0.24)",
        }}
      >
        {sheet && (
          <div
            aria-hidden
            style={{
              width: 36,
              height: 4,
              borderRadius: 999,
              background: c.line,
              margin: "0 auto 8px",
            }}
          />
        )}

        {onToggleFavorite && (
          <button
            type="button"
            aria-pressed={isFavorite}
            onClick={act(onToggleFavorite)}
            style={row}
          >
            <MenuIcon color={isFavorite ? V2.heart : c.mute} filled={isFavorite}>
              <path d="M12 20s-7-4-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 5-9 9-9 9z" />
            </MenuIcon>
            {isFavorite ? "Favoriet" : "Bewaren als favoriet"}
          </button>
        )}
        {onReact && (
          <button type="button" onClick={act(onReact)} style={row}>
            <MenuIcon color={hasFeedback ? c.goldDeep : c.mute}>
              <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
              <path d="M21 3v5h-5" />
            </MenuIcon>
            Reageren of opnieuw maken
          </button>
        )}
        <a
          href={`/api/stories/${storyId}/pdf`}
          download
          onClick={onClose}
          style={row}
        >
          <MenuIcon color={c.mute}>
            <path d="M12 4v12M6 12l6 6 6-6M5 20h14" />
          </MenuIcon>
          Download als PDF
        </a>
        {onToggleFullscreen && (
          <button type="button" onClick={act(onToggleFullscreen)} style={row}>
            <MenuIcon color={c.mute}>
              {isFullscreen ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              )}
            </MenuIcon>
            {isFullscreen ? "Volledig scherm verlaten" : "Volledig scherm"}
          </button>
        )}

        {childId && (
          <>
            <div style={divider} />
            <Link
              href={`/generate/${childId}?vervolgVan=${storyId}`}
              onClick={onClose}
              style={row}
            >
              <MenuIcon color={c.mute}>
                <path d="M4 12h16" />
                <path d="M14 6l6 6-6 6" />
              </MenuIcon>
              Vervolgverhaal maken
            </Link>
            <Link href={`/generate/${childId}`} onClick={onClose} style={row}>
              <MenuIcon color={c.mute}>
                <path d="M12 5v14M5 12h14" />
              </MenuIcon>
              Nieuw verhaal
            </Link>
          </>
        )}

        <div style={divider} />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          style={{ ...row, color: c.mute }}
        >
          <MenuIcon color={c.mute}>
            <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
            <path d="M10 8l-4 4 4 4" />
            <path d="M6 12h10" />
          </MenuIcon>
          Uitloggen
        </button>
      </div>
    </div>
  );
}

function MenuIcon({
  color,
  filled = false,
  children,
}: {
  color: string;
  filled?: boolean;
  children: ReactNode;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flex: "none" }}
    >
      {children}
    </svg>
  );
}

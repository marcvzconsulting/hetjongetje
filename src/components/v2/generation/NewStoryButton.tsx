"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn } from "@/components/v2";
import { Avatar } from "@/components/v2/Avatar";

type Child = { id: string; name: string };

type Props = {
  childOptions: Child[];
  kind?: "primary" | "on-dark" | "ghost" | "ghost-dark";
  size?: "sm" | "md" | "lg";
};

/**
 * "+ Nieuw verhaal" met automatische kindkeuze:
 *   0 kids  → niks
 *   1 kid   → directe link
 *   2+ kids → dropdown via React portal (omzeilt overflow:hidden van de
 *             donkere hero-sectie)
 */
export function NewStoryButton({
  childOptions,
  kind = "on-dark",
  size = "lg",
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Compute menu position from trigger rect whenever it opens
  useEffect(() => {
    if (!open) return;
    function place() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({
        top: r.bottom + 8 + window.scrollY,
        right: window.innerWidth - (r.right + window.scrollX),
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Close on outside click / escape
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current?.contains(t) ||
        menuRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (childOptions.length === 0) return null;

  if (childOptions.length === 1) {
    return (
      <EBtn kind={kind} size={size} href={`/generate/${childOptions[0].id}`}>
        + Nieuw verhaal
      </EBtn>
    );
  }

  return (
    <>
      <div ref={triggerRef} style={{ display: "inline-block" }}>
        <EBtn kind={kind} size={size} onClick={() => setOpen((v) => !v)}>
          + Nieuw verhaal
        </EBtn>
      </div>
      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: "absolute",
              top: pos.top,
              right: pos.right,
              minWidth: 260,
              background: V2.paper,
              color: V2.ink,
              border: `1px solid ${V2.paperShade}`,
              boxShadow: "0 18px 40px rgba(20,20,46,0.22)",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                fontFamily: V2.mono,
                fontSize: 10,
                color: V2.inkMute,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                borderBottom: `1px solid ${V2.paperShade}`,
              }}
            >
              Voor wie?
            </div>
            {childOptions.map((c) => (
              <Link
                key={c.id}
                href={`/generate/${c.id}`}
                role="menuitem"
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  textDecoration: "none",
                  color: V2.ink,
                  fontFamily: V2.display,
                  fontSize: 18,
                  fontStyle: "italic",
                  fontWeight: 400,
                  transition: "background .12s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = V2.paperDeep)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <Avatar name={c.name} size={32} />
                <span>{c.name}</span>
              </Link>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

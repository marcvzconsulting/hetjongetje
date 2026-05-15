"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";
import { SignOutButtonV2 } from "@/components/v2/app/SignOutButton";

type NavItem = {
  label: string;
  href: string;
  icon: string;
  active?: boolean;
  badge?: number | string;
};

type Props = {
  section: string;
  nav: NavItem[];
  adminEmail?: string;
};

/**
 * Mobile-only top bar + slide-in drawer. The desktop rail in AdminShell
 * is hidden on narrow screens; this takes its place. State is local —
 * opening locks body scroll so the drawer doesn't tug the page.
 */
export function AdminMobileNav({ section, nav, adminEmail }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Top bar — only visible on mobile (controlled via CSS in AdminShell). */}
      <div
        className="adm-topbar"
        style={{
          display: "none",
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: V2.paperDeep,
          borderBottom: `1px solid ${V2.paperShade}`,
          padding: "12px 16px",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu openen"
          style={{
            background: "transparent",
            border: `1px solid ${V2.paperShade}`,
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: V2.mono,
            fontSize: 14,
            color: V2.ink,
            lineHeight: 1,
          }}
        >
          ☰
        </button>
        <Link
          href="/admin"
          style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 10,
            textDecoration: "none",
            color: V2.ink,
          }}
        >
          <Logo size={16} />
          <span
            style={{
              fontFamily: V2.mono,
              fontSize: 9,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: V2.goldDeep,
              fontWeight: 500,
            }}
          >
            Admin
          </span>
        </Link>
        <span
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: V2.inkMute,
            marginLeft: "auto",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {section}
        </span>
      </div>

      {/* Backdrop + drawer */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigatie"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
          }}
        >
          <button
            type="button"
            aria-label="Menu sluiten"
            onClick={() => setOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(20,18,15,0.45)",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          />
          <aside
            style={{
              position: "relative",
              width: "min(86vw, 320px)",
              height: "100%",
              background: V2.paperDeep,
              borderRight: `1px solid ${V2.paperShade}`,
              padding: "20px 0 24px",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 48px -16px rgba(0,0,0,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "0 20px 18px",
                marginBottom: 16,
                borderBottom: `1px solid ${V2.paperShade}`,
              }}
            >
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 12,
                  textDecoration: "none",
                  color: V2.ink,
                }}
              >
                <Logo size={18} />
                <span
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 9,
                    letterSpacing: "0.28em",
                    textTransform: "uppercase",
                    color: V2.goldDeep,
                    fontWeight: 500,
                  }}
                >
                  Admin
                </span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Menu sluiten"
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 4,
                  cursor: "pointer",
                  fontFamily: V2.mono,
                  fontSize: 18,
                  color: V2.inkMute,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>

            <nav
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: "0 10px",
                flex: 1,
                overflowY: "auto",
              }}
            >
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    fontFamily: V2.ui,
                    fontSize: 15,
                    fontWeight: item.active ? 500 : 400,
                    color: item.active ? V2.ink : V2.inkSoft,
                    background: item.active ? V2.paper : "transparent",
                    borderLeft: `2px solid ${item.active ? V2.gold : "transparent"}`,
                    textDecoration: "none",
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 14,
                      width: 16,
                      textAlign: "center",
                      color: item.active ? V2.goldDeep : V2.inkMute,
                    }}
                  >
                    {item.icon}
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge !== undefined && item.badge !== 0 && (
                    <span
                      style={{
                        fontFamily: V2.mono,
                        fontSize: 11,
                        padding: "2px 8px",
                        background: V2.goldSoft,
                        color: V2.goldDeep,
                        fontWeight: 500,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>

            <div
              style={{
                padding: "18px 20px 0",
                borderTop: `1px solid ${V2.paperShade}`,
                marginTop: 16,
              }}
            >
              {adminEmail && (
                <div
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 10,
                    color: V2.inkMute,
                    letterSpacing: "0.06em",
                    marginBottom: 14,
                    wordBreak: "break-all",
                    lineHeight: 1.4,
                  }}
                >
                  {adminEmail}
                </div>
              )}
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                style={{
                  display: "block",
                  fontFamily: V2.ui,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "10px 12px",
                  border: `1px solid ${V2.paperShade}`,
                  color: V2.ink,
                  textDecoration: "none",
                  textAlign: "center",
                  marginBottom: 10,
                  background: V2.paper,
                }}
              >
                ← Naar app
              </Link>
              <SignOutButtonV2 />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

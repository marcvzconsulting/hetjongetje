import type { ReactNode } from "react";
import { V2 } from "@/components/v2/tokens";
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";

type Props = {
  /** Editorial number marker (A1, A2, ...) */
  number: string;
  /** Small caps line above the title */
  eyebrow: string;
  /** Big editorial page title */
  title: ReactNode;
  /** Body content — editorial, serif */
  children: ReactNode;
};

/**
 * Editorial content page wrapper voor /privacy, /voorwaarden, /over-ons, etc.
 * Geeft een consistente nav + header + footer in v2 stijl. Body content
 * wordt gerenderd als-is.
 */
export function ContentPage({ number, eyebrow, title, children }: Props) {
  return (
    <div
      className="v2-root"
      style={{
        fontFamily: V2.body,
        color: V2.ink,
        background: V2.paper,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <LandingNav />
      <main
        style={{
          flex: 1,
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: "80px 48px 120px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 80px) minmax(0, 1fr)",
            gap: 32,
            alignItems: "flex-start",
          }}
        >
          <div>
            <span
              style={{
                fontFamily: V2.display,
                fontSize: 14,
                color: V2.goldDeep,
                letterSpacing: 0.2,
              }}
            >
              {number}
            </span>
          </div>
          <div style={{ maxWidth: 720 }}>
            <p
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: V2.inkMute,
                margin: 0,
              }}
            >
              {eyebrow}
            </p>
            <h1
              style={{
                marginTop: 12,
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: "clamp(40px, 5.2vw, 64px)",
                lineHeight: 1.05,
                letterSpacing: -1.5,
                color: V2.ink,
              }}
            >
              {title}
            </h1>
            <div style={{ height: 48 }} />
            <div
              style={{
                fontFamily: V2.body,
                fontSize: 17,
                lineHeight: 1.65,
                color: V2.inkSoft,
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

/**
 * Body-stijl primitives voor binnen ContentPage — consistent typografie.
 */
export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: V2.display,
        fontWeight: 300,
        fontSize: 28,
        letterSpacing: -0.5,
        color: V2.ink,
        margin: "48px 0 16px",
        lineHeight: 1.15,
      }}
    >
      {children}
    </h2>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 18px",
        fontFamily: V2.body,
        fontSize: 17,
        lineHeight: 1.65,
        color: V2.inkSoft,
      }}
    >
      {children}
    </p>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 32px",
        fontFamily: V2.display,
        fontStyle: "italic",
        fontWeight: 300,
        fontSize: 22,
        lineHeight: 1.45,
        color: V2.inkSoft,
        letterSpacing: -0.2,
      }}
    >
      {children}
    </p>
  );
}

export function StubNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        marginTop: 40,
        padding: "18px 22px",
        background: V2.paperDeep,
        border: `1px solid ${V2.paperShade}`,
        fontFamily: V2.display,
        fontStyle: "italic",
        fontSize: 14,
        color: V2.inkMute,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  );
}

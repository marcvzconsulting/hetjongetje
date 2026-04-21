import type { ReactNode } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo, Kicker } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";

type Props = {
  /** small-caps line above the big heading */
  kicker: string;
  /** the H1 — accepts JSX so you can use italic/br */
  heading: ReactNode;
  /** form content */
  children: ReactNode;
  /** footer-style row beneath the form (e.g. "Nog geen account?") */
  footer?: ReactNode;
  /** decorative right-panel kicker (dark side) */
  rightKicker?: string;
  /** decorative right-panel title */
  rightTitle?: string;
  /** decorative right-panel meta (mono small caps) */
  rightMeta?: string;
};

/**
 * v2 editorial auth layout: split screen with form on the left and a dark
 * night-sky decorative panel on the right. Right panel is hidden below md.
 */
export function AuthShell({
  kicker,
  heading,
  children,
  footer,
  rightKicker = "Vanavond",
  rightTitle = "Noor en het maanlicht",
  rightMeta = "BLZ 6 / 6 — UITGELEZEN",
}: Props) {
  return (
    <div
      className="v2-root"
      style={{
        fontFamily: V2.body,
        color: V2.ink,
        background: V2.paper,
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr)",
      }}
    >
      <style>{`
        @media (min-width: 900px) {
          .v2-auth-grid { grid-template-columns: 1fr 1fr !important; }
          .v2-auth-right { display: flex !important; }
        }
      `}</style>
      <div
        className="v2-auth-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          minHeight: "100vh",
        }}
      >
        {/* Left: form */}
        <div
          style={{
            padding: "40px 32px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Link href="/" aria-label="Ons Verhaaltje — home">
            <Logo size={20} />
          </Link>
          <div
            style={{
              maxWidth: 400,
              width: "100%",
              margin: "auto",
              paddingTop: 32,
              paddingBottom: 32,
            }}
          >
            <Kicker>{kicker}</Kicker>
            <h1
              style={{
                fontFamily: V2.display,
                fontSize: "clamp(32px, 4vw, 40px)",
                fontWeight: 300,
                margin: "16px 0 0",
                letterSpacing: -1,
                lineHeight: 1.05,
              }}
            >
              {heading}
            </h1>
            <div style={{ marginTop: 40 }}>{children}</div>
            {footer && (
              <div
                style={{
                  marginTop: 24,
                  fontFamily: V2.ui,
                  fontSize: 13,
                  color: V2.inkMute,
                  textAlign: "center",
                }}
              >
                {footer}
              </div>
            )}
          </div>
        </div>

        {/* Right: decorative night panel */}
        <div
          className="v2-auth-right"
          style={{
            display: "none",
            background: V2.night,
            color: V2.paper,
            padding: 56,
            position: "relative",
            overflow: "hidden",
            flexDirection: "column",
            justifyContent: "flex-end",
          }}
        >
          <StarField count={18} />
          {/* moon crescent */}
          <div
            style={{
              position: "absolute",
              top: 80,
              right: 80,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: V2.gold,
              opacity: 0.92,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 80,
              right: 60,
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: V2.night,
            }}
          />
          <div style={{ position: "relative" }}>
            <div
              style={{
                fontFamily: V2.display,
                fontStyle: "italic",
                fontSize: 28,
                color: V2.gold,
                marginBottom: 12,
              }}
            >
              {rightKicker}
            </div>
            <div
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 36,
                lineHeight: 1.1,
                letterSpacing: -0.6,
              }}
            >
              {rightTitle}
            </div>
            <div
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                color: V2.nightMute,
                letterSpacing: "0.12em",
                marginTop: 16,
              }}
            >
              {rightMeta}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Logo } from "@/components/v2";
import { FooterNewsletter } from "./FooterNewsletter";

export function LandingFooter() {
  return (
    <footer
      className="lp-footer-pad"
      style={{
        padding: "48px 48px",
        borderTop: `1px solid ${V2.paperShade}`,
        fontFamily: V2.ui,
        fontSize: 13,
        background: V2.paper,
      }}
    >
      <div
        className="lp-footer-grid"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, auto)",
          gap: 32,
          alignItems: "start",
        }}
      >
        <div>
          <Logo size={16} />
          <div style={{ height: 24 }} />
          <FooterNewsletter />
        </div>
        <div
          className="lp-footer-links"
          style={{
            display: "flex",
            gap: 32,
            color: V2.inkMute,
            flexWrap: "wrap",
            justifyContent: "flex-end",
            alignSelf: "center",
          }}
        >
          <Link
            href="/privacy"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Privacy
          </Link>
          <Link
            href="/voorwaarden"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Voorwaarden
          </Link>
          <Link
            href="/veelgestelde-vragen"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            FAQ
          </Link>
          <Link
            href="/over-ons"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Over ons
          </Link>
          <Link
            href="/contact"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            Contact
          </Link>
          <a
            href="mailto:info@onsverhaaltje.nl"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            info@onsverhaaltje.nl
          </a>
        </div>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { CREAM, INK, PURPLE, DISPLAY, INK_RGB } from "./tokens";

export function PageHeader() {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-sm"
      style={{
        backgroundColor: "rgba(245, 240, 232, 0.92)",
        borderBottom: `1px solid rgba(${INK_RGB}, 0.12)`,
      }}
    >
      <div className="mx-auto max-w-[1280px] px-6 sm:px-8 md:px-16">
        <div className="flex items-center justify-between py-4 md:py-5">
          <Link
            href="/"
            className="text-[clamp(1.3rem,1.9vw,1.7rem)] tracking-[-0.01em]"
            style={{ fontFamily: DISPLAY, color: INK, fontWeight: 400 }}
          >
            Ons Verhaaltje
          </Link>
          <nav className="flex items-center gap-5 md:gap-7">
            <Link
              href="/login"
              className="text-[14px] hover:opacity-70 transition-opacity"
              style={{ color: INK }}
            >
              Inloggen
            </Link>
            <Link
              href="/register"
              className="group inline-flex items-center rounded-full px-5 py-2.5 text-[14px] font-medium tracking-wide transition-transform duration-300 hover:-translate-y-[1px]"
              style={{
                backgroundColor: PURPLE,
                color: CREAM,
                boxShadow: `0 1px 0 rgba(${INK_RGB},0.10)`,
              }}
            >
              Probeer gratis
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

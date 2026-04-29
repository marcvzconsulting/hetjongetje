import type { ReactNode } from "react";

export const metadata = {
  // Auth-group default. Individual login/register/forgot/reset pages
  // are client components and can't export metadata themselves; they
  // inherit this. The brand template ("%s · Ons Verhaaltje") still
  // applies to per-page overrides if we ever convert one to a server
  // component.
  title: "Inloggen",
  description:
    "Log in op Ons Verhaaltje — gepersonaliseerde voorleesverhalen voor je kind.",
  robots: {
    // Auth pages have nothing useful to crawl; keep them out of the index.
    index: false,
    follow: false,
  },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

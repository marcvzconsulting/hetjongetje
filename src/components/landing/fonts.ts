import { Fraunces, Manrope, Caveat } from "next/font/google";

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--ov-display",
  display: "swap",
});

export const manrope = Manrope({
  subsets: ["latin"],
  variable: "--ov-body",
  display: "swap",
});

export const caveat = Caveat({
  subsets: ["latin"],
  variable: "--ov-hand",
  display: "swap",
});

export const fontVariables = `${fraunces.variable} ${manrope.variable} ${caveat.variable}`;

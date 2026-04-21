/**
 * v2 "Dromerige Nacht" tokens — editorial, minder AI-slop.
 * Bron: design handoff bundle. Houden zo — geen oranje meer.
 * Gebruik deze in inline style / className arbitrary values.
 * De meeste waarden zijn ook beschikbaar als Tailwind utilities
 * (bg-paper, text-ink, etc.) via globals.css @theme.
 */

export const V2 = {
  // Kleuren
  paper: "#f5efe4",
  paperDeep: "#ebe2d1",
  paperShade: "#e2d7c2",
  ink: "#1f1e3a",
  inkSoft: "#2e2d52",
  inkMute: "#6c6a85",
  night: "#14142e",
  nightSoft: "#1f1f40",
  nightMute: "#8a88a8",
  gold: "#c9a961",
  goldSoft: "#e3d3a6",
  goldDeep: "#8a7340",
  rose: "#c4a5a8",
  heart: "#b04a41", // dusty ruby voor favoriet hartje — warmer dan gold, past bij editorial

  // Typografie — CSS variable references (layout.tsx loadt deze via next/font)
  display: 'var(--font-fraunces), "Lora", Georgia, serif',
  body: 'var(--font-lora), Georgia, serif',
  ui: "var(--font-inter), system-ui, sans-serif",
  mono: 'ui-monospace, "JetBrains Mono", monospace',
} as const;

export type V2Token = typeof V2;

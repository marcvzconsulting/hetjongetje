/**
 * Subtiele papierkorrel over de hele viewport — overgenomen uit de
 * design-exploration. Geeft de app dezelfde tactiele warmte als een
 * echt (voorlees)boek zonder assets: één SVG fractal-noise filter.
 *
 * pointer-events: none en aria-hidden, dus puur decoratief. z-index 60
 * ligt boven de content maar onder modals (die op 100 zitten).
 */
export function PaperGrain({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <svg
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity,
        mixBlendMode: "multiply",
        pointerEvents: "none",
        zIndex: 60,
      }}
    >
      <filter id="ov-paper-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="2"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#ov-paper-noise)" />
    </svg>
  );
}

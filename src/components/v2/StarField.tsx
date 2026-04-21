import { V2 } from "./tokens";

type Props = { count?: number; color?: string };

/**
 * Discrete sterrenveld voor donkere secties (nachthero, slot-CTA).
 * Deterministisch gepositioneerd via een simpele hash zodat elke render
 * dezelfde sterren toont (voorkomt hydration mismatch).
 */
export function StarField({ count = 12, color }: Props) {
  const c = color ?? V2.gold;
  const stars = Array.from({ length: count }, (_, i) => {
    // golden-ratio pseudo-random, but stable per index
    const x = ((i * 97) % 100) + 0.5;
    const y = ((i * 53 + 11) % 100) + 0.5;
    const s = 1 + ((i * 17) % 6) / 4;
    const o = 0.4 + ((i * 31) % 55) / 100;
    return { x, y, s, o, key: i };
  });

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {stars.map((st) => (
        <span
          key={st.key}
          style={{
            position: "absolute",
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            borderRadius: "50%",
            background: c,
            opacity: st.o,
          }}
        />
      ))}
    </div>
  );
}

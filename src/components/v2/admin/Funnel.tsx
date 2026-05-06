import { V2 } from "@/components/v2/tokens";
import type { FunnelStep } from "@/lib/admin/dashboard-stats";

/**
 * Inline SVG-free funnel visualisation. Each step is a row with a
 * filled bar whose width = count / first-step-count, plus the absolute
 * count and the conversion-rate from the immediate previous step.
 *
 * No client JS, no chart library. Reads top-down which matches how
 * users describe a funnel ("they came in, then…").
 */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = steps[0]?.count ?? 0;
  if (top === 0) {
    return (
      <div
        style={{
          padding: 24,
          background: V2.paper,
          border: `1px dashed ${V2.paperShade}`,
          fontFamily: V2.body,
          fontStyle: "italic",
          fontSize: 14,
          color: V2.inkMute,
          textAlign: "center",
        }}
      >
        Nog geen registraties sinds live-mode — funnel vult zich vanaf
        de eerste klant.
      </div>
    );
  }

  return (
    <div
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: "16px 20px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {steps.map((step, i) => {
          const width = top > 0 ? (step.count / top) * 100 : 0;
          const fromPrev = i === 0 ? null : steps[i - 1].count;
          const stepRate =
            fromPrev && fromPrev > 0
              ? Math.round((step.count / fromPrev) * 100)
              : null;
          const overallRate =
            top > 0 ? Math.round((step.count / top) * 100) : 0;
          return (
            <div key={step.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.ink,
                  marginBottom: 6,
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{step.label}</span>
                  <span
                    style={{
                      fontFamily: V2.body,
                      fontStyle: "italic",
                      fontSize: 12,
                      color: V2.inkMute,
                      marginLeft: 10,
                    }}
                  >
                    {step.description}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 12,
                    color: V2.inkSoft,
                    whiteSpace: "nowrap",
                  }}
                >
                  <strong style={{ color: V2.ink }}>{step.count}</strong>
                  <span style={{ color: V2.inkMute }}>
                    {" "}
                    · {overallRate}% van top
                  </span>
                  {stepRate !== null && (
                    <span style={{ color: V2.inkMute }}>
                      {" "}
                      · {stepRate}% vanaf vorige
                    </span>
                  )}
                </div>
              </div>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 28,
                  background: V2.paperDeep,
                  border: `1px solid ${V2.paperShade}`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${width}%`,
                    background: i === 0 ? V2.ink : V2.gold,
                    transition: "width .25s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

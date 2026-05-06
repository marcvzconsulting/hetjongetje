import { V2 } from "@/components/v2/tokens";
import type { RevenueBucket } from "@/lib/admin/dashboard-stats";

type Props = {
  buckets: RevenueBucket[];
  /** Width of the SVG viewBox; height is fixed. */
  height?: number;
};

/**
 * Inline SVG bar chart — no client JS, no library dependency. Bars are
 * drawn relative to the largest bucket so the chart auto-scales to
 * whatever range the dashboard requested.
 *
 * Rendered server-side so it's already painted on first load. Hover-
 * tooltips use the SVG <title>-element which all browsers honour.
 */
export function RevenueChart({ buckets, height = 220 }: Props) {
  if (buckets.length === 0) {
    return <EmptyChart height={height} />;
  }

  const maxCents = Math.max(...buckets.map((b) => b.totalCents), 1);
  const totalCents = buckets.reduce((s, b) => s + b.totalCents, 0);
  const totalOrders = buckets.reduce((s, b) => s + b.orderCount, 0);

  // Layout — paddings reserve room for axis labels.
  const PAD_L = 56;
  const PAD_R = 16;
  const PAD_T = 12;
  const PAD_B = 36;
  const W = 960; // logical viewBox width — SVG scales to container
  const H = height;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barGap = 6;
  const barW = Math.max(2, innerW / buckets.length - barGap);

  // Y-axis ticks — 0, max/2, max.
  const yTicks = [0, maxCents / 2, maxCents];

  // Decide which x-labels to show — too many labels overlap.
  const labelStride = Math.ceil(buckets.length / 12);

  return (
    <div
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: V2.inkMute,
          }}
        >
          Omzet over tijd
        </div>
        <div style={{ fontFamily: V2.mono, fontSize: 12, color: V2.inkSoft }}>
          Totaal: <strong>{formatEur(totalCents)}</strong> · {totalOrders}{" "}
          betaling{totalOrders === 1 ? "" : "en"}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height, display: "block" }}
        role="img"
        aria-label="Omzet over tijd"
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((v, i) => {
          const y = PAD_T + innerH - (v / maxCents) * innerH;
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke={V2.paperShade}
                strokeDasharray={i === 0 ? undefined : "2 4"}
              />
              <text
                x={PAD_L - 8}
                y={y + 4}
                textAnchor="end"
                fontFamily={V2.mono}
                fontSize={10}
                fill={V2.inkMute}
              >
                {formatEur(v, 0)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {buckets.map((b, i) => {
          const x = PAD_L + i * (barW + barGap);
          const h = (b.totalCents / maxCents) * innerH;
          const y = PAD_T + innerH - h;
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, b.totalCents > 0 ? 2 : 0)}
                fill={b.totalCents > 0 ? V2.gold : V2.paperShade}
                opacity={b.totalCents > 0 ? 1 : 0.5}
              >
                <title>
                  {b.label}: {formatEur(b.totalCents)} ({b.orderCount}
                  {b.orderCount === 1 ? " order" : " orders"})
                </title>
              </rect>
            </g>
          );
        })}

        {/* X-axis labels */}
        {buckets.map((b, i) => {
          if (i % labelStride !== 0) return null;
          const x = PAD_L + i * (barW + barGap) + barW / 2;
          return (
            <text
              key={i}
              x={x}
              y={H - 12}
              textAnchor="middle"
              fontFamily={V2.mono}
              fontSize={10}
              fill={V2.inkMute}
            >
              {b.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function EmptyChart({ height }: { height: number }) {
  return (
    <div
      style={{
        background: V2.paper,
        border: `1px dashed ${V2.paperShade}`,
        padding: 24,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: V2.body,
        fontStyle: "italic",
        fontSize: 14,
        color: V2.inkMute,
      }}
    >
      Geen betalingen in deze periode.
    </div>
  );
}

function formatEur(cents: number, decimals = 0): string {
  return `€${(cents / 100).toLocaleString("nl-NL", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

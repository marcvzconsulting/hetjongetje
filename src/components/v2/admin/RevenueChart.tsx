import { V2 } from "@/components/v2/tokens";
import type { RevenueBucket } from "@/lib/admin/dashboard-stats";

export type ChartMode = "total" | "split";

type Props = {
  buckets: RevenueBucket[];
  /** "total" draws one line; "split" draws one line per category. */
  mode?: ChartMode;
  /** Height of the SVG in CSS pixels. */
  height?: number;
};

type Series = {
  key: "total" | "credits" | "subscription" | "book";
  label: string;
  color: string;
  values: number[];
};

/**
 * Inline SVG line chart — no client JS, no library dependency.
 *
 * `mode="total"` draws a single gold line with a soft area fill so a
 * year of data with one busy month still shows the empty months
 * clearly along the x-axis.
 *
 * `mode="split"` overlays one line per Order.kind (credits / abonnement /
 * boekje), so you can see which revenue stream is moving.
 */
export function RevenueChart({ buckets, mode = "total", height = 240 }: Props) {
  if (buckets.length === 0) {
    return <EmptyChart height={height} />;
  }

  const splitSeries: Series[] = [
    {
      key: "subscription",
      label: "Abonnementen",
      color: V2.gold,
      values: buckets.map((b) => b.subscriptionCents),
    },
    {
      key: "credits",
      label: "Losse credits",
      color: V2.goldDeep,
      values: buckets.map((b) => b.creditsCents),
    },
    {
      key: "book",
      label: "Boekjes",
      color: V2.heart,
      values: buckets.map((b) => b.bookCents),
    },
  ];
  const totalSeries: Series[] = [
    {
      key: "total",
      label: "Totaal",
      color: V2.gold,
      values: buckets.map((b) => b.totalCents),
    },
  ];
  const series: Series[] =
    mode === "split"
      ? splitSeries.filter((s) => s.values.some((v) => v > 0))
      : totalSeries;

  // Drop empty series in split mode so the legend stays useful.
  if (mode === "split" && series.length === 0) {
    // Fall back to a single zero-line so the chart frame still renders.
    series.push({
      key: "total",
      label: "Totaal",
      color: V2.gold,
      values: buckets.map(() => 0),
    });
  }

  const allValues = series.flatMap((s) => s.values);
  const maxCents = Math.max(...allValues, 100);
  const totalCents = buckets.reduce((s, b) => s + b.totalCents, 0);
  const totalOrders = buckets.reduce((s, b) => s + b.orderCount, 0);

  // Layout
  const PAD_L = 64;
  const PAD_R = 24;
  const PAD_T = 16;
  const PAD_B = 40;
  const W = 960;
  const H = height;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const stepX = buckets.length > 1 ? innerW / (buckets.length - 1) : 0;

  const xAt = (i: number) =>
    buckets.length === 1 ? PAD_L + innerW / 2 : PAD_L + i * stepX;
  const yAt = (cents: number) =>
    PAD_T + innerH - (cents / maxCents) * innerH;

  const yTicks = makeTicks(maxCents, 4);
  // Show every bucket label up to ~16 (covers 12-month + 13-week views).
  // Beyond that we stride to avoid overlap on 30+ day-granularity charts.
  const labelStride = buckets.length <= 16 ? 1 : Math.ceil(buckets.length / 14);

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
          const y = yAt(v);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={y}
                y2={y}
                stroke={V2.paperShade}
                strokeDasharray={v === 0 ? undefined : "2 4"}
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

        {/* Series — area fill behind the line for the primary series only */}
        {series.map((s, idx) => {
          const points = s.values
            .map((v, i) => `${xAt(i)},${yAt(v)}`)
            .join(" ");
          const isPrimary = idx === 0;
          const areaPath = isPrimary
            ? `M ${xAt(0)},${yAt(0)} L ${s.values
                .map((v, i) => `${xAt(i)},${yAt(v)}`)
                .join(" L ")} L ${xAt(s.values.length - 1)},${yAt(0)} Z`
            : null;
          return (
            <g key={s.key}>
              {areaPath && mode === "total" && (
                <path d={areaPath} fill={s.color} fillOpacity={0.12} />
              )}
              <polyline
                points={points}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {/* Dots — one per data point, only when there's actual revenue
                  in the bucket so empty months don't get peppered. */}
              {s.values.map((v, i) =>
                v > 0 ? (
                  <circle
                    key={i}
                    cx={xAt(i)}
                    cy={yAt(v)}
                    r={3}
                    fill={s.color}
                    stroke={V2.paper}
                    strokeWidth={1.5}
                  >
                    <title>
                      {buckets[i].label} · {s.label}: {formatEur(v)}
                      {s.key === "total"
                        ? ` (${buckets[i].orderCount} order${buckets[i].orderCount === 1 ? "" : "s"})`
                        : ""}
                    </title>
                  </circle>
                ) : null,
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {buckets.map((b, i) => {
          if (i % labelStride !== 0 && i !== buckets.length - 1) return null;
          return (
            <text
              key={i}
              x={xAt(i)}
              y={H - 16}
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

      {/* Legend — only when more than one series */}
      {series.length > 1 && (
        <div
          style={{
            display: "flex",
            gap: 18,
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px dashed ${V2.paperShade}`,
            fontFamily: V2.ui,
            fontSize: 12,
            color: V2.inkSoft,
            flexWrap: "wrap",
          }}
        >
          {series.map((s) => (
            <span
              key={s.key}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 14,
                  height: 2,
                  background: s.color,
                }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Pick "nice" round Y-axis values up to max, including 0. */
function makeTicks(max: number, target: number): number[] {
  if (max <= 0) return [0];
  const step = niceStep(max / target);
  const out: number[] = [];
  for (let v = 0; v <= max + step / 2; v += step) {
    out.push(v);
  }
  return out;
}

/** Round a step-size up to the nearest 1/2/5 × power-of-10. */
function niceStep(raw: number): number {
  const exp = Math.floor(Math.log10(raw));
  const base = Math.pow(10, exp);
  const norm = raw / base;
  if (norm <= 1) return 1 * base;
  if (norm <= 2) return 2 * base;
  if (norm <= 5) return 5 * base;
  return 10 * base;
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

import { V2 } from "@/components/v2/tokens";
import type { CohortRow } from "@/lib/admin/dashboard-stats";

type Props = {
  cohorts: CohortRow[];
};

/**
 * Classic monthly-cohort retention table. Rows are signup months,
 * columns are M0…Mn (months since signup). Cells show the percentage
 * of that cohort that generated at least one story in the matching
 * month, coloured along a paper→gold scale so trends pop visually.
 *
 * Cells without data (cohort hasn't reached that age yet) render as
 * empty rather than 0% — important to not confuse "no data yet" with
 * "all churned".
 */
export function CohortTable({ cohorts }: Props) {
  if (cohorts.length === 0 || cohorts.every((c) => c.size === 0)) {
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
        Nog geen cohort-data — vult zich naarmate je gebruikers krijgt.
      </div>
    );
  }

  // Pick a column count = the longest cohort row. Zero-fill shorter
  // cohort rows by leaving cells empty.
  const cols = Math.max(...cohorts.map((c) => c.retained.length));

  return (
    <div
      style={{
        overflowX: "auto",
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: V2.body,
          fontSize: 13,
        }}
      >
        <thead>
          <tr style={{ background: V2.paperDeep }}>
            <th
              style={{
                ...thStyle,
                textAlign: "left",
                width: 110,
                position: "sticky",
                left: 0,
                background: V2.paperDeep,
              }}
            >
              Cohort
            </th>
            <th style={{ ...thStyle, width: 64, textAlign: "right" }}>Size</th>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} style={{ ...thStyle, width: 56 }}>
                M{i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((row) => (
            <tr
              key={row.cohortStart.toISOString()}
              style={{ borderTop: `1px solid ${V2.paperShade}` }}
            >
              <th
                scope="row"
                style={{
                  ...thStyle,
                  textAlign: "left",
                  fontFamily: V2.mono,
                  fontSize: 12,
                  color: V2.ink,
                  position: "sticky",
                  left: 0,
                  background: V2.paper,
                }}
              >
                {row.label}
              </th>
              <td
                style={{
                  ...tdStyle,
                  textAlign: "right",
                  fontFamily: V2.mono,
                  fontSize: 12,
                  color: V2.inkSoft,
                }}
              >
                {row.size}
              </td>
              {Array.from({ length: cols }).map((_, i) => {
                if (i >= row.retained.length) {
                  return <td key={i} style={{ ...tdStyle, color: V2.paperShade }} />;
                }
                if (row.size === 0) {
                  return <td key={i} style={{ ...tdStyle, color: V2.paperShade }}>—</td>;
                }
                const pct = (row.retained[i] / row.size) * 100;
                return (
                  <td
                    key={i}
                    style={{
                      ...tdStyle,
                      background: cellColor(pct),
                      color: pct > 60 ? V2.paper : V2.ink,
                      fontFamily: V2.mono,
                      fontSize: 12,
                    }}
                    title={`${row.retained[i]}/${row.size} actief in M${i}`}
                  >
                    {Math.round(pct)}%
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#6c6a85",
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  borderLeft: `1px solid #e2d7c2`,
};

/**
 * Map a 0–100 retention percentage to a paper→gold colour. The lowest
 * non-zero values still show a faint tint so a 5% cell is distinguishable
 * from a "no data" empty cell.
 */
function cellColor(pct: number): string {
  if (pct <= 0) return "transparent";
  if (pct < 10) return "rgba(201,169,97,0.10)";
  if (pct < 25) return "rgba(201,169,97,0.20)";
  if (pct < 40) return "rgba(201,169,97,0.35)";
  if (pct < 60) return "rgba(201,169,97,0.55)";
  if (pct < 80) return "rgba(138,115,64,0.75)";
  return "rgba(138,115,64,0.95)";
}

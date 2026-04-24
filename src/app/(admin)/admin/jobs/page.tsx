import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { V2 } from "@/components/v2/tokens";
import { Kicker, IconV2 } from "@/components/v2";

type SearchParams = Promise<{ status?: string; type?: string }>;

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function StatusPill({ status }: { status: string }) {
  let bg: string = V2.paperDeep;
  let color: string = V2.inkMute;

  if (status === "failed") {
    bg = "rgba(196,165,168,0.22)";
    color = V2.heart;
  } else if (status === "completed") {
    bg = V2.paperDeep;
    color = V2.ink;
  } else if (status === "processing") {
    bg = V2.goldSoft;
    color = V2.goldDeep;
  } else if (status === "pending") {
    bg = V2.goldSoft;
    color = V2.goldDeep;
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        background: bg,
        color,
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${V2.paperShade}`,
  background: "transparent",
  fontSize: 14,
  fontFamily: V2.body,
  color: V2.ink,
  outline: "none",
  minWidth: 180,
};

const th: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: V2.inkMute,
  padding: "14px 16px",
  textAlign: "left",
  background: V2.paperDeep,
  borderBottom: `1px solid ${V2.paperShade}`,
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${V2.paperShade}`,
  fontSize: 14,
  fontFamily: V2.body,
  color: V2.ink,
  verticalAlign: "top",
};

const mono: React.CSSProperties = {
  fontFamily: V2.mono,
  fontSize: 12,
  letterSpacing: "0.02em",
};

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status ?? "failed";
  const type = params.type ?? "";

  const where: Prisma.GenerationJobWhereInput = {};
  if (status !== "all") where.status = status;
  if (type) where.type = type;

  const [jobs, counts] = await Promise.all([
    prisma.generationJob.findMany({
      where,
      include: {
        story: {
          select: {
            id: true,
            title: true,
            childProfile: {
              select: {
                name: true,
                user: { select: { id: true, email: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.generationJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countsByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count._all])
  );

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <Kicker>Admin · systeem</Kicker>
        <h1
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: "clamp(32px, 4vw, 44px)",
            letterSpacing: -1.2,
            margin: "10px 0 0",
            lineHeight: 1.05,
          }}
        >
          Generation <span style={{ fontStyle: "italic" }}>jobs</span>
        </h1>
      </div>

      {/* Status tabs as filter tiles */}
      <div
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginBottom: 40,
        }}
      >
        {(["pending", "processing", "completed", "failed"] as const).map((s) => {
          const active = status === s;
          return (
            <Link
              key={s}
              href={`/admin/jobs?status=${s}`}
              style={{
                padding: "20px 22px",
                background: active ? V2.ink : V2.paper,
                color: active ? V2.paper : V2.ink,
                border: `1px solid ${active ? V2.ink : V2.paperShade}`,
                textDecoration: "none",
                display: "block",
              }}
            >
              <div
                style={{
                  fontFamily: V2.ui,
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: active ? V2.goldSoft : V2.inkMute,
                }}
              >
                {s}
              </div>
              <div
                style={{
                  fontFamily: V2.display,
                  fontWeight: 300,
                  fontSize: 36,
                  lineHeight: 1,
                  marginTop: 10,
                  letterSpacing: -0.8,
                  color: active ? V2.gold : V2.ink,
                }}
              >
                {countsByStatus[s] ?? 0}
              </div>
            </Link>
          );
        })}
      </div>

      <form
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          alignItems: "flex-end",
          padding: "20px 0",
          borderTop: `1px solid ${V2.paperShade}`,
          borderBottom: `1px solid ${V2.paperShade}`,
          marginBottom: 24,
        }}
      >
        <div>
          <label
            style={{
              fontFamily: V2.ui,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: V2.inkMute,
              display: "block",
              marginBottom: 4,
            }}
          >
            Status
          </label>
          <select name="status" defaultValue={status} style={selectStyle}>
            <option value="all">Alle statussen</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div>
          <label
            style={{
              fontFamily: V2.ui,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: V2.inkMute,
              display: "block",
              marginBottom: 4,
            }}
          >
            Type
          </label>
          <select name="type" defaultValue={type} style={selectStyle}>
            <option value="">Alle types</option>
            <option value="text">Text</option>
            <option value="illustration">Illustration</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
        <button
          type="submit"
          style={{
            padding: "10px 22px",
            background: V2.ink,
            color: V2.paper,
            border: "none",
            fontFamily: V2.ui,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.2,
            cursor: "pointer",
            borderRadius: 2,
          }}
        >
          Filter →
        </button>
      </form>

      <p
        style={{
          fontFamily: V2.mono,
          fontSize: 11,
          color: V2.inkMute,
          letterSpacing: "0.06em",
          marginBottom: 12,
        }}
      >
        {jobs.length} resultaten {jobs.length === 200 && "(max 200)"}
      </p>

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
          }}
        >
          <thead>
            <tr>
              <th style={th}>Status</th>
              <th style={th}>Type</th>
              <th style={{ ...th, textAlign: "right" }}>Progress</th>
              <th style={th}>Verhaal / Kind / User</th>
              <th style={th}>Foutmelding</th>
              <th style={th}>Gestart</th>
              <th style={th}>Afgerond</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id}>
                <td style={td}>
                  <StatusPill status={job.status} />
                </td>
                <td style={{ ...td, ...mono, color: V2.ink }}>{job.type}</td>
                <td
                  style={{
                    ...td,
                    textAlign: "right",
                    ...mono,
                    color: V2.ink,
                  }}
                >
                  {job.progress}%
                </td>
                <td style={td}>
                  <div style={{ color: V2.ink, fontSize: 14 }}>
                    {job.story.title}
                  </div>
                  <div
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 12,
                      color: V2.inkMute,
                      marginTop: 4,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {job.story.childProfile.name} ·{" "}
                    {job.story.childProfile.user.email}
                  </div>
                  <Link
                    href={`/admin/users/${job.story.childProfile.user.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 6,
                      fontFamily: V2.ui,
                      fontSize: 12,
                      color: V2.ink,
                      textDecoration: "underline",
                      textUnderlineOffset: 3,
                    }}
                  >
                    user <IconV2 name="arrow" size={12} />
                  </Link>
                </td>
                <td style={{ ...td, maxWidth: 320 }}>
                  {job.errorMessage ? (
                    <span
                      style={{
                        fontFamily: V2.mono,
                        fontSize: 12,
                        color: V2.heart,
                        wordBreak: "break-all",
                        lineHeight: 1.5,
                      }}
                    >
                      {job.errorMessage}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontFamily: V2.body,
                        fontStyle: "italic",
                        color: V2.inkMute,
                        fontSize: 13,
                      }}
                    >
                      -
                    </span>
                  )}
                </td>
                <td style={{ ...td, ...mono, color: V2.inkSoft }}>
                  {formatDateTime(job.createdAt)}
                </td>
                <td style={{ ...td, ...mono, color: V2.inkSoft }}>
                  {formatDateTime(job.completedAt)}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    ...td,
                    textAlign: "center",
                    padding: "48px 16px",
                    fontStyle: "italic",
                    color: V2.inkMute,
                  }}
                >
                  Geen jobs gevonden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

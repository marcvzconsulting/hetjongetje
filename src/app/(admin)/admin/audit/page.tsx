import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";

type SearchParams = Promise<{
  actor?: string;
  action?: string;
  targetType?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

const PAGE_SIZE = 50;

function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "-";
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function parseDate(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (isNaN(d.getTime())) return undefined;
  if (endOfDay) d.setHours(23, 59, 59, 999);
  return d;
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

const inputStyle: React.CSSProperties = {
  ...selectStyle,
};

const labelStyle: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: V2.inkMute,
  display: "block",
  marginBottom: 4,
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

function ActionPill({ action }: { action: string }) {
  const isDelete = /\.delete$/.test(action) || action.includes("suspend");
  const isCreate = /\.(add|approve|create|upsert)$/.test(action);
  const bg = isDelete
    ? "rgba(196,165,168,0.22)"
    : isCreate
      ? V2.goldSoft
      : V2.paperDeep;
  const color = isDelete ? V2.heart : isCreate ? V2.goldDeep : V2.ink;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        background: bg,
        color,
        fontFamily: V2.mono,
        fontSize: 12,
        letterSpacing: "0.02em",
      }}
    >
      {action}
    </span>
  );
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const actor = params.actor?.trim() ?? "";
  const action = params.action?.trim() ?? "";
  const targetType = params.targetType?.trim() ?? "";
  const fromStr = params.from?.trim() ?? "";
  const toStr = params.to?.trim() ?? "";
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (actor) where.adminEmail = { contains: actor, mode: "insensitive" };
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (targetType) where.targetType = targetType;
  const from = parseDate(fromStr);
  const to = parseDate(toStr, true);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [entries, total, distinctTargetTypes] = await Promise.all([
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      distinct: ["targetType"],
      select: { targetType: true },
      where: { targetType: { not: null } },
      orderBy: { targetType: "asc" },
    }),
  ]);

  const session = await auth();
  const nav = ADMIN_NAV.map((n) => ({ ...n, active: n.href === "/admin/audit" }));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const queryString = (overrides: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    if (actor) sp.set("actor", actor);
    if (action) sp.set("action", action);
    if (targetType) sp.set("targetType", targetType);
    if (fromStr) sp.set("from", fromStr);
    if (toStr) sp.set("to", toStr);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") sp.delete(k);
      else sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <AdminShell
      section="Systeem"
      title={
        <>
          Audit <span style={{ fontStyle: "italic" }}>log</span>
        </>
      }
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.inkSoft,
          marginBottom: 24,
          maxWidth: 720,
        }}
      >
        Append-only logboek van alle admin-mutaties. Rijen blijven bestaan, ook
        als de admin-account later verwijderd wordt — daarom staat e-mail/naam
        denormalised in de rij zelf.
      </p>

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
          <label style={labelStyle}>Admin (e-mail)</label>
          <input
            type="text"
            name="actor"
            defaultValue={actor}
            placeholder="bv. marc"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Actie</label>
          <input
            type="text"
            name="action"
            defaultValue={action}
            placeholder="bv. user.approve"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Target-type</label>
          <select name="targetType" defaultValue={targetType} style={selectStyle}>
            <option value="">Alle types</option>
            {distinctTargetTypes
              .map((d) => d.targetType)
              .filter((t): t is string => Boolean(t))
              .map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Van</label>
          <input
            type="date"
            name="from"
            defaultValue={fromStr}
            style={{ ...inputStyle, minWidth: 150 }}
          />
        </div>
        <div>
          <label style={labelStyle}>Tot</label>
          <input
            type="date"
            name="to"
            defaultValue={toStr}
            style={{ ...inputStyle, minWidth: 150 }}
          />
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
        {(actor || action || targetType || fromStr || toStr) && (
          <Link
            href="/admin/audit"
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.inkMute,
              textDecoration: "underline",
              textUnderlineOffset: 3,
              padding: "10px 0",
            }}
          >
            wis filters
          </Link>
        )}
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
        {total} resultaten · pagina {page} / {totalPages}
      </p>

      <div
        className="adm-cards-wrap"
        style={{
          overflowX: "auto",
          background: V2.paper,
          border: `1px solid ${V2.paperShade}`,
        }}
      >
        <table
          className="adm-cards"
          style={{
            width: "100%",
            minWidth: 820,
            borderCollapse: "collapse",
            fontFamily: V2.body,
          }}
        >
          <thead>
            <tr>
              <th style={th}>Wanneer</th>
              <th style={th}>Admin</th>
              <th style={th}>Actie</th>
              <th style={th}>Target</th>
              <th style={th}>Metadata</th>
              <th style={th}>IP</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td
                  style={{ ...td, ...mono, color: V2.inkSoft, whiteSpace: "nowrap" }}
                  data-label="Wanneer"
                >
                  {formatDateTime(e.createdAt)}
                </td>
                <td style={td} data-label="Admin" data-stack="true">
                  <div style={{ color: V2.ink, fontSize: 14 }}>
                    {e.adminName || <em style={{ color: V2.inkMute }}>—</em>}
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
                    {e.adminEmail}
                  </div>
                </td>
                <td style={td} data-label="Actie">
                  <ActionPill action={e.action} />
                </td>
                <td style={td} data-label="Target" data-stack="true">
                  {e.targetType ? (
                    <>
                      <div style={{ ...mono, color: V2.ink }}>{e.targetType}</div>
                      {e.targetId && (
                        <div
                          style={{
                            ...mono,
                            color: V2.inkMute,
                            marginTop: 4,
                            wordBreak: "break-all",
                          }}
                        >
                          {e.targetType === "user" ? (
                            <Link
                              href={`/admin/users/${e.targetId}`}
                              style={{ color: V2.ink, textDecoration: "underline", textUnderlineOffset: 3 }}
                            >
                              {e.targetId}
                            </Link>
                          ) : (
                            e.targetId
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <span style={{ color: V2.inkMute, fontStyle: "italic" }}>—</span>
                  )}
                </td>
                <td style={{ ...td, maxWidth: 360 }} data-label="Metadata" data-stack="true">
                  {e.metadata ? (
                    <pre
                      style={{
                        margin: 0,
                        fontFamily: V2.mono,
                        fontSize: 11,
                        color: V2.inkSoft,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        lineHeight: 1.5,
                        maxHeight: 140,
                        overflow: "auto",
                      }}
                    >
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  ) : (
                    <span style={{ color: V2.inkMute, fontStyle: "italic" }}>—</span>
                  )}
                </td>
                <td style={{ ...td, ...mono, color: V2.inkSoft }} data-label="IP">{e.ip ?? "-"}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    ...td,
                    textAlign: "center",
                    padding: "48px 16px",
                    fontStyle: "italic",
                    color: V2.inkMute,
                  }}
                >
                  Geen audit-entries gevonden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            marginTop: 24,
            fontFamily: V2.ui,
            fontSize: 13,
          }}
        >
          {page > 1 && (
            <Link
              href={`/admin/audit${queryString({ page: page - 1 })}`}
              style={{
                padding: "8px 16px",
                border: `1px solid ${V2.paperShade}`,
                color: V2.ink,
                textDecoration: "none",
                background: V2.paper,
              }}
            >
              ← Vorige
            </Link>
          )}
          <span
            style={{
              padding: "8px 16px",
              fontFamily: V2.mono,
              fontSize: 12,
              color: V2.inkMute,
            }}
          >
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/admin/audit${queryString({ page: page + 1 })}`}
              style={{
                padding: "8px 16px",
                border: `1px solid ${V2.paperShade}`,
                color: V2.ink,
                textDecoration: "none",
                background: V2.paper,
              }}
            >
              Volgende →
            </Link>
          )}
        </div>
      )}
    </AdminShell>
  );
}

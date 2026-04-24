import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { V2 } from "@/components/v2/tokens";
import { Kicker, IconV2 } from "@/components/v2";

type SearchParams = Promise<{
  q?: string;
  plan?: string;
  activity?: string;
  status?: string;
  sort?: string;
  deleted?: string;
}>;

function daysSince(date: Date | null, now: number): number | null {
  if (!date) return null;
  return Math.floor((now - date.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date | null): string {
  if (!date) return "-";
  return date.toISOString().slice(0, 10);
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
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 0",
  border: "none",
  borderBottom: `1px solid ${V2.paperShade}`,
  background: "transparent",
  fontSize: 14,
  fontFamily: V2.body,
  color: V2.ink,
  outline: "none",
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
  fontSize: 13,
  letterSpacing: "0.02em",
};

function StatusPill({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          background: V2.paperDeep,
          color: V2.ink,
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        <IconV2 name="check" size={12} color={V2.ink} />
        Approved
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "3px 10px",
          background: "rgba(196,165,168,0.2)",
          color: V2.heart,
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Suspended
      </span>
    );
  }
  // pending
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        background: V2.goldSoft,
        color: V2.goldDeep,
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      Pending
    </span>
  );
}

function SubscriptionPill({
  plan,
  status,
}: {
  plan: string;
  status: string;
}) {
  const isPaid = plan !== "free";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        background: isPaid ? V2.goldSoft : V2.paperDeep,
        color: isPaid ? V2.goldDeep : V2.inkMute,
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {plan} · {status}
    </span>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const plan = params.plan ?? "";
  const activity = params.activity ?? "";
  const status = params.status ?? "";
  const sort = params.sort ?? "created_desc";
  const deletedEmail = params.deleted ?? "";
  const nowMs = new Date().getTime();

  const where: Prisma.UserWhereInput = { role: "user" };
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (plan) {
    if (plan === "none") {
      where.subscription = { is: null };
    } else {
      where.subscription = { is: { plan } };
    }
  }
  if (activity === "inactive_30d") {
    const cutoff = new Date(nowMs - 30 * 24 * 60 * 60 * 1000);
    where.OR = [
      ...(where.OR ?? []),
      { lastLoginAt: null },
      { lastLoginAt: { lt: cutoff } },
    ];
  } else if (activity === "active_7d") {
    const cutoff = new Date(nowMs - 7 * 24 * 60 * 60 * 1000);
    where.lastLoginAt = { gte: cutoff };
  }

  const orderBy: Prisma.UserOrderByWithRelationInput =
    sort === "created_asc"
      ? { createdAt: "asc" }
      : sort === "login_desc"
        ? { lastLoginAt: { sort: "desc", nulls: "last" } }
        : sort === "email_asc"
          ? { email: "asc" }
          : { createdAt: "desc" };

  const users = await prisma.user.findMany({
    where,
    orderBy,
    include: {
      subscription: true,
      _count: { select: { children: true } },
    },
    take: 200,
  });

  // Fetch story counts per user via child profiles
  const storyCounts = await prisma.story.groupBy({
    by: ["childProfileId"],
    _count: { _all: true },
  });
  const countByChild = new Map(
    storyCounts.map((r) => [r.childProfileId, r._count._all])
  );
  const childUserMap = await prisma.childProfile.findMany({
    select: { id: true, userId: true },
  });
  const storiesByUser = new Map<string, number>();
  for (const child of childUserMap) {
    const n = countByChild.get(child.id) ?? 0;
    storiesByUser.set(child.userId, (storiesByUser.get(child.userId) ?? 0) + n);
  }

  const exportHref = `/api/admin/users/export${q || plan || activity ? `?${new URLSearchParams({ ...(q && { q }), ...(plan && { plan }), ...(activity && { activity }) }).toString()}` : ""}`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 20,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <div>
          <Kicker>Admin · accounts</Kicker>
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
            Gebruikers
          </h1>
        </div>
        <a
          href={exportHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            border: `1px solid ${V2.ink}`,
            color: V2.ink,
            fontFamily: V2.ui,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: 0.2,
            textDecoration: "none",
            background: "transparent",
          }}
        >
          <IconV2 name="arrow" size={14} />
          CSV export
        </a>
      </div>

      {deletedEmail && (
        <div
          style={{
            marginBottom: 24,
            padding: "14px 20px",
            background: "rgba(201,169,97,0.14)",
            borderLeft: `2px solid ${V2.gold}`,
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
          }}
        >
          Account <strong>{deletedEmail}</strong> is verwijderd.
        </div>
      )}

      <form
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          marginBottom: 28,
          padding: "20px 0",
          borderTop: `1px solid ${V2.paperShade}`,
          borderBottom: `1px solid ${V2.paperShade}`,
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
            Zoek
          </label>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="email of naam"
            style={inputStyle}
          />
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
            Status
          </label>
          <select name="status" defaultValue={status} style={selectStyle}>
            <option value="">Alle statussen</option>
            <option value="pending">Pending</option>
            <option value="approved">Goedgekeurd</option>
            <option value="suspended">Opgeschort</option>
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
            Abonnement
          </label>
          <select name="plan" defaultValue={plan} style={selectStyle}>
            <option value="">Alle abonnementen</option>
            <option value="none">Geen abonnement</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
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
            Activiteit
          </label>
          <select name="activity" defaultValue={activity} style={selectStyle}>
            <option value="">Alle activiteit</option>
            <option value="active_7d">Actief (7 dagen)</option>
            <option value="inactive_30d">Inactief (30+ dagen)</option>
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
            Sorteer
          </label>
          <select name="sort" defaultValue={sort} style={selectStyle}>
            <option value="created_desc">Nieuwste eerst</option>
            <option value="created_asc">Oudste eerst</option>
            <option value="login_desc">Recent ingelogd</option>
            <option value="email_asc">Email A-Z</option>
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
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
        </div>
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
        {users.length} resultaten {users.length === 200 && "(max 200)"}
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
              <th style={th}>Gebruiker</th>
              <th style={th}>Status</th>
              <th style={{ ...th, textAlign: "right" }}>Tegoed</th>
              <th style={th}>Abonnement</th>
              <th style={{ ...th, textAlign: "right" }}>Kinderen</th>
              <th style={{ ...th, textAlign: "right" }}>Verhalen</th>
              <th style={th}>Laatste login</th>
              <th style={th}>Inactief</th>
              <th style={th}>Aangemaakt</th>
              <th style={th} />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const inactive = daysSince(u.lastLoginAt, nowMs);
              const lowCredits = u.storyCredits === 0 && u.status === "approved";
              return (
                <tr key={u.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 500, color: V2.ink }}>{u.name}</div>
                    <div
                      style={{
                        fontFamily: V2.mono,
                        fontSize: 12,
                        color: V2.inkMute,
                        marginTop: 2,
                      }}
                    >
                      {u.email}
                    </div>
                  </td>
                  <td style={td}>
                    <StatusPill status={u.status} />
                  </td>
                  <td style={{ ...td, textAlign: "right", ...mono, color: lowCredits ? V2.heart : V2.ink, fontWeight: lowCredits ? 600 : 400 }}>
                    {u.storyCredits}
                  </td>
                  <td style={td}>
                    {u.subscription ? (
                      <SubscriptionPill
                        plan={u.subscription.plan}
                        status={u.subscription.status}
                      />
                    ) : (
                      <span
                        style={{
                          fontFamily: V2.body,
                          fontStyle: "italic",
                          fontSize: 13,
                          color: V2.inkMute,
                        }}
                      >
                        geen
                      </span>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right", ...mono, color: V2.ink }}>
                    {u._count.children}
                  </td>
                  <td style={{ ...td, textAlign: "right", ...mono, color: V2.ink }}>
                    {storiesByUser.get(u.id) ?? 0}
                  </td>
                  <td style={{ ...td, ...mono, color: V2.inkSoft }}>
                    {formatDate(u.lastLoginAt)}
                  </td>
                  <td style={{ ...td, ...mono }}>
                    {inactive === null ? (
                      <span style={{ color: V2.inkMute, fontStyle: "italic", fontFamily: V2.body }}>
                        nooit
                      </span>
                    ) : inactive > 30 ? (
                      <span style={{ color: V2.heart, fontWeight: 600 }}>
                        {inactive}d
                      </span>
                    ) : (
                      <span style={{ color: V2.inkMute }}>{inactive}d</span>
                    )}
                  </td>
                  <td style={{ ...td, ...mono, color: V2.inkSoft }}>
                    {formatDate(u.createdAt)}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Link
                      href={`/admin/users/${u.id}`}
                      style={{
                        fontFamily: V2.ui,
                        fontSize: 13,
                        fontWeight: 500,
                        color: V2.ink,
                        textDecoration: "underline",
                        textUnderlineOffset: 3,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      Bekijk <IconV2 name="arrow" size={12} />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    ...td,
                    textAlign: "center",
                    padding: "48px 16px",
                    fontStyle: "italic",
                    color: V2.inkMute,
                  }}
                >
                  Geen gebruikers gevonden
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

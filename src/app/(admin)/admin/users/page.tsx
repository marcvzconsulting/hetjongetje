import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

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
  if (!date) return "—";
  return date.toISOString().slice(0, 10);
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gebruikers</h1>
        <a
          href={exportHref}
          className="rounded-lg border border-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          ⬇ CSV export
        </a>
      </div>

      {deletedEmail && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Account <strong>{deletedEmail}</strong> is verwijderd.
        </div>
      )}

      <form className="mb-6 grid gap-3 md:grid-cols-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Zoek op email of naam"
          className="rounded-lg border border-muted px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-lg border border-muted px-3 py-2 text-sm"
        >
          <option value="">Alle statussen</option>
          <option value="pending">⏳ Pending (nog goedkeuren)</option>
          <option value="approved">✓ Goedgekeurd</option>
          <option value="suspended">🚫 Opgeschort</option>
        </select>
        <select
          name="plan"
          defaultValue={plan}
          className="rounded-lg border border-muted px-3 py-2 text-sm"
        >
          <option value="">Alle abonnementen</option>
          <option value="none">Geen abonnement</option>
          <option value="free">Free</option>
          <option value="basic">Basic</option>
          <option value="premium">Premium</option>
        </select>
        <select
          name="activity"
          defaultValue={activity}
          className="rounded-lg border border-muted px-3 py-2 text-sm"
        >
          <option value="">Alle activiteit</option>
          <option value="active_7d">Actief (7 dagen)</option>
          <option value="inactive_30d">Inactief (30+ dagen)</option>
        </select>
        <div className="flex gap-2">
          <select
            name="sort"
            defaultValue={sort}
            className="flex-1 rounded-lg border border-muted px-3 py-2 text-sm"
          >
            <option value="created_desc">Nieuwste eerst</option>
            <option value="created_asc">Oudste eerst</option>
            <option value="login_desc">Recent ingelogd</option>
            <option value="email_asc">Email A-Z</option>
          </select>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
          >
            Filter
          </button>
        </div>
      </form>

      <p className="mb-3 text-xs text-muted-foreground">
        {users.length} resultaten {users.length === 200 && "(max 200)"}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-muted bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-muted bg-muted/30">
            <tr className="text-left">
              <th className="px-4 py-3 font-semibold">Gebruiker</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Tegoed</th>
              <th className="px-4 py-3 font-semibold">Abonnement</th>
              <th className="px-4 py-3 font-semibold text-right">Kinderen</th>
              <th className="px-4 py-3 font-semibold text-right">Verhalen</th>
              <th className="px-4 py-3 font-semibold">Laatste login</th>
              <th className="px-4 py-3 font-semibold">Inactief</th>
              <th className="px-4 py-3 font-semibold">Aangemaakt</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const inactive = daysSince(u.lastLoginAt, nowMs);
              return (
                <tr key={u.id} className="border-b border-muted last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : u.status === "suspended"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {u.status === "approved"
                        ? "✓"
                        : u.status === "suspended"
                          ? "🚫"
                          : "⏳"}{" "}
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span
                      className={
                        u.storyCredits === 0 && u.status === "approved"
                          ? "font-semibold text-red-600"
                          : ""
                      }
                    >
                      {u.storyCredits}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.subscription ? (
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                        {u.subscription.plan} · {u.subscription.status}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">geen</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {u._count.children}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {storiesByUser.get(u.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatDate(u.lastLoginAt)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {inactive === null ? (
                      <span className="text-xs text-muted-foreground">nooit</span>
                    ) : inactive > 30 ? (
                      <span className="text-xs font-medium text-red-600">
                        {inactive}d
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {inactive}d
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatDate(u.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Bekijk →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
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

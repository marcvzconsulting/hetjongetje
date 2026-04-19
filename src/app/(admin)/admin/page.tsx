import Link from "next/link";
import { prisma } from "@/lib/db";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-muted bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    newUsers30d,
    pendingUsers,
    suspendedUsers,
    totalChildren,
    totalStories,
    stories7d,
    activeSubs,
    failedJobs,
    processingJobs,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "user" } }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { role: "user", status: "pending" } }),
    prisma.user.count({ where: { role: "user", status: "suspended" } }),
    prisma.childProfile.count(),
    prisma.story.count(),
    prisma.story.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.subscription.count({ where: { status: "active", plan: { not: "free" } } }),
    prisma.generationJob.count({ where: { status: "failed" } }),
    prisma.generationJob.count({ where: { status: "processing" } }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      {pendingUsers > 0 && (
        <Link
          href="/admin/users?status=pending"
          className="mb-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-5 transition-colors hover:bg-amber-100"
        >
          <div>
            <div className="text-xs uppercase tracking-wide text-amber-800">
              Actie vereist
            </div>
            <div className="mt-1 text-lg font-bold text-amber-900">
              {pendingUsers} {pendingUsers === 1 ? "account wacht" : "accounts wachten"} op
              goedkeuring
            </div>
          </div>
          <span className="text-sm font-semibold text-amber-900">
            Bekijken →
          </span>
        </Link>
      )}

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Gebruikers
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Totaal" value={totalUsers} />
          <Stat label="Nieuw (7 dagen)" value={newUsers7d} />
          <Stat label="Nieuw (30 dagen)" value={newUsers30d} />
          <Stat
            label="Wacht op goedkeuring"
            value={pendingUsers}
            sub={pendingUsers > 0 ? "Check /admin/users?status=pending" : undefined}
          />
          <Stat label="Opgeschort" value={suspendedUsers} />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Content
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Kindprofielen" value={totalChildren} />
          <Stat label="Verhalen totaal" value={totalStories} />
          <Stat label="Verhalen (7 dagen)" value={stories7d} />
        </div>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Abonnementen
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat
            label="Actieve betaalde abo's"
            value={activeSubs}
            sub="placeholder — nog geen betaalprovider gekoppeld"
          />
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Systeem
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Stat label="Jobs in progress" value={processingJobs} />
          <Stat
            label="Mislukte jobs"
            value={failedJobs}
            sub={failedJobs > 0 ? "Check /admin/jobs" : undefined}
          />
        </div>
      </div>

      <div className="mt-8 flex gap-3">
        <Link
          href="/admin/users"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
        >
          Gebruikers bekijken →
        </Link>
        <Link
          href="/admin/jobs"
          className="rounded-lg border border-muted px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          Jobs bekijken →
        </Link>
      </div>
    </div>
  );
}

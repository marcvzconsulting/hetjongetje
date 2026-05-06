import { prisma } from "@/lib/db";

/**
 * Estimated AI cost per generated story — Claude (text) ≈ €0.05 plus
 * fal.ai (illustrations) ≈ €0.10. Rounded; only used for marge-indicators
 * on the admin dashboard, not for accounting.
 */
export const AI_COST_CENTS_PER_STORY = 15;

export type DashboardStats = Awaited<ReturnType<typeof loadDashboardStats>>;

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
function startOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function startOfYear(now: Date): Date {
  return new Date(now.getFullYear(), 0, 1);
}

/**
 * Mollie's interval strings ("1 month", "12 months", "14 days") → number
 * of months for MRR-normalisation. Falls back to 1 for anything we
 * don't recognise so the row is at least counted, not silently dropped.
 */
function intervalToMonths(interval: string): number {
  const m = interval.trim().toLowerCase().match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)$/);
  if (!m) return 1;
  const n = parseInt(m[1], 10);
  const unit = m[2];
  if (unit.startsWith("month")) return n;
  if (unit.startsWith("year")) return n * 12;
  if (unit.startsWith("week")) return n / 4.345; // approx
  if (unit.startsWith("day")) return n / 30.44; // approx
  return 1;
}

export async function loadDashboardStats() {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  // Run all reads in parallel — Neon round-trips are the bottleneck.
  const [
    revenueToday,
    revenueMonth,
    revenueYear,
    revenueLifetime,
    paidOrdersToday,
    paidOrdersMonth,
    storiesToday,
    storiesMonth,
    storiesLifetime,
    newUsersToday,
    newUsersMonth,
    activeSubs,
    cancelledThisMonth,
    plans,
    pendingUsers,
    failedJobs,
    processingJobs,
    topCustomers,
    recentPaidOrders,
    recentRegistrations,
    recentSubscriptionEvents,
  ] = await Promise.all([
    sumOrderAmount({ paidAt: { gte: today } }),
    sumOrderAmount({ paidAt: { gte: monthStart } }),
    sumOrderAmount({ paidAt: { gte: yearStart } }),
    sumOrderAmount({}),
    prisma.order.count({ where: { status: "paid", paidAt: { gte: today } } }),
    prisma.order.count({ where: { status: "paid", paidAt: { gte: monthStart } } }),
    prisma.story.count({ where: { createdAt: { gte: today } } }),
    prisma.story.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.story.count(),
    prisma.user.count({ where: { role: "user", createdAt: { gte: today } } }),
    prisma.user.count({ where: { role: "user", createdAt: { gte: monthStart } } }),
    prisma.subscription.findMany({
      where: {
        status: "active",
        plan: { not: "free" },
        mollieSubscriptionId: { not: null },
      },
      select: { id: true, plan: true, startedAt: true },
    }),
    prisma.subscription.count({
      where: { status: "cancelled", cancelledAt: { gte: monthStart } },
    }),
    prisma.subscriptionPlan.findMany(),
    prisma.user.count({ where: { role: "user", status: "pending" } }),
    prisma.generationJob.count({ where: { status: "failed" } }),
    prisma.generationJob.count({ where: { status: "processing" } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { status: "paid" },
      _sum: { amountCents: true },
      _count: { _all: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 10,
    }),
    prisma.order.findMany({
      where: { status: "paid" },
      orderBy: { paidAt: "desc" },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.user.findMany({
      where: { role: "user" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    prisma.subscription.findMany({
      where: {
        OR: [
          { mollieSubscriptionId: { not: null } },
          { cancelledAt: { not: null } },
        ],
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  // MRR — sum of normalised monthly contribution per active subscription.
  const planMap = new Map(plans.map((p) => [p.code, p]));
  const subsByPlan: Record<string, number> = {};
  let mrrCents = 0;
  for (const sub of activeSubs) {
    const plan = planMap.get(sub.plan);
    if (!plan) continue;
    const months = intervalToMonths(plan.interval);
    if (months > 0) mrrCents += plan.priceCents / months;
    subsByPlan[sub.plan] = (subsByPlan[sub.plan] ?? 0) + 1;
  }
  const arrCents = mrrCents * 12;

  // Top customers — re-fetch user details for the top-10 row set.
  const topUserIds = topCustomers.map((c) => c.userId);
  const topUserDetails = topUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: topUserIds } },
        select: {
          id: true,
          name: true,
          email: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              mollieSubscriptionId: true,
            },
          },
        },
      })
    : [];
  const topUserMap = new Map(topUserDetails.map((u) => [u.id, u]));
  const topCustomersHydrated = topCustomers.map((c) => {
    const u = topUserMap.get(c.userId);
    return {
      userId: c.userId,
      name: u?.name ?? "(verwijderd)",
      email: u?.email ?? "",
      paidOrders: c._count._all,
      lifetimeCents: c._sum.amountCents ?? 0,
      activeSubscription:
        u?.subscription?.status === "active" &&
        !!u.subscription.mollieSubscriptionId &&
        u.subscription.plan !== "free"
          ? u.subscription.plan
          : null,
    };
  });

  // Activity feed — union, sort, take 20.
  type Event = {
    at: Date;
    kind: "order" | "register" | "sub-started" | "sub-cancelled";
    title: string;
    detail: string;
    userId?: string;
  };
  const events: Event[] = [];
  for (const o of recentPaidOrders) {
    if (!o.paidAt) continue;
    events.push({
      at: o.paidAt,
      kind: "order",
      title: `Betaling — €${(o.amountCents / 100).toFixed(2).replace(".", ",")}`,
      detail: `${o.user?.name ?? "?"} · ${o.kind === "subscription" ? "abonnement" : o.kind === "credits" ? "credits" : o.kind}`,
      userId: o.userId,
    });
  }
  for (const u of recentRegistrations) {
    events.push({
      at: u.createdAt,
      kind: "register",
      title: "Nieuwe registratie",
      detail: `${u.name} · ${u.email}`,
      userId: u.id,
    });
  }
  for (const s of recentSubscriptionEvents) {
    if (s.cancelledAt) {
      events.push({
        at: s.cancelledAt,
        kind: "sub-cancelled",
        title: "Abonnement opgezegd",
        detail: `${s.user?.name ?? "?"} · ${s.plan}`,
        userId: s.userId,
      });
    } else if (s.mollieSubscriptionId && s.startedAt) {
      events.push({
        at: s.startedAt,
        kind: "sub-started",
        title: "Abonnement gestart",
        detail: `${s.user?.name ?? "?"} · ${s.plan}`,
        userId: s.userId,
      });
    }
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  const activity = events.slice(0, 20);

  // Margin estimate — only stories cost AI right now (book PDFs are
  // priced per print). Not perfect but a useful directional number.
  const aiCostMonthCents = storiesMonth * AI_COST_CENTS_PER_STORY;
  const aiCostYearCents = storiesLifetime * AI_COST_CENTS_PER_STORY;
  const grossMarginMonthCents = revenueMonth - aiCostMonthCents;

  return {
    revenue: {
      todayCents: revenueToday,
      monthCents: revenueMonth,
      yearCents: revenueYear,
      lifetimeCents: revenueLifetime,
      paidOrdersToday,
      paidOrdersMonth,
    },
    activity: {
      newUsersToday,
      newUsersMonth,
      storiesToday,
      storiesMonth,
      storiesLifetime,
    },
    subscriptions: {
      activeTotal: activeSubs.length,
      byPlan: subsByPlan,
      cancelledThisMonth,
      mrrCents,
      arrCents,
    },
    margin: {
      aiCostMonthCents,
      aiCostYearCents,
      grossMarginMonthCents,
    },
    health: {
      pendingUsers,
      failedJobs,
      processingJobs,
    },
    topCustomers: topCustomersHydrated,
    events: activity,
    plans, // expose so the dashboard can show plan names not codes
  };
}

async function sumOrderAmount(where: object): Promise<number> {
  const r = await prisma.order.aggregate({
    where: { status: "paid", ...where },
    _sum: { amountCents: true },
  });
  return r._sum.amountCents ?? 0;
}

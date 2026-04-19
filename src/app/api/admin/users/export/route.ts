import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const plan = searchParams.get("plan") ?? "";
  const activity = searchParams.get("activity") ?? "";

  const where: Prisma.UserWhereInput = { role: "user" };
  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
    ];
  }
  if (plan === "none") {
    where.subscription = { is: null };
  } else if (plan) {
    where.subscription = { is: { plan } };
  }
  if (activity === "inactive_30d") {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    where.OR = [
      ...(where.OR ?? []),
      { lastLoginAt: null },
      { lastLoginAt: { lt: cutoff } },
    ];
  } else if (activity === "active_7d") {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    where.lastLoginAt = { gte: cutoff };
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      subscription: true,
      _count: { select: { children: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

  const header = [
    "email",
    "name",
    "locale",
    "status",
    "story_credits",
    "plan",
    "subscription_status",
    "subscription_started_at",
    "subscription_ends_at",
    "children",
    "stories",
    "last_login_at",
    "created_at",
  ];

  const rows = users.map((u) =>
    [
      u.email,
      u.name,
      u.locale,
      u.status,
      u.storyCredits,
      u.subscription?.plan ?? "",
      u.subscription?.status ?? "",
      u.subscription?.startedAt?.toISOString() ?? "",
      u.subscription?.endsAt?.toISOString() ?? "",
      u._count.children,
      storiesByUser.get(u.id) ?? 0,
      u.lastLoginAt?.toISOString() ?? "",
      u.createdAt.toISOString(),
    ]
      .map(csvEscape)
      .join(",")
  );

  const csv = [header.join(","), ...rows].join("\n");
  const timestamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-${timestamp}.csv"`,
    },
  });
}

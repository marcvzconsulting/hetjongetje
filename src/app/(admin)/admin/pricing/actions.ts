"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin/audit-log";

/**
 * Server actions for /admin/pricing — CRUD on the credit-pack and
 * subscription-plan catalogs. Every mutation writes an audit-log row so
 * we can later trace who changed what.
 *
 * Prices are submitted as decimal-euro strings ("12.00", "1.50") and
 * stored as integer cents to avoid float drift downstream.
 */

async function captureAdmin() {
  const session = await requireAdmin();
  return {
    adminId: session.user.id,
    adminEmail: session.user.email ?? "",
    adminName: session.user.name ?? "",
  };
}

function parsePriceToCents(raw: string): number {
  const cleaned = raw.replace(",", ".").trim();
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("invalid_price");
  }
  return Math.round(n * 100);
}

function trim(value: FormDataEntryValue | null): string {
  return String(value ?? "").trim();
}

function asInt(value: FormDataEntryValue | null, fallback = 0): number {
  const n = parseInt(String(value ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

// ── Credit packs ────────────────────────────────────────────────

export async function createCreditPackAction(formData: FormData) {
  const audit = await captureAdmin();

  const code = trim(formData.get("code")).toLowerCase();
  const name = trim(formData.get("name"));
  const creditAmount = asInt(formData.get("creditAmount"), -1);
  let priceCents: number;
  try {
    priceCents = parsePriceToCents(trim(formData.get("price")));
  } catch {
    redirect("/admin/pricing?error=price");
  }

  if (!code || !name || creditAmount <= 0) {
    redirect("/admin/pricing?error=missing");
  }

  const description = trim(formData.get("description")) || null;
  const vatRate = asInt(formData.get("vatRate"), 21);
  const sortOrder = asInt(formData.get("sortOrder"), 0);
  const badge = trim(formData.get("badge")) || null;

  try {
    const pack = await prisma.creditPack.create({
      data: {
        code,
        name,
        description,
        creditAmount,
        priceCents,
        vatRate,
        sortOrder,
        badge,
      },
    });
    await logAdminAction({
      ...audit,
      action: "pricing.credit_pack.create",
      targetType: "credit_pack",
      targetId: pack.id,
      metadata: { code, creditAmount, priceCents },
    });
  } catch {
    redirect("/admin/pricing?error=duplicate_code");
  }

  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=created");
}

export async function updateCreditPackAction(formData: FormData) {
  const audit = await captureAdmin();
  const id = trim(formData.get("id"));
  if (!id) redirect("/admin/pricing");

  const before = await prisma.creditPack.findUnique({ where: { id } });
  if (!before) redirect("/admin/pricing?error=not_found");

  let priceCents: number;
  try {
    priceCents = parsePriceToCents(trim(formData.get("price")));
  } catch {
    redirect("/admin/pricing?error=price");
  }

  const data = {
    name: trim(formData.get("name")) || before!.name,
    description: trim(formData.get("description")) || null,
    creditAmount: asInt(formData.get("creditAmount"), before!.creditAmount),
    priceCents,
    vatRate: asInt(formData.get("vatRate"), before!.vatRate),
    active: trim(formData.get("active")) === "1",
    sortOrder: asInt(formData.get("sortOrder"), before!.sortOrder),
    badge: trim(formData.get("badge")) || null,
  };

  await prisma.creditPack.update({ where: { id }, data });
  await logAdminAction({
    ...audit,
    action: "pricing.credit_pack.update",
    targetType: "credit_pack",
    targetId: id,
    metadata: {
      before: {
        priceCents: before!.priceCents,
        creditAmount: before!.creditAmount,
        active: before!.active,
      },
      after: {
        priceCents: data.priceCents,
        creditAmount: data.creditAmount,
        active: data.active,
      },
    },
  });
  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=updated");
}

export async function deleteCreditPackAction(formData: FormData) {
  const audit = await captureAdmin();
  const id = trim(formData.get("id"));
  if (!id) redirect("/admin/pricing");

  const pack = await prisma.creditPack.findUnique({ where: { id } });
  if (!pack) redirect("/admin/pricing");

  await prisma.creditPack.delete({ where: { id } });
  await logAdminAction({
    ...audit,
    action: "pricing.credit_pack.delete",
    targetType: "credit_pack",
    targetId: id,
    metadata: { code: pack.code, name: pack.name },
  });
  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=deleted");
}

// ── Subscription plans ──────────────────────────────────────────

export async function createSubscriptionPlanAction(formData: FormData) {
  const audit = await captureAdmin();

  const code = trim(formData.get("code")).toLowerCase();
  const name = trim(formData.get("name"));
  const interval = trim(formData.get("interval"));
  let priceCents: number;
  try {
    priceCents = parsePriceToCents(trim(formData.get("price")));
  } catch {
    redirect("/admin/pricing?error=price");
  }

  if (!code || !name || !interval) {
    redirect("/admin/pricing?error=missing");
  }

  const description = trim(formData.get("description")) || null;
  const vatRate = asInt(formData.get("vatRate"), 21);
  const sortOrder = asInt(formData.get("sortOrder"), 0);
  const badge = trim(formData.get("badge")) || null;
  const creditsRaw = trim(formData.get("creditsPerInterval"));
  const creditsPerInterval = creditsRaw === "" ? null : asInt(creditsRaw, 0);
  const featuresRaw = trim(formData.get("features"));
  const features = featuresRaw
    ? featuresRaw
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  try {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        code,
        name,
        description,
        priceCents,
        vatRate,
        interval,
        creditsPerInterval,
        sortOrder,
        badge,
        features,
      },
    });
    await logAdminAction({
      ...audit,
      action: "pricing.subscription_plan.create",
      targetType: "subscription_plan",
      targetId: plan.id,
      metadata: { code, priceCents, interval },
    });
  } catch {
    redirect("/admin/pricing?error=duplicate_code");
  }

  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=created");
}

export async function updateSubscriptionPlanAction(formData: FormData) {
  const audit = await captureAdmin();
  const id = trim(formData.get("id"));
  if (!id) redirect("/admin/pricing");

  const before = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!before) redirect("/admin/pricing?error=not_found");

  let priceCents: number;
  try {
    priceCents = parsePriceToCents(trim(formData.get("price")));
  } catch {
    redirect("/admin/pricing?error=price");
  }

  const creditsRaw = trim(formData.get("creditsPerInterval"));
  const creditsPerInterval =
    creditsRaw === "" ? null : asInt(creditsRaw, before!.creditsPerInterval ?? 0);
  const featuresRaw = trim(formData.get("features"));
  const features = featuresRaw
    ? featuresRaw
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];

  const data = {
    name: trim(formData.get("name")) || before!.name,
    description: trim(formData.get("description")) || null,
    priceCents,
    vatRate: asInt(formData.get("vatRate"), before!.vatRate),
    interval: trim(formData.get("interval")) || before!.interval,
    creditsPerInterval,
    active: trim(formData.get("active")) === "1",
    sortOrder: asInt(formData.get("sortOrder"), before!.sortOrder),
    badge: trim(formData.get("badge")) || null,
    features,
  };

  await prisma.subscriptionPlan.update({ where: { id }, data });
  await logAdminAction({
    ...audit,
    action: "pricing.subscription_plan.update",
    targetType: "subscription_plan",
    targetId: id,
    metadata: {
      before: {
        priceCents: before!.priceCents,
        active: before!.active,
        interval: before!.interval,
      },
      after: {
        priceCents: data.priceCents,
        active: data.active,
        interval: data.interval,
      },
    },
  });
  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=updated");
}

export async function deleteSubscriptionPlanAction(formData: FormData) {
  const audit = await captureAdmin();
  const id = trim(formData.get("id"));
  if (!id) redirect("/admin/pricing");

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) redirect("/admin/pricing");

  await prisma.subscriptionPlan.delete({ where: { id } });
  await logAdminAction({
    ...audit,
    action: "pricing.subscription_plan.delete",
    targetType: "subscription_plan",
    targetId: id,
    metadata: { code: plan.code, name: plan.name },
  });
  revalidatePath("/admin/pricing");
  redirect("/admin/pricing?saved=deleted");
}

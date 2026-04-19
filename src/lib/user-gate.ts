import { prisma } from "@/lib/db";

export type UserGate = {
  role: string;
  status: string;
  storyCredits: number;
  isApproved: boolean;
  isAdmin: boolean;
  canGenerate: boolean;
};

export async function loadUserGate(userId: string): Promise<UserGate | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, status: true, storyCredits: true },
  });
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const isApproved = isAdmin || user.status === "approved";
  const canGenerate = isAdmin || (isApproved && user.storyCredits > 0);
  return { ...user, isApproved, isAdmin, canGenerate };
}

/**
 * Atomic credit decrement. Returns true if a credit was successfully
 * reserved (row updated), false if the user has 0 credits or isn't allowed.
 * Admins bypass the check and always succeed without mutating the counter.
 */
export async function reserveStoryCredit(userId: string): Promise<{
  ok: boolean;
  reason?: "not_approved" | "no_credits" | "not_found";
}> {
  const gate = await loadUserGate(userId);
  if (!gate) return { ok: false, reason: "not_found" };
  if (gate.isAdmin) return { ok: true };
  if (!gate.isApproved) return { ok: false, reason: "not_approved" };

  const res = await prisma.user.updateMany({
    where: {
      id: userId,
      status: "approved",
      storyCredits: { gt: 0 },
    },
    data: { storyCredits: { decrement: 1 } },
  });

  if (res.count === 0) return { ok: false, reason: "no_credits" };
  return { ok: true };
}

/**
 * Give a user back one story credit. Used when generation fails so we
 * don't charge users for AI calls they never saw output from.
 */
export async function refundStoryCredit(userId: string): Promise<void> {
  const gate = await loadUserGate(userId);
  if (!gate || gate.isAdmin) return;
  await prisma.user.update({
    where: { id: userId },
    data: { storyCredits: { increment: 1 } },
  });
}

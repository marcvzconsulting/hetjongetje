"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/admin/audit-log";

async function adminContext() {
  await requireAdmin();
  const session = await auth();
  if (!session?.user?.id || !session.user.email) throw new Error("no_session");
  return {
    adminId: session.user.id,
    adminEmail: session.user.email,
    adminName: session.user.name ?? null,
  };
}

export async function closeContactMessageAction(formData: FormData) {
  const ctx = await adminContext();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.contactMessage.update({
    where: { id },
    data: {
      status: "closed",
      closedAt: new Date(),
      closedById: ctx.adminId,
      closedBy: ctx.adminEmail,
    },
  });
  await logAdminAction({
    ...ctx,
    action: "contact_message.close",
    targetType: "contact_message",
    targetId: id,
  });
  revalidatePath("/admin/inbox");
}

export async function reopenContactMessageAction(formData: FormData) {
  const ctx = await adminContext();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.contactMessage.update({
    where: { id },
    data: {
      status: "open",
      closedAt: null,
      closedById: null,
      closedBy: null,
    },
  });
  await logAdminAction({
    ...ctx,
    action: "contact_message.reopen",
    targetType: "contact_message",
    targetId: id,
  });
  revalidatePath("/admin/inbox");
}

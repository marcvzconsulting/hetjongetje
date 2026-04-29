import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

/**
 * Append an entry to the admin audit log. Best-effort: failure to write
 * the log MUST NEVER break the underlying admin action. We catch and
 * console.error any error so the admin still gets the operation done.
 *
 * The admin's email and name are stored as plain strings (not a relation)
 * so the row stays meaningful after the admin user is later deleted.
 *
 * Convention for `action` keys: `<entity>.<verb>` snake_case verbs.
 * Examples:
 *   user.approve, user.suspend, user.unsuspend, user.set_credits,
 *   user.delete, password.set_directly, password.reset_link_generated,
 *   subscription.upsert, subscription.delete, story.set_landing_slot,
 *   note.add, note.delete.
 */
export async function logAdminAction(opts: {
  adminId: string;
  adminEmail: string;
  adminName?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    let ip: string | undefined;
    try {
      const h = await headers();
      const xff = h.get("x-forwarded-for");
      ip =
        (xff ? xff.split(",")[0].trim() : null) ||
        h.get("x-real-ip") ||
        undefined;
    } catch {
      // headers() throws outside a request scope — we tolerate that.
    }
    await prisma.adminAuditLog.create({
      data: {
        adminId: opts.adminId,
        adminEmail: opts.adminEmail,
        adminName: opts.adminName ?? "",
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        metadata: opts.metadata
          ? (opts.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        ip,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write admin audit entry", err);
  }
}

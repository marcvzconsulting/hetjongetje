import { requireAdmin } from "@/lib/admin";

/**
 * Admin-gate + audit-identity bundle. Wraps `requireAdmin` and pulls
 * the actor fields the audit-log helper needs out of the session, so
 * server actions can do `const { audit } = await requireAdminWithIdentity()`
 * and pass the audit blob straight to `logAdminAction`.
 *
 * Returns:
 *   - session: the full NextAuth session (admin guaranteed)
 *   - audit:   { adminId, adminEmail, adminName, actorId } for log calls
 */
export async function requireAdminWithIdentity() {
  const session = await requireAdmin();
  return {
    session,
    audit: {
      actorId: session.user.id,
      adminId: session.user.id,
      adminEmail: session.user.email ?? "",
      adminName: session.user.name ?? "",
    },
  };
}

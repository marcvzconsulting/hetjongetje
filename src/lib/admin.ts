import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Server-side guard for admin pages. Redirects non-admins to /dashboard
 * (logged in but not admin) or /login (not logged in). Returns the session
 * so the caller has the admin's id/name/email on hand.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "admin") redirect("/dashboard");
  return session;
}

export function isAdmin(
  session: { user?: { role?: string } } | null | undefined
): boolean {
  return session?.user?.role === "admin";
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { USER_ROLES } from "@/lib/types/user";

/**
 * Server-side guard for admin pages. Redirects non-admins to /dashboard
 * (logged in but not admin) or /login (not logged in). Returns the session
 * so the caller has the admin's id/name/email on hand.
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== USER_ROLES.admin) redirect("/dashboard");
  return session;
}

/**
 * Server-side guard voor app-pagina's en server-actions die een ingelogde
 * gebruiker nodig hebben. Redirect naar /login bij geen sessie, geeft
 * anders het user-id terug. Op één plek zodat we later de redirect-target
 * of "no session"-handling centraal kunnen aanpassen.
 */
export async function requireUser(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

export function isAdmin(
  session: { user?: { role?: string } } | null | undefined
): boolean {
  return session?.user?.role === USER_ROLES.admin;
}

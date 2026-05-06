import { requireAdmin } from "@/lib/admin";

/**
 * Admin route-group layout. Guards every /admin/* page with
 * requireAdmin() — the actual visual chrome lives in AdminShell, which
 * each page composes itself so it can pass the right `active` and
 * page-specific actions.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}

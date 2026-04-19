import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { SignOutButton } from "@/components/ui/sign-out-button";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();

  return (
    <div className="min-h-full">
      <header className="border-b border-muted bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="text-lg font-bold">
              🔧 Admin
            </Link>
            <nav className="flex gap-4 text-sm font-medium">
              <Link
                href="/admin"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Dashboard
              </Link>
              <Link
                href="/admin/users"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Gebruikers
              </Link>
              <Link
                href="/admin/jobs"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Jobs
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {session.user?.email}
            </span>
            <Link
              href="/dashboard"
              className="rounded-lg border border-muted px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              Naar app
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

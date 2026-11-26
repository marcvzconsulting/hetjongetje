import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { AdhocMailForm } from "./AdhocMailForm";

export const dynamic = "force-dynamic";

/**
 * Losse, persoonlijke mail in de huisstijl, verstuurd via Brevo vanaf
 * info@onsverhaaltje.nl. Bedoeld voor een handvol ontvangers (bv. iemand
 * die vastliep bij het inloggen); voor bulk is er de nieuwsbrief.
 */
export default async function LosseMailPage() {
  await requireAdmin();
  const session = await auth();
  const nav = ADMIN_NAV.map((n) => ({ ...n, active: n.href === "/admin/losse-mail" }));

  return (
    <AdminShell
      section="E-mail"
      eyebrow="Persoonlijk"
      title="Losse mail sturen"
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      <AdhocMailForm />
    </AdminShell>
  );
}

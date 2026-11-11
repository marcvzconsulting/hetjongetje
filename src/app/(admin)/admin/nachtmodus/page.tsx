import { auth } from "@/lib/auth";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { loadReaderSettings } from "@/lib/reader/settings";
import { NachtmodusForm } from "./NachtmodusForm";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function NachtmodusPage() {
  // Niet alleen op de layout leunen: een layout draait niet bij elke
  // (deel)render opnieuw, dus elke adminpagina controleert zelf.
  await requireAdmin();
  const session = await auth();
  const settings = await loadReaderSettings();

  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/nachtmodus",
  }));

  return (
    <AdminShell
      section="Instellingen"
      title="Nachtmodus"
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      <div style={{ maxWidth: 820 }}>
        <NachtmodusForm initial={settings} />
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 12,
            color: V2.inkMute,
            margin: "14px 2px 0",
            lineHeight: 1.5,
          }}
        >
          Wordt gelogd in Audit. De lezer haalt de instelling op bij het
          openen van een verhaal.
        </p>
      </div>
    </AdminShell>
  );
}

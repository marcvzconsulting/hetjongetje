import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker } from "@/components/v2";
import { AppShell } from "@/components/v2/app/AppShell";
import { ProfileWizard } from "@/components/profile/profile-wizard";

export default async function NewProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  const credits = gate && !gate.isAdmin ? gate.storyCredits : null;

  return (
    <AppShell
      userName={session.user.name ?? "jij"}
      credits={credits}
      nav={[
        { label: "Bibliotheek", href: "/dashboard" },
        { label: "Account", href: "/account" },
      ]}
    >
      <div
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "40px 40px 80px",
        }}
      >
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            marginBottom: 28,
          }}
        >
          <Link
            href="/dashboard"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            ← Terug naar bibliotheek
          </Link>
        </div>

        <div style={{ marginBottom: 40 }}>
          <Kicker>Nieuw profiel</Kicker>
          <h1
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 44,
              letterSpacing: -1.2,
              margin: "12px 0 0",
              lineHeight: 1.05,
            }}
          >
            Vertel ons wie{" "}
            <span style={{ fontStyle: "italic" }}>het verhaal</span> wordt.
          </h1>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 16,
              color: V2.inkSoft,
              marginTop: 14,
              maxWidth: 540,
              lineHeight: 1.55,
            }}
          >
            Naam, leeftijd, knuffel, de mensen om hen heen. Dit doe je maar
            één keer, daarna weten wij genoeg om elke avond een nieuw verhaal
            te maken.
          </p>
        </div>

        <div
          style={{
            background: V2.paperDeep,
            border: `1px solid ${V2.paperShade}`,
            padding: 32,
          }}
        >
          <ProfileWizard />
        </div>
      </div>
    </AppShell>
  );
}

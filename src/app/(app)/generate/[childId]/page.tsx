import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { AppShell } from "@/components/v2/app/AppShell";
import { GenerateWizardV2 } from "@/components/v2/generation/GenerateWizardV2";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function GeneratePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  if (!gate?.isApproved) redirect("/dashboard");

  const credits = gate.isAdmin ? null : gate.storyCredits;

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) notFound();

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
            marginBottom: 8,
          }}
        >
          <Link
            href="/dashboard"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            ← Terug naar bibliotheek
          </Link>
        </div>

        <GenerateWizardV2
          child={{
            id: child.id,
            name: child.name,
            dateOfBirth: child.dateOfBirth.toISOString(),
            gender: child.gender,
            hairColor: child.hairColor,
            hairStyle: child.hairStyle,
            eyeColor: child.eyeColor,
            skinColor: child.skinColor,
            wearsGlasses: child.wearsGlasses,
            hasFreckles: child.hasFreckles,
            interests: child.interests,
            pets: child.pets as {
              name: string;
              type: string;
              description?: string;
            }[] | null,
            friends: child.friends as {
              name: string;
              relationship: string;
              description?: string;
            }[] | null,
            favoriteThings: child.favoriteThings as {
              color?: string;
              food?: string;
              toy?: string;
              place?: string;
            } | null,
            fears: child.fears,
            mainCharacterType: child.mainCharacterType,
            mainCharacterDescription: child.mainCharacterDescription,
            approvedCharacterPrompt: child.approvedCharacterPrompt,
            loraUrl: child.loraStatus === "ready" ? child.loraUrl : null,
            loraTriggerWord:
              child.loraStatus === "ready" ? child.loraTriggerWord : null,
          }}
        />
      </div>
    </AppShell>
  );
}

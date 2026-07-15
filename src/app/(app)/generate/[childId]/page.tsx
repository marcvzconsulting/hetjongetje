import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { AppShell, buildAppNav } from "@/components/v2/app/AppShell";
import {
  GenerateWizardV2,
  type SequelInfo,
} from "@/components/v2/generation/GenerateWizardV2";

interface Props {
  params: Promise<{ childId: string }>;
  searchParams: Promise<{ vervolgVan?: string | string[] }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function GeneratePage({ params, searchParams }: Props) {
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

  // Vervolg-verhaal: ?vervolgVan=[storyId] opent de wizard voorgevuld met
  // de keuzes van dat verhaal. Eigendom wordt geverifieerd (verhaal hoort
  // bij dit kind, en dit kind hoort bij de ingelogde user — dat laatste is
  // hierboven al gecheckt); anders negeren we de parameter stilletjes.
  const { vervolgVan } = await searchParams;
  let sequel: SequelInfo | undefined;
  if (typeof vervolgVan === "string" && UUID_RE.test(vervolgVan)) {
    // Alleen id/title/generationParams zijn nodig voor de prefill — de
    // paginateksten haalt de stories-route zelf op bij het genereren.
    const prevStory = await prisma.story.findFirst({
      where: { id: vervolgVan, childProfileId: childId },
      select: { id: true, title: true, generationParams: true },
    });
    if (prevStory) {
      const prevParams =
        (prevStory.generationParams as Record<string, unknown> | null) ?? {};
      // Slice als vangnet voor legacy generationParams zonder lengtecap,
      // zodat een uit de kluiten gewassen waarde nooit integraal in de
      // client-props belandt.
      const str = (v: unknown) =>
        typeof v === "string" ? v.slice(0, 500) : undefined;
      sequel = {
        storyId: prevStory.id,
        title: prevStory.title,
        params: {
          setting: str(prevParams.setting),
          mainCharacterType: str(prevParams.mainCharacterType),
          mainCharacterDescription: str(prevParams.mainCharacterDescription),
          adventureType: str(prevParams.adventureType),
          mood: str(prevParams.mood),
          occasion: str(prevParams.occasion),
        },
      };
    }
  }

  return (
    <AppShell
      userName={session.user.name ?? "jij"}
      isAdmin={session.user.role === "admin"}
      credits={credits}
      nav={buildAppNav()}
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
          sequel={sequel}
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

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateAge } from "@/lib/utils/age";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker } from "@/components/v2";
import { Avatar } from "@/components/v2/Avatar";
import { AppShell } from "@/components/v2/app/AppShell";
import { ProfileEditor } from "./client";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  const credits = gate && !gate.isAdmin ? gate.storyCredits : null;

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
    include: { _count: { select: { stories: true } } },
  });

  if (!child) notFound();

  const age = calculateAge(child.dateOfBirth);

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
        {/* Breadcrumb */}
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

        {/* Header */}
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "center",
            marginBottom: 40,
            flexWrap: "wrap",
          }}
        >
          <Avatar name={child.name} size={80} />
          <div>
            <Kicker>Profiel</Kicker>
            <h1
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 44,
                letterSpacing: -1.2,
                margin: "8px 0 0",
                lineHeight: 1.05,
              }}
            >
              <span style={{ fontStyle: "italic" }}>{child.name}</span>, {age}{" "}
              {age === 1 ? "jaar" : "jaar"}
            </h1>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 15,
                color: V2.inkMute,
                margin: "4px 0 0",
              }}
            >
              Hoe beter wij {child.name} kennen, hoe echter het verhaal.
            </p>
          </div>
        </div>

        {/* Editor — inner form still in v1 styling, wrapped in v2 paper container */}
        <div
          style={{
            background: V2.paperDeep,
            border: `1px solid ${V2.paperShade}`,
            padding: 32,
          }}
        >
          <ProfileEditor
            child={{
              id: child.id,
              name: child.name,
              dateOfBirth: child.dateOfBirth.toISOString().split("T")[0],
              age,
              gender: child.gender,
              hairColor: child.hairColor || "",
              hairStyle: child.hairStyle || "",
              eyeColor: child.eyeColor || "",
              skinColor: child.skinColor || "",
              wearsGlasses: child.wearsGlasses,
              hasFreckles: child.hasFreckles,
              interests: child.interests,
              pets: (child.pets as { name: string; type: string }[]) || [],
              friends:
                (child.friends as { name: string; relationship: string }[]) ||
                [],
              favoriteThings:
                (child.favoriteThings as {
                  color: string;
                  food: string;
                  toy: string;
                  place: string;
                }) || { color: "", food: "", toy: "", place: "" },
              fears: child.fears,
              mainCharacterType: child.mainCharacterType,
              mainCharacterDescription: child.mainCharacterDescription || "",
              storyCount: child._count.stories,
              approvedPreviewUrl: child.approvedPreviewUrl || null,
              hasApprovedPrompt: !!child.approvedCharacterPrompt,
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}

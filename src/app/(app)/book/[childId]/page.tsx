import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker } from "@/components/v2";
import { StarField } from "@/components/v2/StarField";
import { AppShell } from "@/components/v2/app/AppShell";
import {
  BookBuilderV2,
  type BookStoryData,
} from "@/components/v2/book/BookBuilderV2";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function BookPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  const credits = gate && !gate.isAdmin ? gate.storyCredits : null;

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
    include: {
      stories: {
        where: { status: "ready" },
        orderBy: { createdAt: "desc" },
        include: {
          pages: {
            orderBy: { pageNumber: "asc" },
            select: {
              text: true,
              illustrationUrl: true,
            },
          },
        },
      },
    },
  });

  if (!child) notFound();

  // Load existing draft (if any). One draft-status book per child.
  const draft = await prisma.storyBook.findFirst({
    where: { childProfileId: childId, printStatus: "draft" },
    include: {
      bookStories: {
        orderBy: { sortOrder: "asc" },
        select: { storyId: true },
      },
    },
  });

  const stories: BookStoryData[] = child.stories.map((s) => {
    const firstContentPage = s.pages.find(
      (p) => p.text && p.text.trim().length > 0
    );
    const firstIllustrationPage = s.pages.find(
      (p) => p.illustrationUrl && p.illustrationUrl.length > 0
    );
    return {
      id: s.id,
      title: s.title,
      createdAt: s.createdAt.toISOString(),
      // pages in DB + 2 for title/ending framing
      pageCount: Math.max(s.pages.length, 1),
      firstIllustrationUrl: firstIllustrationPage?.illustrationUrl ?? null,
      firstParagraph:
        firstContentPage?.text?.slice(0, 400) ??
        "Een verhaal uit dit jaar.",
    };
  });

  return (
    <AppShell
      userName={session.user.name ?? "jij"}
      credits={credits}
      nav={[
        { label: "Bibliotheek", href: "/dashboard" },
        { label: "Account", href: "/account" },
      ]}
    >
      {/* Breadcrumb */}
      <div
        className="app-section-pad"
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "20px 40px 0",
          fontFamily: V2.ui,
          fontSize: 13,
          color: V2.inkMute,
        }}
      >
        <Link
          href="/dashboard"
          style={{ color: V2.inkMute, textDecoration: "none" }}
        >
          ← Bibliotheek
        </Link>
        <span style={{ margin: "0 10px" }}>/</span>
        <span style={{ color: V2.ink }}>
          Boek samenstellen voor {child.name}
        </span>
      </div>

      {/* Nacht hero */}
      <section
        className="app-section-pad"
        style={{
          background: V2.night,
          color: V2.paper,
          padding: "48px 40px 56px",
          position: "relative",
          overflow: "hidden",
          marginTop: 24,
        }}
      >
        <StarField count={14} />
        <div
          style={{
            position: "relative",
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          <Kicker color={V2.gold}>Een boekje dat echt bestaat</Kicker>
          <h1
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(36px, 4.6vw, 52px)",
              margin: "14px 0 0",
              letterSpacing: -1.4,
              lineHeight: 1.05,
              color: V2.paper,
            }}
          >
            Verzamel{" "}
            <span style={{ fontStyle: "italic" }}>{child.name}</span>
            &rsquo;s verhalen tot{" "}
            <span style={{ fontStyle: "italic", color: V2.gold }}>
              een echt boek.
            </span>
          </h1>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 16,
              color: V2.nightMute,
              marginTop: 16,
              maxWidth: 620,
              lineHeight: 1.55,
            }}
          >
            Gedrukt op stevig papier. Harde kaft, zachte rug. Een boek dat
            jullie, over tien jaar, nog steeds uit de kast halen.
          </p>
        </div>
      </section>

      <BookBuilderV2
        childId={child.id}
        childName={child.name}
        stories={stories}
        initialDraft={
          draft
            ? {
                title: draft.title,
                subtitle: draft.subtitle ?? "",
                dedication: draft.dedication ?? "",
                coverStyle: (draft.coverStyle as "night" | "cream" | "linen") ?? "night",
                format: (draft.format as "soft" | "hard" | "deluxe") ?? "hard",
                selectedStoryIds: draft.bookStories.map((b) => b.storyId),
              }
            : null
        }
      />
    </AppShell>
  );
}

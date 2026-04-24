import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateAge } from "@/lib/utils/age";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import { Avatar } from "@/components/v2/Avatar";
import { StarField } from "@/components/v2/StarField";
import { AppShell } from "@/components/v2/app/AppShell";
import { StoryLibraryV2 } from "@/components/v2/story/StoryLibraryV2";
import { NewStoryButton } from "@/components/v2/generation/NewStoryButton";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  if (!gate) redirect("/login");

  // ── Pending / suspended: waiting state ─────────────────────
  if (!gate.isApproved) {
    return (
      <AppShell
        userName={session.user.name ?? "jij"}
        credits={null}
        nav={[
          { label: "Bibliotheek", href: "/dashboard", active: true },
          { label: "Account", href: "/account" },
        ]}
      >
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 40px" }}>
          {gate.status === "suspended" ? (
            <WaitingCard
              kicker="Account opgeschort"
              title="Tijdelijk geblokkeerd"
              body="Je account is opgeschort. Neem contact met ons op voor meer informatie."
            />
          ) : (
            <WaitingCard
              kicker="Nog even geduld"
              title={
                <>
                  We bekijken je account{" "}
                  <span style={{ fontStyle: "italic" }}>zo snel mogelijk.</span>
                </>
              }
              body="Bedankt voor je registratie! Zodra we je hebben goedgekeurd, kun je hier kindprofielen aanmaken en verhalen genereren."
            />
          )}
        </div>
      </AppShell>
    );
  }

  // ── Approved: load data ────────────────────────────────────
  const children = await prisma.childProfile.findMany({
    where: { userId: session.user.id },
    include: {
      stories: {
        orderBy: { createdAt: "desc" },
        where: { status: "ready" },
        include: {
          pages: {
            where: { illustrationUrl: { not: null } },
            orderBy: { pageNumber: "asc" },
            take: 1,
            select: { illustrationUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const creditsToShow = gate.isAdmin ? null : gate.storyCredits;

  return (
    <AppShell
      userName={session.user.name ?? "jij"}
      credits={creditsToShow}
      nav={[
        { label: "Bibliotheek", href: "/dashboard", active: true },
        { label: "Account", href: "/account" },
      ]}
    >
      {/* Hero strip */}
      <section
        style={{
          background: V2.night,
          color: V2.paper,
          padding: "56px 40px 64px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <StarField count={14} />
        <div
          style={{
            position: "relative",
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div>
            <Kicker color={V2.gold}>
              Hallo {session.user.name?.split(" ")[0] ?? "daar"}
            </Kicker>
            <h1
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: "clamp(36px, 4.8vw, 56px)",
                margin: "20px 0 0",
                letterSpacing: -1.4,
                lineHeight: 1.05,
                color: V2.paper,
              }}
            >
              {children.length === 0 ? (
                <>
                  Vanavond begint{" "}
                  <span style={{ fontStyle: "italic", color: V2.gold }}>
                    jullie eerste verhaal.
                  </span>
                </>
              ) : (
                <>
                  Welk verhaaltje wordt het{" "}
                  <span style={{ fontStyle: "italic", color: V2.gold }}>
                    vanavond?
                  </span>
                </>
              )}
            </h1>
          </div>
          <NewStoryButton
            childOptions={children.map((c) => ({ id: c.id, name: c.name }))}
            kind="on-dark"
            size="lg"
          />
        </div>
      </section>

      {/* Child list / empty state */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "56px 40px 80px",
        }}
      >
        {children.length === 0 ? (
          <EmptyChildren />
        ) : (
          children.map((child, idx) => {
            const age = calculateAge(child.dateOfBirth);
            const serialized = child.stories.map((s) => ({
              id: s.id,
              title: s.title,
              setting: s.setting,
              isFavorite: s.isFavorite,
              createdAt: s.createdAt.toISOString(),
              coverUrl: s.pages[0]?.illustrationUrl ?? null,
            }));
            return (
              <div key={child.id} style={{ marginBottom: idx === children.length - 1 ? 0 : 80 }}>
                <ChildSectionHeader
                  name={child.name}
                  age={age}
                  gender={child.gender}
                  storyCount={child.stories.length}
                  childId={child.id}
                />
                <StoryLibraryV2
                  stories={serialized}
                  childName={child.name}
                  childId={child.id}
                />
              </div>
            );
          })
        )}

        {children.length > 0 && (
          <div style={{ marginTop: 48, textAlign: "center" }}>
            <Link
              href="/profile/new"
              style={{
                fontFamily: V2.ui,
                fontSize: 14,
                color: V2.inkMute,
                textDecoration: "underline",
                textUnderlineOffset: 4,
              }}
            >
              + Nog een kind toevoegen
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}

// ── Sub components ──────────────────────────────────────────────────

function ChildSectionHeader({
  name,
  age,
  gender,
  storyCount,
  childId,
}: {
  name: string;
  age: number;
  gender: string;
  storyCount: number;
  childId: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        marginBottom: 32,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
        <Avatar name={name} size={64} />
        <div>
          <Kicker>{name}&rsquo;s plankje</Kicker>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 36,
              letterSpacing: -0.8,
              margin: "10px 0 0",
              lineHeight: 1.05,
            }}
          >
            <span style={{ fontStyle: "italic" }}>{name}</span>
            <span
              style={{
                fontFamily: V2.mono,
                fontSize: 16,
                color: V2.inkMute,
                letterSpacing: "0.1em",
                marginLeft: 14,
                fontStyle: "normal",
              }}
            >
              · {age}{" "}
              {gender === "boy" ? "jongen" : gender === "girl" ? "meisje" : ""} · {storyCount}{" "}
              {storyCount === 1 ? "verhaal" : "verhalen"}
            </span>
          </h2>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <EBtn kind="primary" size="sm" href={`/generate/${childId}`}>
          + Nieuw verhaal
        </EBtn>
        <EBtn kind="ghost" size="sm" href={`/book/${childId}`}>
          Samenstel boekje
        </EBtn>
        <EBtn kind="ghost" size="sm" href={`/profile/${childId}`}>
          Profiel
        </EBtn>
      </div>
    </div>
  );
}

function EmptyChildren() {
  return (
    <div
      style={{
        border: `1px dashed ${V2.paperShade}`,
        background: V2.paperDeep,
        padding: "72px 32px",
        textAlign: "center",
      }}
    >
      <Kicker>Nog geen profielen</Kicker>
      <h2
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 40,
          letterSpacing: -1,
          margin: "18px 0 12px",
          lineHeight: 1.05,
        }}
      >
        Maak je{" "}
        <span style={{ fontStyle: "italic" }}>eerste profiel.</span>
      </h2>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 16,
          color: V2.inkSoft,
          maxWidth: 440,
          margin: "0 auto 28px",
          lineHeight: 1.55,
        }}
      >
        Eén keer de basics invullen: naam, leeftijd, knuffel, de mensen
        eromheen. Daarna weten wij genoeg om elke avond een nieuw verhaal
        te maken.
      </p>
      <EBtn kind="primary" size="lg" href="/profile/new">
        Eerste profiel aanmaken →
      </EBtn>
    </div>
  );
}

function WaitingCard({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: React.ReactNode;
  body: string;
}) {
  return (
    <div
      style={{
        border: `1px solid ${V2.paperShade}`,
        background: V2.paperDeep,
        padding: "48px 40px",
        textAlign: "center",
      }}
    >
      <Kicker>{kicker}</Kicker>
      <h1
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 40,
          letterSpacing: -1,
          margin: "18px 0 16px",
          lineHeight: 1.1,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 16,
          color: V2.inkSoft,
          lineHeight: 1.55,
          maxWidth: 480,
          margin: "0 auto",
        }}
      >
        {body}
      </p>
      <p
        style={{
          marginTop: 28,
          fontFamily: V2.ui,
          fontSize: 13,
          color: V2.inkMute,
        }}
      >
        Vragen? Mail ons op{" "}
        <a
          href="mailto:info@onsverhaaltje.nl"
          style={{ color: V2.ink, textDecoration: "underline" }}
        >
          info@onsverhaaltje.nl
        </a>
      </p>
    </div>
  );
}

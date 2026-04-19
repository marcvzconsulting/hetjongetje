import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { calculateAge } from "@/lib/utils/age";
import { StoryLibrary } from "@/components/story/story-library";
import { loadUserGate } from "@/lib/user-gate";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const gate = await loadUserGate(session.user.id);
  if (!gate) redirect("/login");

  if (!gate.isApproved) {
    return (
      <div className="min-h-full px-6 py-12">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Hallo, {session.user.name}!</h1>
            <div className="flex gap-2">
              <Link
                href="/account"
                className="rounded-lg border border-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Mijn account
              </Link>
              <SignOutButton />
            </div>
          </div>

          {gate.status === "suspended" ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
              <div className="mb-3 text-4xl">🚫</div>
              <h2 className="text-lg font-bold text-red-900">
                Account geblokkeerd
              </h2>
              <p className="mt-2 text-sm text-red-800">
                Je account is tijdelijk opgeschort. Neem contact met ons op
                voor meer informatie.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
              <div className="mb-3 text-4xl">⏳</div>
              <h2 className="text-lg font-bold text-amber-900">
                Wachten op goedkeuring
              </h2>
              <p className="mt-2 text-sm text-amber-800">
                Bedankt voor je registratie! We bekijken je account zo snel
                mogelijk. Zodra je goedgekeurd bent, kun je hier kindprofielen
                aanmaken en verhalen genereren.
              </p>
              <p className="mt-4 text-xs text-amber-700/80">
                Heb je vragen? Mail ons op{" "}
                <a
                  href="mailto:hallo@onsverhaaltje.nl"
                  className="underline"
                >
                  hallo@onsverhaaltje.nl
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-full px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Hallo, {session.user.name}! 👋
            </h1>
            <p className="text-muted-foreground">
              Welkom bij Ons Verhaaltje
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!gate.isAdmin && (
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  gate.storyCredits > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-red-100 text-red-700"
                }`}
                title="Aantal verhalen dat je nog kunt maken"
              >
                {gate.storyCredits} verhalen over
              </span>
            )}
            <Link
              href="/account"
              className="rounded-lg border border-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              Mijn account
            </Link>
            <SignOutButton />
          </div>
        </div>

        {children.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-muted p-12 text-center">
            <div className="text-4xl mb-3">🧒</div>
            <h3 className="font-semibold mb-1">Nog geen profielen</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Maak een profiel aan voor je kind om te beginnen met magische
              verhalen
            </p>
            <Link
              href="/profile/new"
              className="inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              Eerste profiel aanmaken
            </Link>
          </div>
        ) : (
          children.map((child) => {
            const age = calculateAge(child.dateOfBirth);

            // Serialize stories for client component
            const serializedStories = child.stories.map((s) => ({
              id: s.id,
              title: s.title,
              setting: s.setting,
              isFavorite: s.isFavorite,
              createdAt: s.createdAt.toISOString(),
              coverUrl: s.pages[0]?.illustrationUrl || null,
            }));

            return (
              <div key={child.id} className="mb-10">
                {/* Child header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {child.gender === "boy"
                        ? "👦"
                        : child.gender === "girl"
                          ? "👧"
                          : "🧒"}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold">{child.name}</h2>
                      <p className="text-xs text-muted-foreground">
                        {age} jaar oud &middot; {child.stories.length} verhalen
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/generate/${child.id}`}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
                    >
                      + Nieuw verhaal
                    </Link>
                    <Link
                      href={`/profile/${child.id}`}
                      className="rounded-lg border border-muted px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
                    >
                      Profiel
                    </Link>
                  </div>
                </div>

                {/* Story library with sort/filter/delete */}
                <StoryLibrary
                  stories={serializedStories}
                  childName={child.name}
                  childId={child.id}
                />
              </div>
            );
          })
        )}

        {children.length > 0 && (
          <div className="mt-6 text-center">
            <Link
              href="/profile/new"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              + Nog een kind toevoegen
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

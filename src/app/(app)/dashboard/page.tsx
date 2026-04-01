import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/ui/sign-out-button";
import { calculateAge } from "@/lib/utils/age";
import { STORY_SETTINGS } from "@/lib/ai/prompts/story-request";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const children = await prisma.childProfile.findMany({
    where: { userId: session.user.id },
    include: {
      stories: {
        orderBy: { createdAt: "desc" },
        where: { status: "ready" },
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
              Welkom bij Het Jongetje
            </p>
          </div>
          <SignOutButton />
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
            const favorites = child.stories.filter((s) => s.isFavorite);
            const others = child.stories.filter((s) => !s.isFavorite);

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

                {/* Story library */}
                {child.stories.length === 0 ? (
                  <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
                    <div className="text-3xl mb-2">📖</div>
                    <p className="text-sm text-muted-foreground">
                      Nog geen verhalen voor {child.name}.{" "}
                      <Link
                        href={`/generate/${child.id}`}
                        className="text-primary font-medium hover:text-primary-light"
                      >
                        Maak het eerste verhaal!
                      </Link>
                    </p>
                  </div>
                ) : (
                  <div>
                    {/* Favorites section */}
                    {favorites.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          ❤️ Bibliotheek
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {favorites.map((story) => (
                            <StoryCard key={story.id} story={story} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Other stories */}
                    {others.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                          {favorites.length > 0 ? "Overige verhalen" : "Alle verhalen"}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {others.map((story) => (
                            <StoryCard key={story.id} story={story} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

function StoryCard({ story }: { story: { id: string; title: string; setting: string; isFavorite: boolean; createdAt: Date } }) {
  const settingInfo = STORY_SETTINGS[story.setting as keyof typeof STORY_SETTINGS];

  return (
    <Link
      href={`/story/${story.id}`}
      className="group rounded-xl bg-white border border-muted p-4 transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{settingInfo?.emoji || "📖"}</span>
        {story.isFavorite && <span className="text-sm">❤️</span>}
      </div>
      <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
        {story.title}
      </h4>
      <p className="text-xs text-muted-foreground mt-1">
        {settingInfo?.label || story.setting} &middot;{" "}
        {new Date(story.createdAt).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "short",
        })}
      </p>
    </Link>
  );
}

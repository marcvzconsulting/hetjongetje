"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STORY_SETTINGS } from "@/lib/ai/prompts/story-request";

interface StoryData {
  id: string;
  title: string;
  setting: string;
  isFavorite: boolean;
  createdAt: string;
  coverUrl: string | null;
}

interface Props {
  stories: StoryData[];
  childName: string;
  childId: string;
}

type SortOption = "newest" | "oldest" | "title" | "favorites";
type FilterOption = "all" | "favorites" | string; // string = setting key

export function StoryLibrary({ stories: initialStories, childName, childId }: Props) {
  const router = useRouter();
  const [stories, setStories] = useState(initialStories);
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Get unique settings from stories for filter options
  const usedSettings = [...new Set(stories.map((s) => s.setting))];

  // Filter
  let filtered = stories;
  if (filter === "favorites") {
    filtered = stories.filter((s) => s.isFavorite);
  } else if (filter !== "all") {
    filtered = stories.filter((s) => s.setting === filter);
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "title":
        return a.title.localeCompare(b.title, "nl");
      case "favorites":
        return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
      default:
        return 0;
    }
  });

  async function handleDelete(storyId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      if (res.ok) {
        setStories((prev) => prev.filter((s) => s.id !== storyId));
        setDeleteConfirm(null);
      }
    } catch { /* ignore */ }
    setDeleting(false);
  }

  return (
    <div>
      {/* Controls */}
      {stories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-muted bg-white px-3 py-1.5 text-xs font-medium focus:border-primary focus:outline-none"
          >
            <option value="newest">Nieuwste eerst</option>
            <option value="oldest">Oudste eerst</option>
            <option value="title">Titel A-Z</option>
            <option value="favorites">Favorieten eerst</option>
          </select>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-muted bg-white px-3 py-1.5 text-xs font-medium focus:border-primary focus:outline-none"
          >
            <option value="all">Alle verhalen</option>
            <option value="favorites">Alleen favorieten</option>
            {usedSettings.map((setting) => {
              const info = STORY_SETTINGS[setting as keyof typeof STORY_SETTINGS];
              return (
                <option key={setting} value={setting}>
                  {info ? `${info.emoji} ${info.label}` : setting}
                </option>
              );
            })}
          </select>

          <span className="text-xs text-muted-foreground ml-auto">
            {sorted.length} {sorted.length === 1 ? "verhaal" : "verhalen"}
          </span>
        </div>
      )}

      {/* Story grid */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-muted p-8 text-center">
          <div className="text-3xl mb-2">📖</div>
          <p className="text-sm text-muted-foreground">
            {stories.length === 0 ? (
              <>
                Nog geen verhalen voor {childName}.{" "}
                <Link
                  href={`/generate/${childId}`}
                  className="text-primary font-medium hover:text-primary-light"
                >
                  Maak het eerste verhaal!
                </Link>
              </>
            ) : (
              "Geen verhalen gevonden met dit filter."
            )}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((story) => {
            const settingInfo = STORY_SETTINGS[story.setting as keyof typeof STORY_SETTINGS];

            return (
              <div key={story.id} className="group relative rounded-xl bg-white border border-muted overflow-hidden transition-all hover:shadow-md hover:border-primary/30">
                {/* Delete confirmation overlay */}
                {deleteConfirm === story.id && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 p-4 text-center">
                    <p className="text-sm font-medium mb-3">
                      Verhaal verwijderen?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(story.id)}
                        disabled={deleting}
                        className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleting ? "..." : "Verwijderen"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg border border-muted px-4 py-1.5 text-xs font-medium hover:bg-muted"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteConfirm(story.id);
                  }}
                  className="absolute top-2 left-2 z-10 w-7 h-7 rounded-full bg-black/40 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                  title="Verwijderen"
                >
                  ✕
                </button>

                <Link href={`/story/${story.id}`}>
                  {/* Cover image */}
                  <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                    {story.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={story.coverUrl}
                        alt={story.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-4xl"
                        style={{ background: "linear-gradient(145deg, #F8EAD0, #E8CC98)" }}
                      >
                        {settingInfo?.emoji || "📖"}
                      </div>
                    )}
                    {story.isFavorite && (
                      <span className="absolute top-2 right-2 text-sm drop-shadow">❤️</span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
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
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

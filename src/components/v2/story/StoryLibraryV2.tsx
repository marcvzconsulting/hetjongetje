"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { Kicker, IconV2 } from "@/components/v2";
import { STORY_SETTINGS } from "@/lib/ai/prompts/story-request";

export type StoryData = {
  id: string;
  title: string;
  setting: string;
  isFavorite: boolean;
  createdAt: string;
  coverUrl: string | null;
};

type Props = {
  stories: StoryData[];
  childName: string;
  childId: string;
};

type SortOption = "newest" | "oldest" | "title" | "favorites";
type FilterOption = "all" | "favorites" | string;

/** Human date like "3 dagen", "een week", "vandaag" */
function relativeDutch(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const days = Math.floor((now - then) / 86_400_000);
  if (days <= 0) return "vandaag";
  if (days === 1) return "gisteren";
  if (days < 7) return `${days} dagen`;
  if (days < 10) return "een week";
  if (days < 14) return "anderhalve week";
  if (days < 31) return `${Math.round(days / 7)} weken`;
  if (days < 60) return "een maand";
  return `${Math.round(days / 30)} maanden`;
}

function leadingNumber(total: number, index: number): string {
  return String(total - index).padStart(2, "0");
}

export function StoryLibraryV2({ stories: initial, childName, childId }: Props) {
  const [stories, setStories] = useState(initial);
  const [sort, setSort] = useState<SortOption>("newest");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const usedSettings = useMemo(
    () => Array.from(new Set(stories.map((s) => s.setting))),
    [stories]
  );

  const filtered = useMemo(() => {
    if (filter === "favorites") return stories.filter((s) => s.isFavorite);
    if (filter !== "all") return stories.filter((s) => s.setting === filter);
    return stories;
  }, [stories, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      switch (sort) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "title":
          return a.title.localeCompare(b.title, "nl");
        case "favorites":
          return (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0);
        default:
          return 0;
      }
    });
    return copy;
  }, [filtered, sort]);

  async function handleDelete(storyId: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: "DELETE" });
      if (res.ok) {
        setStories((prev) => prev.filter((s) => s.id !== storyId));
        setDeleteConfirm(null);
      }
    } catch {
      /* ignore */
    }
    setDeleting(false);
  }

  if (stories.length === 0) {
    return (
      <div
        style={{
          border: `1px dashed ${V2.paperShade}`,
          padding: "48px 32px",
          textAlign: "center",
          background: V2.paperDeep,
        }}
      >
        <Kicker>{childName}&rsquo;s plankje</Kicker>
        <p
          style={{
            fontFamily: V2.display,
            fontSize: 22,
            fontStyle: "italic",
            margin: "16px 0 20px",
            color: V2.inkSoft,
          }}
        >
          Nog geen verhalen.
        </p>
        <Link
          href={`/generate/${childId}`}
          style={{
            display: "inline-block",
            background: V2.ink,
            color: V2.paper,
            padding: "12px 28px",
            fontFamily: V2.ui,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            letterSpacing: 0.2,
            borderRadius: 2,
          }}
        >
          Maak het eerste verhaal →
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
          paddingBottom: 16,
          borderBottom: `1px solid ${V2.paperShade}`,
        }}
      >
        <FilterTabs
          current={filter}
          onChange={setFilter}
          usedSettings={usedSettings}
        />
        <div style={{ flex: 1 }} />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            padding: "8px 12px",
            border: `1px solid ${V2.paperShade}`,
            background: "transparent",
            color: V2.ink,
            borderRadius: 2,
          }}
        >
          <option value="newest">Nieuwste eerst</option>
          <option value="oldest">Oudste eerst</option>
          <option value="title">Titel A-Z</option>
          <option value="favorites">Favorieten eerst</option>
        </select>
        <span
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.1em",
          }}
        >
          {sorted.length} {sorted.length === 1 ? "VERHAAL" : "VERHALEN"}
        </span>
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            padding: "32px 24px",
            fontFamily: V2.display,
            fontStyle: "italic",
            color: V2.inkMute,
            textAlign: "center",
          }}
        >
          Geen verhalen gevonden met dit filter.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 32,
          }}
        >
          {sorted.map((story, i) => (
            <StoryCard
              key={story.id}
              story={story}
              nr={leadingNumber(sorted.length, i)}
              confirming={deleteConfirm === story.id}
              deleting={deleting}
              onAskDelete={() => setDeleteConfirm(story.id)}
              onConfirmDelete={() => handleDelete(story.id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterTabs({
  current,
  onChange,
  usedSettings,
}: {
  current: FilterOption;
  onChange: (v: FilterOption) => void;
  usedSettings: string[];
}) {
  const tabs: { id: FilterOption; label: string }[] = [
    { id: "all", label: "Alle" },
    { id: "favorites", label: "Favorieten" },
    ...usedSettings.map((setting) => {
      const info = STORY_SETTINGS[setting as keyof typeof STORY_SETTINGS];
      return {
        id: setting as FilterOption,
        label: info?.label ?? setting,
      };
    }),
  ];
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {tabs.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={String(t.id)}
            type="button"
            onClick={() => onChange(t.id)}
            style={{
              padding: "8px 16px",
              border: `1px solid ${active ? V2.ink : "transparent"}`,
              background: "transparent",
              cursor: "pointer",
              fontFamily: V2.ui,
              fontSize: 13,
              color: active ? V2.ink : V2.inkMute,
              fontWeight: active ? 500 : 400,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function StoryCard({
  story,
  nr,
  confirming,
  deleting,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  story: StoryData;
  nr: string;
  confirming: boolean;
  deleting: boolean;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const settingInfo =
    STORY_SETTINGS[story.setting as keyof typeof STORY_SETTINGS];
  return (
    <div style={{ position: "relative" }}>
      {/* Delete confirmation overlay */}
      {confirming && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            background: "rgba(245, 239, 228, 0.96)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontFamily: V2.display,
              fontSize: 18,
              fontWeight: 400,
              margin: "0 0 16px",
              color: V2.ink,
            }}
          >
            Verhaal verwijderen?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onConfirmDelete}
              disabled={deleting}
              style={{
                background: V2.ink,
                color: V2.paper,
                padding: "8px 18px",
                border: "none",
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 2,
              }}
            >
              {deleting ? "…" : "Verwijderen"}
            </button>
            <button
              type="button"
              onClick={onCancelDelete}
              style={{
                background: "transparent",
                color: V2.ink,
                padding: "8px 18px",
                border: `1px solid ${V2.ink}`,
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                borderRadius: 2,
              }}
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Delete button — altijd zichtbaar, discreet */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onAskDelete();
        }}
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 10,
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: "rgba(20,20,46,0.4)",
          color: V2.paper,
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          transition: "background .15s",
        }}
        aria-label="Verhaal verwijderen"
        title="Verwijderen"
      >
        ✕
      </button>

      <Link
        href={`/story/${story.id}`}
        style={{ textDecoration: "none", color: "inherit", display: "block" }}
      >
        {/* Cover */}
        <div
          style={{
            aspectRatio: "4 / 5",
            background: V2.night,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {story.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.coverUrl}
              alt={story.title}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <NightDecoration />
          )}
          {story.isFavorite && (
            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <IconV2 name="heart" size={16} color={V2.heart} filled />
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              right: 12,
              fontFamily: V2.mono,
              fontSize: 10,
              color: V2.gold,
              letterSpacing: "0.12em",
              textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            }}
          >
            NR. {nr}
          </div>
        </div>
        {/* Info */}
        <div style={{ marginTop: 14 }}>
          <h4
            style={{
              fontFamily: V2.display,
              fontSize: 20,
              fontWeight: 400,
              letterSpacing: -0.3,
              lineHeight: 1.25,
              margin: 0,
              color: V2.ink,
            }}
          >
            {story.title}
          </h4>
          <p
            style={{
              fontFamily: V2.mono,
              fontSize: 10.5,
              color: V2.inkMute,
              letterSpacing: "0.12em",
              margin: "6px 0 0",
              textTransform: "uppercase",
            }}
          >
            {relativeDutch(story.createdAt)}
            {settingInfo && ` · ${settingInfo.label.toUpperCase()}`}
          </p>
        </div>
      </Link>
    </div>
  );
}

function NightDecoration() {
  return (
    <>
      {/* moon */}
      <div
        style={{
          position: "absolute",
          top: "22%",
          right: "22%",
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: V2.gold,
          opacity: 0.85,
        }}
      />
      {/* some stars */}
      {[
        { x: 14, y: 28 },
        { x: 28, y: 14 },
        { x: 62, y: 42 },
        { x: 18, y: 68 },
        { x: 48, y: 72 },
        { x: 78, y: 82 },
      ].map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: V2.gold,
            opacity: 0.7,
          }}
        />
      ))}
      {/* horizon */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "28%",
          background: V2.nightSoft,
          opacity: 0.6,
        }}
      />
    </>
  );
}

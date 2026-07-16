"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
        <Kicker size="lg">{childName}&rsquo;s plankje</Kicker>
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
      <LibStyles />
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
        {/* Native select (toegankelijk) in de huisstijl: eigen chevron,
            geen OS-chrome. */}
        <select
          aria-label="Sorteer verhalen"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            padding: "8px 34px 8px 14px",
            border: `1px solid ${V2.paperShade}`,
            background: `${V2.paper} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%231f1e3a' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 12px center`,
            color: V2.ink,
            borderRadius: 999,
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
            cursor: "pointer",
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
            gap: "44px 32px",
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
    <div className="lib-card" style={{ position: "relative" }}>
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
          left: 18,
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
        {/* Cover — als boekje: rug links, pagina-randje rechts, diepte. */}
        <div
          className="lib-card-cover"
          style={{
            aspectRatio: "4 / 5",
            background: V2.night,
            position: "relative",
            overflow: "hidden",
            borderRadius: "4px 12px 12px 4px",
            boxShadow:
              "0 1px 2px rgba(31,30,58,0.10), 0 10px 26px rgba(31,30,58,0.14)",
          }}
        >
          {story.coverUrl ? (
            <Image
              src={story.coverUrl}
              alt={story.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
              style={{
                objectFit: "cover",
              }}
            />
          ) : (
            <NightDecoration />
          )}
          {/* Boekrug */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 0,
              width: 12,
              background:
                "linear-gradient(90deg, rgba(0,0,0,0.32), rgba(0,0,0,0.10) 55%, transparent)",
              pointerEvents: "none",
            }}
          />
          {/* Pagina-randje */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 4,
              bottom: 4,
              right: 2.5,
              width: 1.5,
              background: "rgba(245,239,228,0.35)",
              pointerEvents: "none",
            }}
          />
          {story.isFavorite && (
            <div style={{ position: "absolute", top: 12, right: 14 }}>
              <IconV2 name="heart" size={16} color={V2.heart} filled />
            </div>
          )}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 18,
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
          <h3
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
          </h3>
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

/**
 * Cover-fallback voor verhalen zonder illustratie: een nachtelijk
 * boekomslag-tafereel (gloeiende maansikkel, gevarieerde sterren,
 * heuvels, gouden binnenkader) i.p.v. het oude kale CSS-maantje.
 */
function NightDecoration() {
  const stars = [
    { x: 12, y: 14, s: 2, o: 0.9 },
    { x: 30, y: 8, s: 1.5, o: 0.55 },
    { x: 48, y: 18, s: 2.5, o: 0.8 },
    { x: 82, y: 10, s: 1.5, o: 0.6 },
    { x: 16, y: 38, s: 1.5, o: 0.5 },
    { x: 88, y: 34, s: 2, o: 0.75 },
    { x: 60, y: 44, s: 1.5, o: 0.5 },
    { x: 26, y: 55, s: 2, o: 0.65 },
    { x: 74, y: 58, s: 1.5, o: 0.45 },
    { x: 42, y: 34, s: 1, o: 0.4 },
    { x: 68, y: 24, s: 1, o: 0.5 },
    { x: 90, y: 66, s: 1.5, o: 0.4 },
  ];
  return (
    <>
      {/* Nachtlucht met wat diepte */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, ${V2.night} 0%, ${V2.nightSoft} 78%, ${V2.night} 100%)`,
        }}
      />
      {/* Maan-glow */}
      <div
        style={{
          position: "absolute",
          top: "16%",
          right: "18%",
          width: 84,
          height: 84,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,169,97,0.35) 0%, rgba(201,169,97,0) 70%)",
        }}
      />
      {/* Maansikkel: gouden schijf met nacht-schijf eroverheen */}
      <div
        style={{
          position: "absolute",
          top: "21%",
          right: "24%",
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: V2.gold,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "19%",
          right: "21%",
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: V2.night,
        }}
      />
      {/* Sterren, gevarieerd in grootte en helderheid */}
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.s,
            height: s.s,
            borderRadius: "50%",
            background: V2.gold,
            opacity: s.o,
            boxShadow: s.s > 2 ? `0 0 6px 1px rgba(201,169,97,0.5)` : undefined,
          }}
        />
      ))}
      {/* Heuvels */}
      <div
        style={{
          position: "absolute",
          bottom: "-14%",
          left: "-20%",
          width: "90%",
          height: "38%",
          borderRadius: "50%",
          background: V2.nightSoft,
          opacity: 0.9,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-18%",
          right: "-24%",
          width: "100%",
          height: "40%",
          borderRadius: "50%",
          background: "rgba(201,169,97,0.10)",
        }}
      />
      {/* Gouden binnenkader — boekomslag-gevoel */}
      <div
        style={{
          position: "absolute",
          inset: 10,
          border: "1px solid rgba(201,169,97,0.38)",
          borderRadius: 8,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

/** Hover-gedrag van de kaarten (één keer geïnjecteerd per bibliotheek). */
function LibStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.lib-card { transition: transform .18s ease; }
.lib-card:hover { transform: translateY(-5px); }
.lib-card .lib-card-cover { transition: box-shadow .18s ease; }
.lib-card:hover .lib-card-cover {
  box-shadow: 0 2px 4px rgba(31,30,58,0.12), 0 18px 38px rgba(31,30,58,0.22);
}
@media (prefers-reduced-motion: reduce) {
  .lib-card, .lib-card .lib-card-cover { transition: none; }
  .lib-card:hover { transform: none; }
}
`,
      }}
    />
  );
}

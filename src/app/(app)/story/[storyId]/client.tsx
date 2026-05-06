"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Spread } from "@/lib/story/spread-types";
import { BookViewerV3 } from "@/components/v2/story/BookViewerV3";
import { V2 } from "@/components/v2/tokens";

interface Props {
  storyId: string;
  childId: string;
  childName: string;
  storyTitle: string;
  spreads: Spread[];
  isFavorite: boolean;
  regenerationCount: number;
  regenerationLimit: number;
  initialFeedbackKind: "up" | "down" | null;
  initialFeedbackNote: string | null;
}

export function StoryPageClient({
  storyId,
  childId,
  childName,
  storyTitle,
  spreads,
  isFavorite: initialFavorite,
  regenerationCount,
  regenerationLimit,
  initialFeedbackKind,
  initialFeedbackNote,
}: Props) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [feedbackKind, setFeedbackKind] = useState<"up" | "down" | null>(
    initialFeedbackKind,
  );
  const [feedbackNote, setFeedbackNote] = useState<string>(initialFeedbackNote ?? "");
  const [feedbackSavedAt, setFeedbackSavedAt] = useState<Date | null>(
    initialFeedbackKind ? new Date() : null,
  );
  const [regenError, setRegenError] = useState<string>("");
  const [regenInFlight, setRegenInFlight] = useState(false);
  const [, startTransition] = useTransition();

  const canRegenerate = regenerationCount < regenerationLimit;

  async function toggleFavorite() {
    const newValue = !isFavorite;
    setIsFavorite(newValue);
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });
    } catch {
      setIsFavorite(!newValue);
    }
  }

  async function submitFeedback(
    kind: "up" | "down" | null,
    note?: string,
  ) {
    setFeedbackKind(kind);
    if (note !== undefined) setFeedbackNote(note);
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackKind: kind,
          ...(note !== undefined ? { feedbackNote: note } : {}),
        }),
      });
      setFeedbackSavedAt(new Date());
    } catch {
      // Best-effort — keep optimistic state, don't roll back to avoid
      // confusing the user mid-typing.
    }
  }

  async function handleRegenerate() {
    setRegenError("");
    if (
      !window.confirm(
        "Het huidige verhaal wordt vervangen door een nieuwe versie. De oude versie raak je daarmee kwijt. Doorgaan?",
      )
    ) {
      return;
    }
    setRegenInFlight(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRegenError(
          (data as { error?: string }).error ??
            "Genereren mislukt — probeer het zo opnieuw.",
        );
        setRegenInFlight(false);
        return;
      }
      // Success — refresh server-rendered page so the new story loads.
      startTransition(() => router.refresh());
    } catch {
      setRegenError("Verbindingsfout — probeer het zo opnieuw.");
      setRegenInFlight(false);
    }
  }

  return (
    <>
      <BookViewerV3
        spreads={spreads}
        childName={childName}
        childId={childId}
        storyId={storyId}
        storyTitle={storyTitle}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />

      {/* Footer-strip below the book — actions and feedback. Sits in
          normal flow under the viewer; admins running BookViewer in a
          modal can still see it after closing. */}
      <section
        style={{
          background: V2.paper,
          borderTop: `1px solid ${V2.paperShade}`,
          padding: "32px 24px 56px",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            display: "grid",
            gap: 32,
          }}
        >
          {/* Feedback */}
          <div>
            <h2
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 22,
                letterSpacing: -0.4,
                margin: "0 0 6px",
                color: V2.ink,
              }}
            >
              Hoe vond je dit verhaal?
            </h2>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 14,
                color: V2.inkSoft,
                margin: "0 0 14px",
                lineHeight: 1.55,
              }}
            >
              Korte reactie helpt ons betere verhalen maken.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <ThumbButton
                label="Mooi"
                glyph="👍"
                active={feedbackKind === "up"}
                onClick={() =>
                  submitFeedback(feedbackKind === "up" ? null : "up")
                }
              />
              <ThumbButton
                label="Minder"
                glyph="👎"
                active={feedbackKind === "down"}
                onClick={() =>
                  submitFeedback(feedbackKind === "down" ? null : "down")
                }
              />
              {feedbackSavedAt && feedbackKind && (
                <span
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 11,
                    color: V2.inkMute,
                    alignSelf: "center",
                    letterSpacing: "0.06em",
                  }}
                >
                  ✓ opgeslagen
                </span>
              )}
            </div>
            {feedbackKind && (
              <textarea
                placeholder={
                  feedbackKind === "up"
                    ? "Wat vond je het mooist? (optioneel)"
                    : "Wat klopte er niet? (optioneel)"
                }
                value={feedbackNote}
                onChange={(e) => setFeedbackNote(e.target.value)}
                onBlur={() => submitFeedback(feedbackKind, feedbackNote)}
                rows={3}
                maxLength={1000}
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "10px 12px",
                  fontFamily: V2.body,
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: V2.ink,
                  background: V2.paperDeep,
                  border: `1px solid ${V2.paperShade}`,
                  outline: "none",
                  resize: "vertical",
                }}
              />
            )}
          </div>

          {/* Regenerate */}
          <div
            style={{
              borderTop: `1px solid ${V2.paperShade}`,
              paddingTop: 24,
            }}
          >
            <h2
              style={{
                fontFamily: V2.display,
                fontWeight: 300,
                fontSize: 22,
                letterSpacing: -0.4,
                margin: "0 0 6px",
                color: V2.ink,
              }}
            >
              Niet helemaal goed?
            </h2>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 14,
                color: V2.inkSoft,
                margin: "0 0 14px",
                lineHeight: 1.55,
              }}
            >
              Eén keer per verhaal kun je opnieuw laten genereren met
              dezelfde instellingen. Je{" "}
              <strong>raakt het huidige verhaal kwijt</strong>; de nieuwe
              versie komt ervoor in de plaats.{" "}
              {!canRegenerate && (
                <span style={{ color: V2.inkMute }}>
                  Je hebt deze keuze al gebruikt voor dit verhaal.
                </span>
              )}
            </p>
            <button
              type="button"
              disabled={!canRegenerate || regenInFlight}
              onClick={handleRegenerate}
              style={{
                fontFamily: V2.ui,
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: "0.04em",
                padding: "10px 22px",
                border: `1px solid ${
                  canRegenerate ? V2.ink : V2.paperShade
                }`,
                background: regenInFlight
                  ? V2.paperDeep
                  : canRegenerate
                    ? V2.paper
                    : V2.paperDeep,
                color: canRegenerate ? V2.ink : V2.inkMute,
                cursor:
                  canRegenerate && !regenInFlight ? "pointer" : "default",
                opacity: regenInFlight ? 0.7 : 1,
              }}
            >
              {regenInFlight
                ? "Bezig met genereren… (kan even duren)"
                : "Opnieuw genereren →"}
            </button>
            {regenError && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "rgba(176,74,65,0.12)",
                  borderLeft: `3px solid ${V2.heart}`,
                  fontFamily: V2.body,
                  fontSize: 13,
                  color: V2.ink,
                }}
              >
                {regenError}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function ThumbButton({
  label,
  glyph,
  active,
  onClick,
}: {
  label: string;
  glyph: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        border: `1px solid ${active ? V2.ink : V2.paperShade}`,
        background: active ? V2.ink : V2.paper,
        color: active ? V2.paper : V2.ink,
        fontFamily: V2.ui,
        fontSize: 14,
        fontWeight: active ? 500 : 400,
        cursor: "pointer",
      }}
    >
      <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>
        {glyph}
      </span>
      <span>{label}</span>
    </button>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Spread } from "@/lib/story/spread-types";
import {
  endingNarrationPageNumber,
  spreadsToPageNumbers,
} from "@/lib/story/spread-audio";
import {
  BookViewerV3,
  type WordHighlight,
} from "@/components/v2/story/BookViewerV3";
import {
  StoryAudioPlayer,
  type StoryAudioEntry,
} from "@/components/v2/story/StoryAudioPlayer";
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
  /** Bestaande share-token uit DB; null = nog niet gedeeld. */
  initialShareToken: string | null;
  /** Al gegenereerde voorlees-audio's (per stem één). */
  initialAudios: StoryAudioEntry[];
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
  initialShareToken,
  initialAudios,
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
  const [regenFeedback, setRegenFeedback] = useState<string>("");
  const [quickAdjustments, setQuickAdjustments] = useState<string[]>([]);
  const [, startTransition] = useTransition();
  const [reactOpen, setReactOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(initialShareToken);
  const [shareInFlight, setShareInFlight] = useState(false);
  const [copyConfirmed, setCopyConfirmed] = useState(false);
  const [listenOpen, setListenOpen] = useState(false);
  const [audios, setAudios] = useState<StoryAudioEntry[]>(initialAudios);

  // ── Voorlezen: spread ↔ pagina-koppeling + woord-markering ──────
  const [currentSpreadIdx, setCurrentSpreadIdx] = useState(0);
  const [wordHighlight, setWordHighlight] = useState<WordHighlight | null>(
    null,
  );
  // Per spread het voorlees-item: 0 = titel, daarna de tekstpagina's,
  // als laatste de eindpagina (null = spread zonder audio).
  const spreadPageNumbers = useMemo(
    () => spreadsToPageNumbers(spreads),
    [spreads],
  );
  const pageNumbers = useMemo(
    () => spreadPageNumbers.filter((p): p is number => p !== null),
    [spreadPageNumbers],
  );
  const endingPageNumber = useMemo(
    () => endingNarrationPageNumber(spreads),
    [spreads],
  );
  const currentPageNumber = spreadPageNumbers[currentSpreadIdx] ?? null;
  // Zit de zichtbare spread ná het laatste voorleesbare item? (alleen
  // relevant wanneer de eindspread zelf geen audio heeft)
  const afterLastPage =
    currentPageNumber === null &&
    spreadPageNumbers
      .slice(currentSpreadIdx + 1)
      .every((p) => p === null) &&
    pageNumbers.length > 0;

  const shareUrl = shareToken
    ? typeof window !== "undefined"
      ? `${window.location.origin}/s/${shareToken}`
      : `/s/${shareToken}`
    : null;

  async function enableShare() {
    setShareInFlight(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/share`, { method: "POST" });
      if (res.ok) {
        const data = (await res.json()) as { shareToken: string };
        setShareToken(data.shareToken);
      }
    } finally {
      setShareInFlight(false);
    }
  }

  async function disableShare() {
    setShareInFlight(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/share`, { method: "DELETE" });
      if (res.ok) setShareToken(null);
    } finally {
      setShareInFlight(false);
    }
  }

  async function copyShareLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyConfirmed(true);
      setTimeout(() => setCopyConfirmed(false), 2000);
    } catch {
      // clipboard kan blocked zijn (oude browser of permissie geweigerd) —
      // de input blijft selecteerbaar zodat de ouder zelf kan kopiëren.
    }
  }

  const canRegenerate = regenerationCount < regenerationLimit;
  const hasFeedback = feedbackKind !== null;

  // Snelknoppen: korter↔langer en grappiger↔rustiger sluiten elkaar uit.
  function toggleAdjustment(key: string) {
    const EXCLUSIVE: Record<string, string> = {
      shorter: "longer",
      longer: "shorter",
      funnier: "calmer",
      calmer: "funnier",
    };
    setQuickAdjustments((prev) =>
      prev.includes(key)
        ? prev.filter((k) => k !== key)
        : [...prev.filter((k) => k !== EXCLUSIVE[key]), key],
    );
  }

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
      // Best-effort — keep optimistic state.
    }
  }

  async function handleRegenerate() {
    setRegenError("");
    setRegenInFlight(true);
    try {
      const res = await fetch(`/api/stories/${storyId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: regenFeedback.trim() || undefined,
          quickAdjustments: quickAdjustments.length
            ? quickAdjustments
            : undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setRegenError(
          data.error ?? "Genereren mislukt — probeer het zo opnieuw.",
        );
        setRegenInFlight(false);
        return;
      }
      // Success — close the modal and refresh.
      setReactOpen(false);
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
        onShareClick={() => setShareOpen(true)}
        isShared={!!shareToken}
        onReactClick={() => setReactOpen(true)}
        hasFeedback={hasFeedback}
        onListenClick={() => setListenOpen(true)}
        hasAudio={audios.length > 0}
        onSpreadChange={setCurrentSpreadIdx}
        wordHighlight={listenOpen ? wordHighlight : null}
      />

      {/* Voorlezen — stemkeuze + paginagestuurde spelerbalk. */}
      {listenOpen && (
        <StoryAudioPlayer
          storyId={storyId}
          audios={audios}
          canGenerate
          currentPageNumber={currentPageNumber}
          pageNumbers={pageNumbers}
          endingPageNumber={endingPageNumber}
          afterLastPage={afterLastPage}
          onClose={() => {
            setListenOpen(false);
            setWordHighlight(null);
          }}
          onGenerated={(entry) =>
            setAudios((prev) =>
              prev.some(
                (a) =>
                  a.voiceKey === entry.voiceKey &&
                  a.pageNumber === entry.pageNumber,
              )
                ? prev
                : [...prev, entry],
            )
          }
          onHighlightChange={setWordHighlight}
        />
      )}

      {/* Modal — slides up from bottom on mobile, centered card on
          desktop. Click outside or press Esc closes. */}
      {reactOpen && (
        <ReactModal onClose={() => setReactOpen(false)}>
          <div style={{ display: "grid", gap: 28 }}>
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
                  onBlur={() =>
                    submitFeedback(feedbackKind, feedbackNote)
                  }
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
                Je kunt dit verhaal één keer opnieuw laten maken met
                dezelfde instellingen.{" "}
                {!canRegenerate ? (
                  <span style={{ color: V2.inkMute }}>
                    Je hebt deze keuze al gebruikt voor dit verhaal.
                  </span>
                ) : (
                  <>
                    Kies hieronder wat er anders mag, of schrijf het
                    zelf.{" "}
                    <strong>Let op: het oude verhaal wordt overschreven.</strong>
                  </>
                )}
              </p>
              {canRegenerate && (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <ThumbButton
                    label="Korter"
                    glyph="✂️"
                    active={quickAdjustments.includes("shorter")}
                    onClick={() => toggleAdjustment("shorter")}
                  />
                  <ThumbButton
                    label="Langer"
                    glyph="📖"
                    active={quickAdjustments.includes("longer")}
                    onClick={() => toggleAdjustment("longer")}
                  />
                  <ThumbButton
                    label="Grappiger"
                    glyph="😄"
                    active={quickAdjustments.includes("funnier")}
                    onClick={() => toggleAdjustment("funnier")}
                  />
                  <ThumbButton
                    label="Rustiger"
                    glyph="🌙"
                    active={quickAdjustments.includes("calmer")}
                    onClick={() => toggleAdjustment("calmer")}
                  />
                </div>
              )}
              {canRegenerate && (
                <textarea
                  placeholder={
                    feedbackKind === "down" && feedbackNote
                      ? feedbackNote
                      : "Bv. te eng, te veel personages, mijn kind houdt niet van regen, laat de oma erin terugkomen…"
                  }
                  value={regenFeedback}
                  onChange={(e) => setRegenFeedback(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  disabled={regenInFlight}
                  style={{
                    width: "100%",
                    marginBottom: 12,
                    padding: "10px 12px",
                    fontFamily: V2.body,
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: V2.ink,
                    background: V2.paperDeep,
                    border: `1px solid ${V2.paperShade}`,
                    outline: "none",
                    resize: "vertical",
                    opacity: regenInFlight ? 0.6 : 1,
                  }}
                />
              )}
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
                    canRegenerate && !regenInFlight
                      ? "pointer"
                      : "default",
                  opacity: regenInFlight ? 0.7 : 1,
                }}
              >
                {regenInFlight
                  ? "Bezig met genereren… (kan even duren)"
                  : "Maak een nieuwe versie →"}
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
        </ReactModal>
      )}

      {/* Share modal — toon link wanneer aan, knop wanneer uit. */}
      {shareOpen && (
        <ReactModal onClose={() => setShareOpen(false)}>
          <div style={{ display: "grid", gap: 18 }}>
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
                Verhaal delen
              </h2>
              <p
                style={{
                  fontFamily: V2.body,
                  fontSize: 14,
                  color: V2.inkSoft,
                  margin: 0,
                  lineHeight: 1.55,
                }}
              >
                Met een deellink kunnen opa, oma of vrienden het verhaal
                lezen zonder account. De link blijft werken tot je 'm
                hier uitschakelt.
              </p>
            </div>

            {shareToken && shareUrl ? (
              <>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "stretch",
                    flexWrap: "wrap",
                  }}
                >
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    style={{
                      flex: "1 1 220px",
                      padding: "10px 12px",
                      fontFamily: V2.mono,
                      fontSize: 13,
                      color: V2.ink,
                      background: V2.paperDeep,
                      border: `1px solid ${V2.paperShade}`,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={copyShareLink}
                    style={{
                      padding: "10px 18px",
                      fontFamily: V2.ui,
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      background: copyConfirmed ? V2.goldSoft : V2.ink,
                      color: copyConfirmed ? V2.goldDeep : V2.paper,
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {copyConfirmed ? "Gekopieerd ✓" : "Kopieer link"}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    paddingTop: 10,
                    borderTop: `1px solid ${V2.paperShade}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: V2.body,
                      fontSize: 13,
                      color: V2.inkMute,
                    }}
                  >
                    Verhaal staat nu publiek (alleen via deze link).
                  </span>
                  <button
                    type="button"
                    onClick={disableShare}
                    disabled={shareInFlight}
                    style={{
                      fontFamily: V2.ui,
                      fontSize: 13,
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      padding: "8px 16px",
                      background: "transparent",
                      color: V2.ink,
                      border: `1px solid ${V2.paperShade}`,
                      cursor: shareInFlight ? "default" : "pointer",
                      opacity: shareInFlight ? 0.6 : 1,
                    }}
                  >
                    {shareInFlight ? "Even…" : "Stop met delen"}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                onClick={enableShare}
                disabled={shareInFlight}
                style={{
                  fontFamily: V2.ui,
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  padding: "12px 22px",
                  background: V2.ink,
                  color: V2.paper,
                  border: "none",
                  cursor: shareInFlight ? "default" : "pointer",
                  opacity: shareInFlight ? 0.7 : 1,
                  justifySelf: "start",
                }}
              >
                {shareInFlight ? "Bezig…" : "Genereer deellink →"}
              </button>
            )}
          </div>
        </ReactModal>
      )}
    </>
  );
}

function ReactModal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(20,20,46,0.45)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflow: "auto",
          background: V2.paper,
          padding: "28px 24px 32px",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          marginBottom: "env(safe-area-inset-bottom, 0px)",
          boxShadow: "0 -10px 40px rgba(20,20,46,0.25)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Sluiten"
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            background: "transparent",
            border: "none",
            fontSize: 22,
            lineHeight: 1,
            color: V2.inkMute,
            cursor: "pointer",
          }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
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

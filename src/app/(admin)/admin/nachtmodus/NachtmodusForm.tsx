"use client";

import { useState, useTransition } from "react";
import { V2 } from "@/components/v2/tokens";
import {
  NIGHT_END_RANGE,
  NIGHT_PRESETS,
  NIGHT_START_RANGE,
  formatMinutes,
  minuteOptions,
  type ReaderSettings,
} from "@/lib/reader/night";
import { saveNightModeAction } from "./actions";

const START_OPTIONS = minuteOptions(NIGHT_START_RANGE);
const END_OPTIONS = minuteOptions(NIGHT_END_RANGE);

const fieldLabel = {
  fontFamily: V2.ui,
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: V2.inkMute,
} as const;

const selectStyle = {
  fontFamily: V2.ui,
  fontSize: 14,
  padding: "9px 12px",
  border: `1px solid ${V2.paperShade}`,
  background: V2.paper,
  color: V2.ink,
  borderRadius: 0,
} as const;

export function NachtmodusForm({ initial }: { initial: ReaderSettings }) {
  const [saved, setSaved] = useState<ReaderSettings>(initial);
  const [draft, setDraft] = useState<ReaderSettings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    draft.autoNight !== saved.autoNight ||
    draft.nightStart !== saved.nightStart ||
    draft.nightEnd !== saved.nightEnd;

  function change(patch: Partial<ReaderSettings>) {
    setError(null);
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function save() {
    if (!dirty || pending) return;
    const next = draft;
    startTransition(async () => {
      try {
        const result = await saveNightModeAction(next);
        if (result.ok) {
          setSaved(result.settings);
          setDraft(result.settings);
          setError(null);
        } else {
          setError(result.error);
        }
      } catch {
        setError("Opslaan mislukt. Probeer het zo opnieuw.");
      }
    });
  }

  const auto = draft.autoNight;

  return (
    <section
      style={{
        border: `1px solid ${V2.paperShade}`,
        background: "#fff",
        padding: "22px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 20,
        }}
      >
        <div>
          <div
            id="nachtmodus-auto-label"
            style={{ fontFamily: V2.ui, fontSize: 14, fontWeight: 500 }}
          >
            Automatisch inschakelen
          </div>
          <div
            style={{
              fontFamily: V2.body,
              fontSize: 13,
              color: V2.inkMute,
              marginTop: 3,
              lineHeight: 1.5,
            }}
          >
            De lezer start in nachtmodus binnen het tijdvak hieronder (lokale
            tijd van de lezer). Ouders kunnen &apos;m per sessie zelf omzetten
            met het maantje.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={auto}
          aria-labelledby="nachtmodus-auto-label"
          onClick={() => change({ autoNight: !auto })}
          style={{
            flex: "none",
            width: 46,
            height: 26,
            borderRadius: 999,
            border: "none",
            padding: 0,
            cursor: "pointer",
            position: "relative",
            background: auto ? V2.ink : V2.paperShade,
            transition: "background .2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: auto ? 23 : 3,
              width: 20,
              height: 20,
              borderRadius: 999,
              background: "#fff",
              boxShadow: "0 1px 3px rgba(0,0,0,.25)",
              transition: "left .2s",
            }}
          />
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          // Op een smal scherm breekt één van de labels af: houd de
          // keuzelijsten dan toch op één lijn.
          alignItems: "end",
          opacity: auto ? 1 : 0.4,
          transition: "opacity .2s",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>Nachtmodus aan vanaf</span>
          <select
            value={draft.nightStart}
            disabled={!auto}
            onChange={(e) => change({ nightStart: Number(e.target.value) })}
            style={selectStyle}
          >
            {START_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {formatMinutes(m)}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={fieldLabel}>Weer uit om</span>
          <select
            value={draft.nightEnd}
            disabled={!auto}
            onChange={(e) => change({ nightEnd: Number(e.target.value) })}
            style={selectStyle}
          >
            {END_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {formatMinutes(m)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          opacity: auto ? 1 : 0.4,
          transition: "opacity .2s",
        }}
      >
        <span style={{ ...fieldLabel, marginRight: 4 }}>Snel kiezen</span>
        {NIGHT_PRESETS.map((p) => {
          const on = p.start === draft.nightStart && p.end === draft.nightEnd;
          return (
            <button
              key={p.label}
              type="button"
              disabled={!auto}
              aria-pressed={on}
              onClick={() => change({ nightStart: p.start, nightEnd: p.end })}
              style={{
                fontFamily: V2.ui,
                fontSize: 12,
                padding: "6px 12px",
                borderRadius: 999,
                cursor: auto ? "pointer" : "default",
                border: `1px solid ${on ? V2.goldDeep : V2.paperShade}`,
                background: on ? V2.goldSoft : "transparent",
                color: on ? V2.ink : V2.inkSoft,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "rgba(176,74,65,0.12)",
            borderLeft: `3px solid ${V2.heart}`,
            fontFamily: V2.body,
            fontSize: 13,
            color: V2.ink,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          paddingTop: 16,
          borderTop: `1px solid ${V2.paperShade}`,
        }}
      >
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 12,
            color: V2.inkMute,
            lineHeight: 1.5,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: 999,
              background: auto ? V2.goldDeep : V2.rose,
              marginRight: 8,
              verticalAlign: "middle",
            }}
          />
          {auto
            ? `Actief: nachtmodus van ${formatMinutes(draft.nightStart)} tot ${formatMinutes(draft.nightEnd)}`
            : "Uit: de lezer start altijd in dagstand"}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          style={{
            fontFamily: V2.ui,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "10px 18px",
            border: "none",
            background: dirty ? V2.ink : V2.nightMute,
            color: V2.paper,
            cursor: dirty && !pending ? "pointer" : "default",
            transition: "background .2s",
            whiteSpace: "nowrap",
          }}
        >
          {pending ? "Opslaan…" : dirty ? "Opslaan" : "Opgeslagen"}
        </button>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { PendingButton } from "@/components/v2/PendingButton";
import { sendReminderAction } from "./actions";
import type { ReminderTrigger } from "./triggers";

export type ReminderUserRow = {
  id: string;
  name: string;
  email: string;
  createdAt: string; // ISO
  lastLoginAt: string | null; // ISO
  hasProfile: boolean;
  hasStory: boolean;
  optedOut: boolean;
  /** ISO timestamp per trigger of the last time this reminder was sent. */
  sent: Record<ReminderTrigger, string | null>;
};

type TabDef = {
  trigger: ReminderTrigger;
  label: string;
  templateCode: string;
  blurb: string;
  /** Is this user "relevant" for this reminder (content criterion)? */
  relevant: (u: ReminderUserRow) => boolean;
};

const TABS: TabDef[] = [
  {
    trigger: "day1-profile",
    label: "Dag 1 — profiel maken",
    templateCode: "day1-profile-reminder",
    blurb: "Klanten zonder kindprofiel — een duwtje om te beginnen.",
    relevant: (u) => !u.hasProfile,
  },
  {
    trigger: "day3-story",
    label: "Dag 3 — eerste verhaal",
    templateCode: "day3-story-reminder",
    blurb: "Klanten mét profiel maar zonder verhaal.",
    relevant: (u) => u.hasProfile && !u.hasStory,
  },
  {
    trigger: "day7-login",
    label: "Dag 7 — nooit ingelogd",
    templateCode: "day7-login-reminder",
    blurb: "Klanten die nog nooit hebben ingelogd.",
    relevant: (u) => u.lastLoginAt === null,
  },
];

/** Naam van de testklant in het mail-voorbeeld (moet matchen met de
 *  PREVIEW_VARS in page.tsx). */
const PREVIEW_NAME = "Sanne, kind Noor";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ReminderSender({
  users,
  previews,
}: {
  users: ReminderUserRow[];
  previews: Record<ReminderTrigger, { subject: string; html: string }>;
}) {
  const [activeTrigger, setActiveTrigger] = useState<ReminderTrigger>(
    "day1-profile",
  );
  const [relevantOnly, setRelevantOnly] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  // Selection is kept per trigger so switching tabs doesn't mix picks.
  const [selected, setSelected] = useState<Record<string, Set<string>>>({
    "day1-profile": new Set(),
    "day3-story": new Set(),
    "day7-login": new Set(),
  });

  const tab = TABS.find((t) => t.trigger === activeTrigger)!;

  const visibleUsers = useMemo(() => {
    const rows = relevantOnly ? users.filter(tab.relevant) : users;
    // Relevante klanten eerst, dan op aanmaakdatum (oudste eerst).
    return [...rows].sort((a, b) => {
      const ra = tab.relevant(a) ? 0 : 1;
      const rb = tab.relevant(b) ? 0 : 1;
      if (ra !== rb) return ra - rb;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [users, relevantOnly, tab]);

  const currentSel = selected[activeTrigger];
  // Selectable = visible, not opted-out.
  const selectableIds = visibleUsers.filter((u) => !u.optedOut).map((u) => u.id);
  const selectedCount = selectableIds.filter((id) => currentSel.has(id)).length;
  const allSelected =
    selectableIds.length > 0 && selectedCount === selectableIds.length;

  function setTriggerSelection(next: Set<string>) {
    setSelected((prev) => ({ ...prev, [activeTrigger]: next }));
  }

  function toggle(id: string) {
    const next = new Set(currentSel);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTriggerSelection(next);
  }

  function toggleAll() {
    if (allSelected) setTriggerSelection(new Set());
    else setTriggerSelection(new Set(selectableIds));
  }

  return (
    <div>
      {/* ── Reminder tabs ─────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 20,
          borderBottom: `1px solid ${V2.paperShade}`,
        }}
      >
        {TABS.map((t) => {
          const active = t.trigger === activeTrigger;
          const count = selected[t.trigger].size;
          return (
            <button
              key={t.trigger}
              type="button"
              onClick={() => setActiveTrigger(t.trigger)}
              style={{
                fontFamily: V2.ui,
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? V2.ink : V2.inkSoft,
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${active ? V2.gold : "transparent"}`,
                padding: "10px 14px",
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
              {count > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontFamily: V2.mono,
                    fontSize: 11,
                    padding: "1px 7px",
                    background: V2.goldSoft,
                    color: V2.goldDeep,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab header: blurb + template-link + filter ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 14,
              color: V2.inkSoft,
              margin: "0 0 6px",
              lineHeight: 1.5,
            }}
          >
            {tab.blurb}
          </p>
          <Link
            href={`/admin/email-templates/${tab.templateCode}`}
            style={{
              fontFamily: V2.ui,
              fontSize: 12,
              color: V2.goldDeep,
              textDecoration: "none",
            }}
          >
            ✎ Tekst van deze reminder aanpassen →
          </Link>
        </div>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkSoft,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          <input
            type="checkbox"
            checked={relevantOnly}
            onChange={(e) => setRelevantOnly(e.target.checked)}
          />
          Alleen relevante klanten
        </label>
      </div>

      {/* ── Mail-voorbeeld ─────────────────────────── */}
      <div
        style={{
          border: `1px solid ${V2.paperShade}`,
          background: V2.paperDeep,
          marginBottom: 24,
        }}
      >
        <button
          type="button"
          onClick={() => setShowPreview((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "12px 16px",
            fontFamily: V2.ui,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: V2.inkMute,
          }}
        >
          <span>Voorbeeld van deze mail</span>
          <span style={{ fontFamily: V2.mono }}>{showPreview ? "▾" : "▸"}</span>
        </button>
        {showPreview && (
          <div style={{ padding: "0 16px 16px" }}>
            <div
              style={{
                fontFamily: V2.body,
                fontSize: 13,
                color: V2.inkSoft,
                padding: "8px 12px",
                background: V2.paper,
                border: `1px solid ${V2.paperShade}`,
                borderBottom: "none",
              }}
            >
              <strong>Onderwerp:</strong> {previews[activeTrigger].subject}
            </div>
            <iframe
              title="E-mail voorbeeld"
              srcDoc={previews[activeTrigger].html}
              sandbox=""
              style={{
                width: "100%",
                height: 460,
                border: `1px solid ${V2.paperShade}`,
                background: V2.paper,
                display: "block",
              }}
            />
            <p
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 12,
                color: V2.inkMute,
                margin: "8px 0 0",
                lineHeight: 1.5,
              }}
            >
              Voorbeeld met testgegevens ({PREVIEW_NAME}). Namen, links en
              kindnaam worden per klant automatisch ingevuld bij verzending.
            </p>
          </div>
        )}
      </div>

      {/* ── Send form (hidden inputs carry the selection) ── */}
      <form action={sendReminderAction}>
        <input type="hidden" name="trigger" value={activeTrigger} />
        {[...currentSel]
          .filter((id) => selectableIds.includes(id))
          .map((id) => (
            <input key={id} type="hidden" name="userIds" value={id} />
          ))}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: V2.mono,
              fontSize: 12,
              color: V2.inkMute,
            }}
          >
            {visibleUsers.length} klant{visibleUsers.length === 1 ? "" : "en"}{" "}
            getoond · {selectedCount} geselecteerd
          </div>
          <PendingButton
            variant="primary"
            pendingLabel="Versturen…"
            disabled={selectedCount === 0}
          >
            Verstuur naar {selectedCount} geselecteerde
            {selectedCount === 1 ? "" : "n"}
          </PendingButton>
        </div>

        <div className="adm-cards-wrap" style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              minWidth: 720,
              borderCollapse: "collapse",
              fontFamily: V2.body,
              fontSize: 13,
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${V2.paperShade}` }}>
                <th style={thStyle}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Alles selecteren"
                  />
                </th>
                <th style={thStyle}>Klant</th>
                <th style={thStyle}>Aangemaakt</th>
                <th style={thStyle}>Profiel</th>
                <th style={thStyle}>Verhaal</th>
                <th style={thStyle}>Laatst in</th>
                <th style={thStyle}>Deze reminder</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const checked = currentSel.has(u.id);
                const isRelevant = tab.relevant(u);
                return (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: `1px solid ${V2.paperShade}`,
                      opacity: u.optedOut ? 0.5 : 1,
                      background: checked ? V2.goldSoft : "transparent",
                    }}
                  >
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={u.optedOut}
                        onChange={() => toggle(u.id)}
                        aria-label={`Selecteer ${u.name}`}
                      />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 500, color: V2.ink }}>
                        {u.name}
                        {!isRelevant && !relevantOnly && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontFamily: V2.mono,
                              fontSize: 10,
                              color: V2.inkMute,
                            }}
                            title="Voldoet niet aan de criteria van deze reminder"
                          >
                            (niet relevant)
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: V2.mono,
                          fontSize: 11,
                          color: V2.inkMute,
                        }}
                      >
                        {u.email}
                        {u.optedOut && " · afgemeld"}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, fontFamily: V2.mono, fontSize: 12 }}>
                      {fmtDate(u.createdAt)}
                    </td>
                    <td style={tdStyle}>{u.hasProfile ? "ja" : "nee"}</td>
                    <td style={tdStyle}>{u.hasStory ? "ja" : "nee"}</td>
                    <td style={{ ...tdStyle, fontFamily: V2.mono, fontSize: 12 }}>
                      {u.lastLoginAt ? fmtDate(u.lastLoginAt) : "nooit"}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: V2.mono, fontSize: 12 }}>
                      {u.sent[activeTrigger]
                        ? `verstuurd ${fmtDate(u.sent[activeTrigger])}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {visibleUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...tdStyle,
                      textAlign: "center",
                      color: V2.inkMute,
                      fontStyle: "italic",
                      padding: "28px 18px",
                    }}
                  >
                    Geen klanten in deze weergave.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 12,
            color: V2.inkMute,
            marginTop: 12,
            lineHeight: 1.5,
          }}
        >
          Afgemelde klanten kunnen niet worden geselecteerd. Na verzending
          wordt de reminder als verstuurd gemarkeerd zodat de automatische
          cron &apos;m niet nóg eens stuurt — handmatig opnieuw sturen mag wel.
        </p>
      </form>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: V2.inkMute,
  padding: "10px 14px",
  textAlign: "left",
};

const tdStyle: React.CSSProperties = {
  fontSize: 13,
  color: V2.ink,
  padding: "12px 14px",
  textAlign: "left",
  verticalAlign: "top",
};

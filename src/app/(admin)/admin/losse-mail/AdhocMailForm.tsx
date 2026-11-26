"use client";

import { useActionState, useMemo, useState } from "react";
import { V2 } from "@/components/v2/tokens";
import { renderAdhocMail } from "@/lib/email/adhoc";
import { adhocMailAction, type AdhocState } from "./actions";

const INITIAL: AdhocState = { kind: "idle", message: "" };

export function AdhocMailForm() {
  const [state, formAction, pending] = useActionState(adhocMailAction, INITIAL);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("Hallo,\n\n");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("https://www.onsverhaaltje.nl/register");
  const [footerNote, setFooterNote] = useState(
    "Loop je ergens tegenaan? Antwoord gewoon op deze mail. Hartelijke groet, Marc van Zetten",
  );

  const preview = useMemo(
    () =>
      renderAdhocMail({
        subject,
        heading: heading || "Kop van je mail",
        body: body.trim() ? body : "Je tekst verschijnt hier.",
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        footerNote: footerNote || undefined,
      }).html,
    [subject, heading, body, ctaLabel, ctaUrl, footerNote],
  );

  const recipientCount = to.split(/[\s,;]+/).filter(Boolean).length;

  return (
    <form action={formAction}>
      {state.kind !== "idle" && (
        <div
          role="status"
          style={{
            marginBottom: 24,
            padding: "12px 18px",
            background:
              state.kind === "success" ? "rgba(201,169,97,0.18)" : "rgba(176,74,65,0.14)",
            borderLeft: `3px solid ${state.kind === "success" ? V2.goldDeep : V2.heart}`,
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
          }}
        >
          {state.message}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 32,
        }}
      >
        <div>
          <Field
            label="Aan"
            hint="Eén of meer adressen, gescheiden door komma's (max. 10). Ieder krijgt een eigen mail en ziet de anderen niet."
          >
            <input name="to" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Onderwerp">
            <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Kop">
            <input name="heading" value={heading} onChange={(e) => setHeading(e.target.value)} required style={inputStyle} />
          </Field>
          <Field label="Tekst" hint="Alinea's scheiden met een lege regel. **zo** wordt vet.">
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={12}
              style={{ ...inputStyle, lineHeight: 1.6, resize: "vertical" }}
            />
          </Field>
          <Field label="Knoptekst" hint="Leeg laten voor geen knop.">
            <input name="ctaLabel" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Link van de knop">
            <input name="ctaUrl" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Afsluiter" hint="Klein cursief regeltje onder de knop.">
            <input name="footerNote" value={footerNote} onChange={(e) => setFooterNote(e.target.value)} style={inputStyle} />
          </Field>

          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <button type="submit" name="intent" value="test" disabled={pending} style={ghostBtn}>
              {pending ? "Bezig…" : "Test naar mij sturen"}
            </button>
            <button
              type="submit"
              name="intent"
              value="send"
              disabled={pending || recipientCount === 0}
              style={primaryBtn}
              onClick={(e) => {
                if (!window.confirm(`Mail versturen naar ${to}?`)) e.preventDefault();
              }}
            >
              {pending ? "Bezig…" : `Versturen (${recipientCount})`}
            </button>
          </div>
        </div>

        <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <div
            style={{
              fontFamily: V2.body,
              fontSize: 13,
              color: V2.inkSoft,
              padding: "8px 12px",
              background: V2.paperDeep,
              border: `1px solid ${V2.paperShade}`,
              borderBottom: "none",
            }}
          >
            <strong>Van:</strong> Ons Verhaaltje &lt;info@onsverhaaltje.nl&gt;
            <br />
            <strong>Onderwerp:</strong> {subject || "…"}
          </div>
          <iframe
            title="Voorbeeld van de mail"
            srcDoc={preview}
            sandbox=""
            style={{
              width: "100%",
              height: 620,
              border: `1px solid ${V2.paperShade}`,
              background: V2.paper,
              display: "block",
            }}
          />
        </div>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 18 }}>
      <span
        style={{
          display: "block",
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: V2.inkMute,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span
          style={{
            display: "block",
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 12,
            color: V2.inkMute,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </span>
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${V2.paperShade}`,
  background: V2.paper,
  fontFamily: V2.body,
  fontSize: 14,
  color: V2.ink,
  outline: "none",
  boxSizing: "border-box",
};

const btnBase: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 14,
  fontWeight: 500,
  padding: "12px 22px",
  cursor: "pointer",
};
const primaryBtn: React.CSSProperties = {
  ...btnBase,
  background: V2.ink,
  color: V2.paper,
  border: `1px solid ${V2.ink}`,
};
const ghostBtn: React.CSSProperties = {
  ...btnBase,
  background: "transparent",
  color: V2.ink,
  border: `1px solid ${V2.paperShade}`,
};

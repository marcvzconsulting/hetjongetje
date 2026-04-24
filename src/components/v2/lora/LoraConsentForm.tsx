"use client";

import { useState } from "react";
import Link from "next/link";
import { V2 } from "@/components/v2/tokens";
import { EBtn, Kicker, IconV2 } from "@/components/v2";

type Props = {
  childName: string;
  onAccept: () => void;
  onCancel?: () => void;
  /** Optional busy state when the caller submits the accept */
  submitting?: boolean;
};

/**
 * Explicit GDPR consent form (AVG art. 9 — biometric data). Parents must
 * tick both checkboxes before the accept button becomes active. Emits
 * `onAccept` — the caller is expected to record the consent timestamp
 * server-side when the subsequent training starts.
 */
export function LoraConsentForm({
  childName,
  onAccept,
  onCancel,
  submitting,
}: Props) {
  const [readPrivacy, setReadPrivacy] = useState(false);
  const [explicitConsent, setExplicitConsent] = useState(false);
  const canProceed = readPrivacy && explicitConsent && !submitting;

  return (
    <div
      style={{
        background: V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: "32px 36px",
      }}
    >
      <Kicker>Toestemming · biometrische gegevens</Kicker>
      <h2
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 28,
          letterSpacing: -0.6,
          margin: "14px 0 18px",
          lineHeight: 1.15,
          color: V2.ink,
        }}
      >
        Mogen we <span style={{ fontStyle: "italic" }}>{childName}</span>{" "}
        leren herkennen?
      </h2>

      <p
        style={{
          fontFamily: V2.body,
          fontSize: 16,
          lineHeight: 1.6,
          color: V2.inkSoft,
          margin: "0 0 12px",
        }}
      >
        Om {childName} in alle verhalen steeds hetzelfde eruit te laten
        zien, trainen we een klein model (LoRA) op 5 tot 15 foto&rsquo;s
        die jullie uploaden. Dit is{" "}
        <strong>strikt optioneel</strong>, verhalen werken ook zonder.
      </p>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 16,
          lineHeight: 1.6,
          color: V2.inkSoft,
          margin: "0 0 20px",
        }}
      >
        Deze verwerking valt onder{" "}
        <strong>biometrische gegevens</strong> (AVG art. 9). We mogen het
        daarom alleen doen met jouw expliciete, uitdrukkelijke
        toestemming.
      </p>

      <Section title="Wat er precies gebeurt">
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 10,
          }}
        >
          <LiCheck>
            Je uploadt 5–15 foto&rsquo;s rechtstreeks naar onze opslag bij
            Scaleway (nl-ams, Amsterdam)
          </LiCheck>
          <LiCheck>
            Wij sturen ze eenmalig naar onze AI-partner fal.ai voor ~10
            minuten training
          </LiCheck>
          <LiCheck>
            Zodra de training klaar is worden de originele foto&rsquo;s{" "}
            <strong>binnen 7 dagen</strong> bij beide partijen gewist
          </LiCheck>
          <LiCheck>
            Het getrainde LoRA-bestand (géén herkenbare foto&rsquo;s) blijft
            zolang {childName}&rsquo;s profiel bestaat
          </LiCheck>
        </ul>
      </Section>

      <Section title="Jouw rechten">
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gap: 10,
          }}
        >
          <LiCheck>
            Je kunt de toestemming altijd intrekken in het profiel, één
            klik
          </LiCheck>
          <LiCheck>
            Bij intrekking wordt het LoRA + alle foto&rsquo;s binnen 30
            dagen verwijderd
          </LiCheck>
          <LiCheck>
            Bij account-verwijdering gebeurt hetzelfde automatisch
          </LiCheck>
        </ul>
      </Section>

      {/* Consent checkboxes */}
      <div
        style={{
          marginTop: 28,
          display: "grid",
          gap: 14,
          paddingTop: 20,
          borderTop: `1px solid ${V2.paperShade}`,
        }}
      >
        <ConsentCheck
          checked={readPrivacy}
          onChange={setReadPrivacy}
          label={
            <>
              Ik heb de{" "}
              <Link
                href="/privacy"
                target="_blank"
                rel="noopener"
                style={{ color: V2.ink, textDecoration: "underline" }}
              >
                privacyverklaring
              </Link>{" "}
              gelezen en begrijp wat er met de foto&rsquo;s gebeurt.
            </>
          }
        />
        <ConsentCheck
          checked={explicitConsent}
          onChange={setExplicitConsent}
          label={
            <>
              Ik geef <strong>expliciete toestemming</strong> voor het
              verwerken van foto&rsquo;s van {childName} om een
              character-LoRA te trainen. Ik weet dat dit optioneel is en
              dat ik het altijd kan intrekken.
            </>
          }
        />
      </div>

      {/* Actions */}
      <div
        style={{
          marginTop: 28,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {onCancel && (
          <EBtn kind="ghost" size="md" onClick={onCancel}>
            Niet nu
          </EBtn>
        )}
        <EBtn
          kind="primary"
          size="md"
          onClick={canProceed ? onAccept : undefined}
          style={{
            opacity: canProceed ? 1 : 0.4,
            cursor: canProceed ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Bezig…" : "Akkoord, door naar foto's"}
        </EBtn>
      </div>
    </div>
  );
}

// ── Sub components ──────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          fontFamily: V2.ui,
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: V2.inkMute,
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function LiCheck({ children }: { children: React.ReactNode }) {
  return (
    <li
      style={{
        display: "flex",
        gap: 12,
        fontFamily: V2.body,
        fontSize: 14.5,
        lineHeight: 1.55,
        color: V2.inkSoft,
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 3,
          color: V2.goldDeep,
        }}
      >
        <IconV2 name="check" size={14} color={V2.goldDeep} />
      </span>
      <span>{children}</span>
    </li>
  );
}

function ConsentCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        cursor: "pointer",
        fontFamily: V2.body,
        fontSize: 14,
        lineHeight: 1.55,
        color: V2.ink,
      }}
    >
      <span
        role="checkbox"
        aria-checked={checked}
        style={{
          flexShrink: 0,
          marginTop: 2,
          width: 20,
          height: 20,
          border: `1.5px solid ${checked ? V2.ink : V2.paperShade}`,
          background: checked ? V2.ink : "transparent",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <IconV2 name="check" size={12} color={V2.paper} />}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      />
      <span>{label}</span>
    </label>
  );
}

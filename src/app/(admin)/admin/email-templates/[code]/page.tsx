import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { PendingButton } from "@/components/v2/PendingButton";
import {
  findEditableTemplate,
  loadTemplateOverride,
  renderEditableTemplate,
  type TemplateContent,
} from "@/lib/email/template-store";
import {
  saveTemplateAction,
  resetTemplateAction,
  sendTestTemplateAction,
} from "./actions";
import { welcomeDefaults } from "@/lib/email/templates/welcome";
import { accountApprovedDefaults } from "@/lib/email/templates/account-approved";
import { firstStoryDefaults } from "@/lib/email/templates/first-story";
import { creditsPurchasedDefaults } from "@/lib/email/templates/credits-purchased";
import { subscriptionStartedDefaults } from "@/lib/email/templates/subscription-started";
import { subscriptionCancelledDefaults } from "@/lib/email/templates/subscription-cancelled";
import { newsletterWelcomeDefaults } from "@/lib/email/templates/newsletter-welcome";
import { day1ProfileReminderDefaults } from "@/lib/email/templates/day1-profile-reminder";
import { day3StoryReminderDefaults } from "@/lib/email/templates/day3-story-reminder";
import { day7LoginReminderDefaults } from "@/lib/email/templates/day7-login-reminder";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  saved?: string;
  error?: string;
}>;

const FLASH_LABELS: Record<string, { kind: "success" | "error"; text: string }> = {
  "1": { kind: "success", text: "Wijzigingen opgeslagen." },
  reset: { kind: "success", text: "Override verwijderd — terug naar default." },
  test_sent: { kind: "success", text: "Test-mail naar je eigen adres gestuurd." },
  required_fields_missing: {
    kind: "error",
    text: "Onderwerp, koptekst en minstens één paragraaf zijn verplicht.",
  },
  no_admin_email: {
    kind: "error",
    text: "Je admin-account heeft geen e-mailadres.",
  },
  unknown_template: { kind: "error", text: "Onbekende template." },
};

/**
 * Map a template code back to its hard-coded defaults so we can show
 * the admin what the system would send if the override were removed.
 * One static lookup so we don't need a registry across `defaults()`
 * exporters.
 */
function defaultsFor(code: string): TemplateContent {
  switch (code) {
    case "welcome":
      return welcomeDefaults();
    case "account-approved":
      return accountApprovedDefaults();
    case "first-story":
      return firstStoryDefaults();
    case "credits-purchased":
      return creditsPurchasedDefaults();
    case "subscription-started":
      return subscriptionStartedDefaults();
    case "subscription-cancelled":
      return subscriptionCancelledDefaults();
    case "newsletter-welcome":
      return newsletterWelcomeDefaults();
    case "day1-profile-reminder":
      return day1ProfileReminderDefaults();
    case "day3-story-reminder":
      return day3StoryReminderDefaults();
    case "day7-login-reminder":
      return day7LoginReminderDefaults();
    default:
      return {
        subject: "",
        heading: "",
        paragraphs: [],
      };
  }
}

export default async function EditTemplatePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: SearchParams;
}) {
  const { code } = await params;
  const meta = findEditableTemplate(code);
  if (!meta) notFound();

  const session = await auth();
  const sp = await searchParams;
  const flash =
    (sp.saved && FLASH_LABELS[sp.saved]) ||
    (sp.error && FLASH_LABELS[sp.error]) ||
    null;

  const override = await loadTemplateOverride(code);
  const defaults = defaultsFor(code);
  const current: TemplateContent = override ?? defaults;
  const isOverridden = !!override;

  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/email-templates",
  }));

  // Live preview of the *currently saved* state (override OR defaults).
  // Sample vars come from the test-send action so preview ≈ test mail.
  const sampleVars = sampleVarsFor(code);
  const preview = await renderEditableTemplate(code, defaults, sampleVars, {
    ctaUrl:
      typeof sampleVars.dashboardUrl === "string"
        ? sampleVars.dashboardUrl
        : "https://onsverhaaltje.nl",
  });

  return (
    <AdminShell
      section="E-mail"
      eyebrow="Mail-template"
      title={meta.label}
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
      actions={
        <Link
          href="/admin/email-templates"
          style={backLinkStyle}
        >
          ← Alle templates
        </Link>
      }
    >
      {flash && (
        <div
          style={{
            marginBottom: 24,
            padding: "12px 18px",
            background:
              flash.kind === "success"
                ? "rgba(201,169,97,0.18)"
                : "rgba(176,74,65,0.14)",
            borderLeft: `3px solid ${flash.kind === "success" ? V2.goldDeep : V2.heart}`,
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.ink,
          }}
        >
          {flash.text}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
          gap: 32,
        }}
      >
        {/* ── Left column: editor ──────────────────────── */}
        <div>
          <form action={saveTemplateAction}>
            <input type="hidden" name="code" value={code} />

            <Field label="Onderwerp">
              <input
                type="text"
                name="subject"
                defaultValue={current.subject}
                required
                style={inputStyle}
              />
            </Field>

            <Field label="Koptekst">
              <input
                type="text"
                name="heading"
                defaultValue={current.heading}
                required
                style={inputStyle}
              />
            </Field>

            <Field
              label="Paragrafen"
              hint="Eén paragraaf per blok. Scheid blokken door een lege regel. HTML in <strong>, <em>, <a> mag."
            >
              <textarea
                name="paragraphs"
                defaultValue={current.paragraphs.join("\n\n")}
                required
                rows={12}
                style={{ ...inputStyle, fontFamily: V2.mono, fontSize: 13, lineHeight: 1.6, resize: "vertical" }}
              />
            </Field>

            <Field
              label="CTA-tekst (knop)"
              hint="Laat leeg om de knop niet te tonen. De link zelf blijft in code (vaak per gebruiker verschillend)."
            >
              <input
                type="text"
                name="ctaLabel"
                defaultValue={current.ctaLabel ?? ""}
                style={inputStyle}
              />
            </Field>

            <Field label="Footer-regel" hint="Klein cursief regeltje onderaan.">
              <input
                type="text"
                name="footerNote"
                defaultValue={current.footerNote ?? ""}
                style={inputStyle}
              />
            </Field>

            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 24,
                flexWrap: "wrap",
              }}
            >
              <PendingButton variant="primary" pendingLabel="Opslaan…">
                Opslaan
              </PendingButton>
            </div>
          </form>

          {/* Side actions — separate forms so they don't collide with save. */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <form action={sendTestTemplateAction}>
              <input type="hidden" name="code" value={code} />
              <PendingButton variant="ghost" pendingLabel="Versturen…">
                Test naar mij sturen
              </PendingButton>
            </form>
            {isOverridden && (
              <form action={resetTemplateAction}>
                <input type="hidden" name="code" value={code} />
                <PendingButton variant="danger" pendingLabel="Resetten…">
                  Reset naar default
                </PendingButton>
              </form>
            )}
          </div>

          {/* Variables sidebar */}
          <div
            style={{
              marginTop: 32,
              padding: "16px 20px",
              background: V2.paperDeep,
              border: `1px solid ${V2.paperShade}`,
            }}
          >
            <h3
              style={{
                fontFamily: V2.ui,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: V2.inkMute,
                margin: "0 0 12px",
              }}
            >
              Beschikbare variabelen
            </h3>
            <p
              style={{
                fontFamily: V2.body,
                fontSize: 13,
                color: V2.inkSoft,
                margin: "0 0 12px",
                lineHeight: 1.55,
              }}
            >
              Plak deze code waar je de waarde wil zien. Bij verzending
              wordt {"{{name}}"} bijvoorbeeld vervangen door de naam van
              de ontvanger.
            </p>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {meta.vars.map((v) => (
                <li
                  key={v}
                  style={{
                    fontFamily: V2.mono,
                    fontSize: 12,
                    padding: "4px 10px",
                    background: V2.paper,
                    border: `1px solid ${V2.paperShade}`,
                    color: V2.ink,
                  }}
                >
                  {`{{${v}}}`}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Right column: preview ─────────────────── */}
        <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <h3
              style={{
                fontFamily: V2.ui,
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: V2.inkMute,
                margin: 0,
              }}
            >
              Voorbeeld (na opslaan)
            </h3>
            <span
              style={{
                fontFamily: V2.mono,
                fontSize: 10,
                color: V2.inkMute,
              }}
            >
              vars: {Object.keys(sampleVars).slice(0, 3).join(", ")}…
            </span>
          </div>
          <div
            style={{
              fontFamily: V2.body,
              fontSize: 13,
              color: V2.inkSoft,
              padding: "8px 12px",
              background: V2.paperDeep,
              borderTop: `1px solid ${V2.paperShade}`,
              borderLeft: `1px solid ${V2.paperShade}`,
              borderRight: `1px solid ${V2.paperShade}`,
            }}
          >
            <strong>Onderwerp:</strong> {preview.subject}
          </div>
          <iframe
            title="E-mail voorbeeld"
            srcDoc={preview.html}
            sandbox=""
            style={{
              width: "100%",
              height: 540,
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
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            Voorbeeld toont de versie die nu wordt verzonden. Sla je
            wijzigingen eerst op om ze hier terug te zien.
          </p>
        </div>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label
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
      </label>
      {children}
      {hint && (
        <div
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 12,
            color: V2.inkMute,
            marginTop: 4,
            lineHeight: 1.5,
          }}
        >
          {hint}
        </div>
      )}
    </div>
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
};

const backLinkStyle: React.CSSProperties = {
  fontFamily: V2.ui,
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "8px 14px",
  border: `1px solid ${V2.paperShade}`,
  color: V2.ink,
  textDecoration: "none",
  background: V2.paper,
};

function sampleVarsFor(code: string): Record<string, unknown> {
  const common = {
    name: "Sanne",
    email: "test@onsverhaaltje.nl",
    profileUrl: "https://onsverhaaltje.nl/profile/new",
    dashboardUrl: "https://onsverhaaltje.nl/dashboard",
    accountUrl: "https://onsverhaaltje.nl/account",
    subscribeUrl: "https://onsverhaaltje.nl/subscribe",
    unsubscribeUrl: "https://onsverhaaltje.nl/unsubscribe?token=demo",
  };
  switch (code) {
    case "account-approved":
      return { ...common, credits: 1 };
    case "first-story":
      return {
        ...common,
        childName: "Noor",
        storyTitle: "Noor en het maanlicht",
        storyUrl: "https://onsverhaaltje.nl/story/demo",
      };
    case "credits-purchased":
      return {
        ...common,
        creditAmount: 10,
        amountFormatted: "12,00",
        netFormatted: "9,92",
        vatFormatted: "2,08",
        vatRate: 21,
        orderId: "ord_demo123",
      };
    case "subscription-started":
      return {
        ...common,
        planName: "Per maand",
        amountFormatted: "7,95",
        netFormatted: "6,57",
        vatFormatted: "1,38",
        vatRate: 21,
        intervalNl: "elke maand",
        creditsPerInterval: 8,
        nextChargeFormatted: "5 juni 2026",
        subscriptionMollieId: "sub_demo123",
      };
    case "subscription-cancelled":
      return {
        ...common,
        planName: "Per maand",
        endsAtFormatted: "5 juni 2026",
      };
    case "day3-story-reminder":
    case "day7-login-reminder":
      return { ...common, childName: "Noor" };
    default:
      return common;
  }
}

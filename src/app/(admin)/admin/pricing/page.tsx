import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import {
  createCreditPackAction,
  updateCreditPackAction,
  deleteCreditPackAction,
  createSubscriptionPlanAction,
  updateSubscriptionPlanAction,
  deleteSubscriptionPlanAction,
} from "./actions";

type SearchParams = Promise<{ saved?: string; error?: string }>;

const SAVED_LABELS: Record<string, string> = {
  created: "Toegevoegd",
  updated: "Opgeslagen",
  deleted: "Verwijderd",
};

const ERROR_LABELS: Record<string, string> = {
  missing: "Vul de verplichte velden in (code, naam, prijs).",
  price: "Prijs ongeldig — gebruik een getal als 12 of 12.50.",
  duplicate_code: "Die code bestaat al — kies een unieke code.",
  not_found: "Kon het item niet vinden, mogelijk al verwijderd.",
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  const flash = params.saved ? SAVED_LABELS[params.saved] : null;
  const error = params.error ? ERROR_LABELS[params.error] : null;

  const [creditPacks, subscriptionPlans] = await Promise.all([
    prisma.creditPack.findMany({ orderBy: [{ sortOrder: "asc" }, { code: "asc" }] }),
    prisma.subscriptionPlan.findMany({
      orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    }),
  ]);

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "40px 32px 80px",
        fontFamily: V2.body,
        color: V2.ink,
      }}
    >
      {/* Breadcrumb */}
      <div
        style={{
          fontFamily: V2.ui,
          fontSize: 13,
          color: V2.inkMute,
          marginBottom: 24,
        }}
      >
        <Link href="/admin" style={{ color: V2.inkMute, textDecoration: "none" }}>
          ← Admin
        </Link>
      </div>

      <Kicker>Admin · Prijs-catalogus</Kicker>
      <h1
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: 44,
          margin: "12px 0 32px",
          letterSpacing: -1.2,
          lineHeight: 1.05,
        }}
      >
        Wat verkopen we, en{" "}
        <span style={{ fontStyle: "italic" }}>voor hoeveel?</span>
      </h1>

      {flash && <Flash kind="success">{flash}</Flash>}
      {error && <Flash kind="error">{error}</Flash>}

      {/* Credit packs */}
      <section style={{ marginTop: 40, marginBottom: 64 }}>
        <SectionHeader
          kicker="Verhaal-pakketten"
          title="Losse credits"
          meta={`${creditPacks.length} pakketten`}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {creditPacks.map((p) => (
            <CreditPackCard key={p.id} pack={p} />
          ))}
        </div>

        <NewCreditPackForm />
      </section>

      {/* Subscription plans */}
      <section>
        <SectionHeader
          kicker="Abonnementen"
          title="Maand- en jaarplannen"
          meta={`${subscriptionPlans.length} plannen`}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {subscriptionPlans.map((p) => (
            <SubscriptionPlanCard key={p.id} plan={p} />
          ))}
        </div>

        <NewSubscriptionPlanForm />
      </section>
    </div>
  );
}

// ── Credit pack card ─────────────────────────────────────────────

function CreditPackCard({
  pack,
}: {
  pack: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    creditAmount: number;
    priceCents: number;
    vatRate: number;
    active: boolean;
    sortOrder: number;
    badge: string | null;
  };
}) {
  return (
    <form
      action={updateCreditPackAction}
      style={{
        background: pack.active ? V2.paperDeep : V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: 20,
        opacity: pack.active ? 1 : 0.65,
      }}
    >
      <input type="hidden" name="id" value={pack.id} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 16,
        }}
      >
        <code
          style={{
            fontFamily: V2.mono,
            fontSize: 12,
            color: V2.goldDeep,
            letterSpacing: "0.08em",
            background: V2.paper,
            padding: "3px 8px",
            border: `1px solid ${V2.paperShade}`,
          }}
        >
          {pack.code}
        </code>
        <DeleteInline
          deleteAction={deleteCreditPackAction}
          id={pack.id}
          label={pack.name}
        />
      </div>
      <FieldGrid>
        <FieldText name="name" label="Naam" defaultValue={pack.name} required />
        <FieldNumber
          name="creditAmount"
          label="Aantal verhalen"
          defaultValue={pack.creditAmount}
          min={1}
          required
        />
        <FieldNumber
          name="price"
          label="Prijs (€)"
          defaultValue={eurosFromCents(pack.priceCents)}
          step="0.01"
          min={0}
          required
        />
        <FieldNumber
          name="vatRate"
          label="BTW %"
          defaultValue={pack.vatRate}
          min={0}
          max={30}
        />
        <FieldNumber
          name="sortOrder"
          label="Volgorde"
          defaultValue={pack.sortOrder}
        />
        <FieldText name="badge" label="Badge" defaultValue={pack.badge ?? ""} />
      </FieldGrid>
      <FieldText
        name="description"
        label="Beschrijving"
        defaultValue={pack.description ?? ""}
        wide
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 16,
        }}
      >
        <ActiveToggle defaultChecked={pack.active} />
        <span style={{ flex: 1 }} />
        <SaveButton />
      </div>
    </form>
  );
}

// ── Subscription plan card ───────────────────────────────────────

function SubscriptionPlanCard({
  plan,
}: {
  plan: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    priceCents: number;
    vatRate: number;
    interval: string;
    creditsPerInterval: number | null;
    active: boolean;
    sortOrder: number;
    badge: string | null;
    features: unknown;
  };
}) {
  const featuresList = Array.isArray(plan.features)
    ? (plan.features as string[]).join("\n")
    : "";
  return (
    <form
      action={updateSubscriptionPlanAction}
      style={{
        background: plan.active ? V2.paperDeep : V2.paper,
        border: `1px solid ${V2.paperShade}`,
        padding: 20,
        opacity: plan.active ? 1 : 0.65,
      }}
    >
      <input type="hidden" name="id" value={plan.id} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 16,
        }}
      >
        <code
          style={{
            fontFamily: V2.mono,
            fontSize: 12,
            color: V2.goldDeep,
            letterSpacing: "0.08em",
            background: V2.paper,
            padding: "3px 8px",
            border: `1px solid ${V2.paperShade}`,
          }}
        >
          {plan.code}
        </code>
        <DeleteInline
          deleteAction={deleteSubscriptionPlanAction}
          id={plan.id}
          label={plan.name}
        />
      </div>
      <FieldGrid>
        <FieldText name="name" label="Naam" defaultValue={plan.name} required />
        <FieldText
          name="interval"
          label="Mollie interval"
          defaultValue={plan.interval}
          placeholder='"1 month" of "12 months"'
          required
        />
        <FieldNumber
          name="price"
          label="Prijs (€)"
          defaultValue={eurosFromCents(plan.priceCents)}
          step="0.01"
          min={0}
          required
        />
        <FieldNumber
          name="vatRate"
          label="BTW %"
          defaultValue={plan.vatRate}
          min={0}
          max={30}
        />
        <FieldText
          name="creditsPerInterval"
          label="Credits / periode"
          defaultValue={plan.creditsPerInterval?.toString() ?? ""}
          placeholder="leeg = onbeperkt"
        />
        <FieldNumber
          name="sortOrder"
          label="Volgorde"
          defaultValue={plan.sortOrder}
        />
        <FieldText name="badge" label="Badge" defaultValue={plan.badge ?? ""} />
      </FieldGrid>
      <FieldText
        name="description"
        label="Beschrijving"
        defaultValue={plan.description ?? ""}
        wide
      />
      <FieldTextarea
        name="features"
        label="Features (één per regel)"
        defaultValue={featuresList}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 16,
        }}
      >
        <ActiveToggle defaultChecked={plan.active} />
        <span style={{ flex: 1 }} />
        <SaveButton />
      </div>
    </form>
  );
}

// ── New-record forms ─────────────────────────────────────────────

function NewCreditPackForm() {
  return (
    <details
      style={{
        marginTop: 24,
        border: `1px dashed ${V2.paperShade}`,
        padding: 20,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: 18,
          color: V2.inkSoft,
        }}
      >
        + Nieuw pakket toevoegen
      </summary>
      <form action={createCreditPackAction} style={{ marginTop: 18 }}>
        <FieldGrid>
          <FieldText name="code" label="Code (uniek)" required />
          <FieldText name="name" label="Naam" required />
          <FieldNumber name="creditAmount" label="Aantal verhalen" min={1} required />
          <FieldNumber name="price" label="Prijs (€)" step="0.01" min={0} required />
          <FieldNumber name="vatRate" label="BTW %" defaultValue={21} min={0} max={30} />
          <FieldNumber name="sortOrder" label="Volgorde" defaultValue={0} />
          <FieldText name="badge" label="Badge" />
        </FieldGrid>
        <FieldText name="description" label="Beschrijving" wide />
        <div style={{ marginTop: 12 }}>
          <SaveButton label="Toevoegen →" />
        </div>
      </form>
    </details>
  );
}

function NewSubscriptionPlanForm() {
  return (
    <details
      style={{
        marginTop: 24,
        border: `1px dashed ${V2.paperShade}`,
        padding: 20,
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          fontFamily: V2.display,
          fontStyle: "italic",
          fontSize: 18,
          color: V2.inkSoft,
        }}
      >
        + Nieuw abonnementsplan
      </summary>
      <form action={createSubscriptionPlanAction} style={{ marginTop: 18 }}>
        <FieldGrid>
          <FieldText name="code" label="Code (uniek)" required />
          <FieldText name="name" label="Naam" required />
          <FieldText
            name="interval"
            label="Mollie interval"
            placeholder='"1 month" of "12 months"'
            required
          />
          <FieldNumber name="price" label="Prijs (€)" step="0.01" min={0} required />
          <FieldNumber name="vatRate" label="BTW %" defaultValue={21} min={0} max={30} />
          <FieldText
            name="creditsPerInterval"
            label="Credits / periode"
            placeholder="leeg = onbeperkt"
          />
          <FieldNumber name="sortOrder" label="Volgorde" defaultValue={0} />
          <FieldText name="badge" label="Badge" />
        </FieldGrid>
        <FieldText name="description" label="Beschrijving" wide />
        <FieldTextarea name="features" label="Features (één per regel)" />
        <div style={{ marginTop: 12 }}>
          <SaveButton label="Toevoegen →" />
        </div>
      </form>
    </details>
  );
}

// ── Field primitives ─────────────────────────────────────────────

function FieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </span>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "8px 10px",
    border: `1px solid ${V2.paperShade}`,
    background: V2.paper,
    fontFamily: V2.body,
    fontSize: 14,
    color: V2.ink,
    outline: "none",
  };
}

function FieldText({
  name,
  label,
  defaultValue,
  placeholder,
  required,
  wide,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label style={{ display: "block", gridColumn: wide ? "1 / -1" : undefined, marginTop: wide ? 14 : 0 }}>
      <Label>{label}</Label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        style={inputStyle()}
      />
    </label>
  );
}

function FieldNumber({
  name,
  label,
  defaultValue,
  required,
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  defaultValue?: number | string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: string;
}) {
  return (
    <label style={{ display: "block" }}>
      <Label>{label}</Label>
      <input
        type="number"
        name={name}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        step={step}
        style={inputStyle()}
      />
    </label>
  );
}

function FieldTextarea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string;
}) {
  return (
    <label style={{ display: "block", marginTop: 14 }}>
      <Label>{label}</Label>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={4}
        style={{
          ...inputStyle(),
          fontFamily: V2.body,
          minHeight: 80,
          resize: "vertical",
        }}
      />
    </label>
  );
}

function ActiveToggle({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: V2.ui,
        fontSize: 13,
        color: V2.inkMute,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        name="active"
        value="1"
        defaultChecked={defaultChecked}
        style={{ width: 16, height: 16, cursor: "pointer" }}
      />
      Zichtbaar in catalogus
    </label>
  );
}

function SaveButton({ label = "Opslaan" }: { label?: string }) {
  return (
    <EBtn kind="primary" size="sm" type="submit">
      {label}
    </EBtn>
  );
}

function DeleteInline({
  deleteAction,
  id,
  label,
}: {
  deleteAction: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={deleteAction} style={{ display: "inline-block" }}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        title={`Verwijder ${label}`}
        style={{
          background: "transparent",
          border: "none",
          padding: 0,
          color: V2.heart,
          fontFamily: V2.ui,
          fontSize: 12,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          cursor: "pointer",
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        Verwijderen
      </button>
    </form>
  );
}

function SectionHeader({
  kicker,
  title,
  meta,
}: {
  kicker: string;
  title: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 20,
        gap: 16,
      }}
    >
      <div>
        <Kicker>{kicker}</Kicker>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 30,
            margin: "8px 0 0",
            letterSpacing: -0.6,
            lineHeight: 1.1,
          }}
        >
          {title}
        </h2>
      </div>
      {meta && (
        <span
          style={{
            fontFamily: V2.mono,
            fontSize: 11,
            color: V2.inkMute,
            letterSpacing: "0.12em",
          }}
        >
          {meta}
        </span>
      )}
    </div>
  );
}

function Flash({
  kind,
  children,
}: {
  kind: "success" | "error";
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: 24,
        padding: "12px 18px",
        background:
          kind === "success" ? "rgba(201,169,97,0.14)" : "rgba(196,165,168,0.18)",
        borderLeft: `3px solid ${kind === "success" ? V2.goldDeep : V2.heart}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      {kind === "success" ? "✓ " : "⚠ "}
      {children}
    </div>
  );
}

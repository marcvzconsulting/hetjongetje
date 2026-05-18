import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadUserGate } from "@/lib/user-gate";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import { EBtnSubmit } from "@/components/v2/EBtnSubmit";
import { PendingButton } from "@/components/v2/PendingButton";
import { StarField } from "@/components/v2/StarField";
import { AppShell, buildAppNav } from "@/components/v2/app/AppShell";
import {
  updateProfileAction,
  updateAddressAction,
  changePasswordAction,
  deleteAccountAction,
  toggleNewsletterAction,
  submitAccountUnsubscribeReasonAction,
  cancelSubscriptionAction,
} from "./actions";

type SearchParams = Promise<{
  saved?: string;
  error?: string;
  /** "reason" → toon de opzeg-survey i.p.v. de losse opzeg-knop. */
  cancelStep?: string;
  /** "survey" → toon de nieuwsbrief-afmeld-survey inline na uitschrijven. */
  newsletterStep?: string;
  newsletterError?: string;
}>;

const SAVED_MESSAGES: Record<string, string> = {
  profile: "Persoonsgegevens opgeslagen",
  address: "Adres opgeslagen",
  password: "Wachtwoord gewijzigd",
  newsletter_on: "Je staat op de nieuwsbrief",
  newsletter_off: "Je bent uitgeschreven van de nieuwsbrief",
  newsletter_off_thanks:
    "Bedankt voor je feedback. We gebruiken het om de nieuwsbrief beter te maken.",
  subscription_cancelled:
    "Je abonnement is opgezegd. Je behoudt toegang tot het einde van de huidige periode.",
};

const NEWSLETTER_REASON_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: "te_vaak", label: "Ik krijg te veel mails", hint: "Frequentie te hoog" },
  { value: "niet_relevant", label: "De inhoud past niet bij me" },
  { value: "nooit_aangemeld", label: "Ik heb me hier nooit voor aangemeld", hint: "Spam-melding" },
  { value: "tijdelijk", label: "Tijdelijke pauze", hint: "Misschien kom ik later terug" },
  { value: "anders", label: "Anders, namelijk:" },
];

const ERROR_MESSAGES: Record<string, string> = {
  profile_missing: "Naam en email zijn verplicht",
  profile_email_invalid: "Ongeldig emailadres",
  profile_email_taken: "Dit emailadres is al in gebruik",
  password_missing: "Vul alle wachtwoordvelden in",
  password_too_short: "Nieuw wachtwoord moet minimaal 10 tekens zijn",
  password_too_long: "Nieuw wachtwoord mag maximaal 128 tekens zijn",
  password_banned: "Dit wachtwoord komt veel voor en is niet veilig genoeg. Kies iets unieks.",
  password_all_same: "Wachtwoord is te eenvoudig. Gebruik meer verschillende tekens.",
  password_mismatch: "De wachtwoorden komen niet overeen",
  password_wrong_current: "Huidig wachtwoord is onjuist",
  delete_missing: "Vul wachtwoord en email in om te bevestigen",
  delete_email_mismatch: "Het ingevulde email komt niet overeen",
  delete_wrong_password: "Wachtwoord is onjuist",
  delete_admin_blocked:
    "Admin-accounts kunnen niet via deze pagina verwijderd worden",
  subscription_no_active:
    "Je hebt geen actief abonnement om op te zeggen.",
  subscription_cancel_failed:
    "Opzeggen ging niet — probeer het later opnieuw, of mail ons.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { subscription: true, _count: { select: { children: true } } },
  });
  if (!user) redirect("/login");

  // Resolve the subscription's plan code to its catalog row so the
  // panel can show name + interval + creditsPerInterval. Skip for free
  // / unsubscribed users.
  const subscriptionPlan =
    user.subscription &&
    user.subscription.plan &&
    user.subscription.plan !== "free"
      ? await prisma.subscriptionPlan.findUnique({
          where: { code: user.subscription.plan },
        })
      : null;

  const gate = await loadUserGate(session.user.id);
  const credits = gate && !gate.isAdmin ? gate.storyCredits : null;

  // Count total stories across all children
  const storyCount = await prisma.story.count({
    where: { childProfile: { userId: user.id } },
  });

  // Pull this customer's full order history — newest first. Cap at 50
  // because nobody scrolls past that and the table stays light.
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const params = await searchParams;
  const savedMessage = params.saved ? SAVED_MESSAGES[params.saved] : null;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;

  return (
    <AppShell
      userName={user.name}
      isAdmin={user.role === "admin"}
      credits={credits}
      nav={buildAppNav("/account")}
    >
      <div
        className="app-page-pad"
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "40px 40px 80px",
        }}
      >
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            marginBottom: 28,
          }}
        >
          <Link
            href="/dashboard"
            style={{ color: V2.inkMute, textDecoration: "none" }}
          >
            ← Terug naar bibliotheek
          </Link>
        </div>

        <div style={{ marginBottom: 40 }}>
          <Kicker>Mijn account</Kicker>
          <h1
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: "clamp(36px, 4.4vw, 44px)",
              letterSpacing: -1.2,
              margin: "12px 0 0",
              lineHeight: 1.05,
            }}
          >
            Hallo,{" "}
            <span style={{ fontStyle: "italic" }}>
              {user.name.split(" ")[0]}
            </span>
            .
          </h1>
        </div>

        {/* Flash messages */}
        {savedMessage && <FlashSaved>{savedMessage}</FlashSaved>}
        {errorMessage && <FlashError>{errorMessage}</FlashError>}

        {/* Subscription hero */}
        <SubscriptionHero
          plan={user.subscription?.plan ?? "free"}
          status={user.subscription?.status ?? "active"}
          endsAt={user.subscription?.endsAt ?? null}
          storyCount={storyCount}
          childrenCount={user._count.children}
          credits={credits}
          isAdmin={gate?.isAdmin ?? false}
        />

        {/* Profile */}
        <Section title="Persoonsgegevens" meta="Voor contact en verzending">
          <form action={updateProfileAction}>
            <FieldRow>
              <EField
                label="Naam"
                name="name"
                defaultValue={user.name}
                required
                autoComplete="name"
              />
              <EField
                label="E-mail"
                name="email"
                type="email"
                defaultValue={user.email}
                required
                autoComplete="email"
              />
            </FieldRow>
            <FieldRow>
              <EField
                label="Telefoon"
                name="phone"
                type="tel"
                defaultValue={user.phone ?? ""}
                autoComplete="tel"
                placeholder="Optioneel"
              />
              <div>
                <FieldLabel>Taal</FieldLabel>
                <select
                  name="locale"
                  defaultValue={user.locale}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    border: "none",
                    borderBottom: `1px solid ${V2.paperShade}`,
                    background: "transparent",
                    fontSize: 16,
                    fontFamily: V2.body,
                    color: V2.ink,
                    outline: "none",
                  }}
                >
                  <option value="nl">Nederlands</option>
                  <option value="en">English</option>
                </select>
              </div>
            </FieldRow>
            <div style={{ marginTop: 28 }}>
              <EBtnSubmit kind="primary" size="md" pendingLabel="Opslaan…">
                Opslaan →
              </EBtnSubmit>
            </div>
          </form>
        </Section>

        {/* Address */}
        <Section
          title="Adres"
          meta="Nodig als je later een boekje wilt bestellen"
        >
          <form action={updateAddressAction}>
            <FieldRow threeTwo>
              <EField
                label="Straat"
                name="street"
                defaultValue={user.street ?? ""}
                autoComplete="address-line1"
              />
              <EField
                label="Huisnummer"
                name="houseNumber"
                defaultValue={user.houseNumber ?? ""}
              />
            </FieldRow>
            <FieldRow>
              <EField
                label="Postcode"
                name="postalCode"
                defaultValue={user.postalCode ?? ""}
                autoComplete="postal-code"
                placeholder="1234 AB"
              />
              <EField
                label="Plaats"
                name="city"
                defaultValue={user.city ?? ""}
                autoComplete="address-level2"
              />
            </FieldRow>
            <div>
              <EField
                label="Land"
                name="country"
                defaultValue={user.country ?? "Nederland"}
                autoComplete="country-name"
              />
            </div>
            <div style={{ marginTop: 28 }}>
              <EBtnSubmit kind="primary" size="md" pendingLabel="Opslaan…">
                Opslaan →
              </EBtnSubmit>
            </div>
          </form>
        </Section>

        {/* Newsletter */}
        <Section
          id="newsletter"
          title="Nieuwsbrief"
          meta="Af en toe een mailtje. Geen spam, beloofd."
        >
          {(params.saved === "newsletter_on" ||
            params.saved === "newsletter_off" ||
            params.saved === "newsletter_off_thanks") && (
            <InlineConfirm
              kind={params.saved === "newsletter_on" ? "on" : "off"}
            >
              {params.saved === "newsletter_on"
                ? "Je staat op de nieuwsbrief — bij de eerstvolgende editie zit je erbij."
                : params.saved === "newsletter_off_thanks"
                  ? "Bedankt voor je feedback. We gebruiken het om de nieuwsbrief beter te maken."
                  : "Je bent uitgeschreven. Geen mails meer van ons."}
            </InlineConfirm>
          )}

          {params.newsletterStep === "survey" ? (
            <NewsletterReasonForm
              noteRequired={params.newsletterError === "note_required"}
            />
          ) : (
            <form action={toggleNewsletterAction}>
              <input
                type="hidden"
                name="optIn"
                value={user.newsletterOptIn ? "0" : "1"}
              />
              <p
                style={{
                  fontFamily: V2.body,
                  fontSize: 15,
                  color: V2.inkSoft,
                  margin: "0 0 18px",
                  lineHeight: 1.6,
                  maxWidth: "60ch",
                }}
              >
                {user.newsletterOptIn ? (
                  <>
                    Je staat momenteel{" "}
                    <strong style={{ color: V2.ink }}>aangemeld</strong> voor
                    de nieuwsbrief. Je ontvangt af en toe een update over
                    nieuwe functies en seizoens-tips voor het voorlezen.
                  </>
                ) : (
                  <>
                    Je staat momenteel{" "}
                    <strong style={{ color: V2.ink }}>niet aangemeld</strong>.
                    Aanmelden kun je altijd uitzetten via deze pagina of via
                    de afmeldlink onderaan elke nieuwsbrief.
                  </>
                )}
              </p>
              <EBtnSubmit
                kind={user.newsletterOptIn ? "ghost" : "primary"}
                size="md"
                pendingLabel="Bezig…"
              >
                {user.newsletterOptIn
                  ? "Uitschrijven"
                  : "Aanmelden voor de nieuwsbrief →"}
              </EBtnSubmit>
            </form>
          )}
        </Section>

        {/* Subscription */}
        <SubscriptionPanel
          subscription={user.subscription}
          plan={subscriptionPlan}
          cancelStep={params.cancelStep === "reason" ? "reason" : null}
        />

        {/* Order history */}
        <OrdersPanel orders={orders} />

        {/* Password */}
        <Section
          title="Wachtwoord wijzigen"
          meta="Minimaal 10 tekens, kies iets dat je niet vergeet"
        >
          <form action={changePasswordAction}>
            <div>
              <EField
                label="Huidig wachtwoord"
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </div>
            <FieldRow>
              <EField
                label="Nieuw wachtwoord"
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
              />
              <EField
                label="Bevestig nieuw wachtwoord"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
              />
            </FieldRow>
            <div style={{ marginTop: 28 }}>
              <EBtnSubmit kind="primary" size="md" pendingLabel="Wijzigen…">
                Wachtwoord wijzigen →
              </EBtnSubmit>
            </div>
          </form>
        </Section>

        {/* Danger zone */}
        <section
          style={{
            marginTop: 64,
            padding: 32,
            background: "rgba(196,165,168,0.08)",
            border: `1px solid rgba(176, 74, 65, 0.25)`,
          }}
        >
          <Kicker color={V2.heart}>Gevarenzone</Kicker>
          <h2
            style={{
              fontFamily: V2.display,
              fontWeight: 300,
              fontSize: 26,
              margin: "12px 0 10px",
              letterSpacing: -0.5,
              color: V2.ink,
            }}
          >
            Account{" "}
            <span style={{ fontStyle: "italic" }}>verwijderen.</span>
          </h2>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 14,
              lineHeight: 1.6,
              color: V2.inkSoft,
              margin: "0 0 20px",
              maxWidth: "60ch",
            }}
          >
            Permanent. Al je kindprofielen, verhalen en boeken worden
            weggegooid. Dit kunnen we niet terugdraaien.
          </p>
          {user.role === "admin" ? (
            <p
              style={{
                fontFamily: V2.body,
                fontStyle: "italic",
                fontSize: 14,
                color: V2.heart,
                background: V2.paper,
                padding: "10px 14px",
                border: `1px solid rgba(176, 74, 65, 0.3)`,
              }}
            >
              Admin-accounts kunnen niet via deze pagina verwijderd worden.
            </p>
          ) : (
            <details>
              <summary
                style={{
                  display: "inline-block",
                  cursor: "pointer",
                  padding: "10px 18px",
                  background: "transparent",
                  color: V2.heart,
                  border: `1px solid ${V2.heart}`,
                  fontFamily: V2.ui,
                  fontSize: 14,
                  fontWeight: 500,
                  listStyle: "none",
                }}
              >
                Account verwijderen
              </summary>
              <form
                action={deleteAccountAction}
                style={{
                  marginTop: 20,
                  padding: 24,
                  background: V2.paper,
                  border: `1px solid rgba(176, 74, 65, 0.25)`,
                }}
              >
                <p
                  style={{
                    fontFamily: V2.body,
                    fontSize: 14,
                    color: V2.inkSoft,
                    margin: "0 0 20px",
                    lineHeight: 1.6,
                  }}
                >
                  Typ je email{" "}
                  <strong style={{ color: V2.ink }}>{user.email}</strong> en
                  je huidige wachtwoord om te bevestigen.
                </p>
                <div>
                  <EField
                    label="Email ter bevestiging"
                    name="emailConfirm"
                    type="email"
                    required
                    autoComplete="off"
                  />
                </div>
                <div>
                  <EField
                    label="Huidig wachtwoord"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                  />
                </div>
                <PendingButton
                  variant="primary"
                  pendingLabel="Verwijderen…"
                  style={{
                    marginTop: 16,
                    background: V2.heart,
                    borderRadius: 2,
                  }}
                >
                  Account definitief verwijderen
                </PendingButton>
              </form>
            </details>
          )}
        </section>
      </div>
    </AppShell>
  );
}

// ── Sub components ──────────────────────────────────────────────

type OrderRow = {
  id: string;
  kind: string;
  description: string | null;
  amountCents: number;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  creditAmount: number | null;
};

function eurosFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function formatDateNl(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_COPY: Record<string, { label: string; color: string }> = {
  paid: { label: "Betaald", color: V2.goldDeep },
  pending: { label: "Wacht op betaling", color: V2.inkMute },
  failed: { label: "Mislukt", color: V2.heart },
  cancelled: { label: "Geannuleerd", color: V2.inkMute },
  expired: { label: "Verlopen", color: V2.inkMute },
};

const KIND_COPY: Record<string, string> = {
  credits: "Verhalen",
  subscription: "Abonnement",
  book: "Boekje",
};

function OrdersPanel({ orders }: { orders: OrderRow[] }) {
  return (
    <Section
      title="Bestellingen"
      meta="Je laatste 50 betalingen voor credits, abonnementen of boekjes"
    >
      {orders.length === 0 ? (
        <p
          style={{
            fontFamily: V2.body,
            fontStyle: "italic",
            fontSize: 14,
            color: V2.inkMute,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Je hebt nog geen bestellingen.{" "}
          <Link
            href="/credits"
            style={{
              color: V2.goldDeep,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            Verhalen bijkopen
          </Link>{" "}
          of{" "}
          <Link
            href="/subscribe"
            style={{
              color: V2.goldDeep,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            een abonnement starten
          </Link>
          .
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontFamily: V2.body,
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ borderBottom: `1px solid ${V2.paperShade}` }}>
                <Th>Datum</Th>
                <Th>Soort</Th>
                <Th>Omschrijving</Th>
                <Th align="right">Bedrag</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const status = STATUS_COPY[o.status] ?? {
                  label: o.status,
                  color: V2.inkMute,
                };
                const kind = KIND_COPY[o.kind] ?? o.kind;
                const date = o.paidAt ?? o.createdAt;
                return (
                  <tr
                    key={o.id}
                    style={{ borderBottom: `1px solid ${V2.paperShade}` }}
                  >
                    <Td mono>{formatDateNl(date)}</Td>
                    <Td>{kind}</Td>
                    <Td>
                      <span
                        style={{
                          color: V2.ink,
                        }}
                      >
                        {o.description ?? "—"}
                      </span>
                      {o.creditAmount && o.creditAmount > 0 && (
                        <span
                          style={{
                            fontFamily: V2.mono,
                            fontSize: 11,
                            color: V2.inkMute,
                            marginLeft: 8,
                          }}
                        >
                          ({o.creditAmount}{" "}
                          {o.creditAmount === 1 ? "credit" : "credits"})
                        </span>
                      )}
                    </Td>
                    <Td align="right" mono>
                      €{eurosFromCents(o.amountCents)}
                    </Td>
                    <Td>
                      <span
                        style={{
                          fontFamily: V2.mono,
                          fontSize: 10,
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          color: status.color,
                          fontWeight: 500,
                        }}
                      >
                        {status.label}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

function Th({
  children,
  align,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      style={{
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: V2.inkMute,
        padding: "10px 12px",
        textAlign: align ?? "left",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  mono,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
}) {
  return (
    <td
      style={{
        fontFamily: mono ? V2.mono : V2.body,
        fontSize: 14,
        color: V2.ink,
        padding: "12px 12px",
        textAlign: align ?? "left",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function SubscriptionPanel({
  subscription,
  plan,
  cancelStep,
}: {
  subscription: {
    plan: string;
    status: string;
    startedAt: Date;
    endsAt: Date | null;
    cancelledAt: Date | null;
    mollieSubscriptionId: string | null;
  } | null;
  plan: {
    name: string;
    interval: string;
    priceCents: number;
    creditsPerInterval: number | null;
  } | null;
  cancelStep: "reason" | null;
}) {
  // No active paid subscription — show CTA to /subscribe. Admin-comped
  // subs (no mollieSubscriptionId) DO show as active; only `plan=free` or
  // a missing row count as "no subscription".
  if (!subscription || subscription.plan === "free") {
    return (
      <Section
        title="Abonnement"
        meta="Liever niet per losse credits? Neem een abonnement."
      >
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 15,
            color: V2.inkSoft,
            margin: "0 0 18px",
            lineHeight: 1.6,
            maxWidth: "60ch",
          }}
        >
          Je hebt op dit moment geen actief abonnement. Met een
          maand- of jaarabonnement wordt je tegoed automatisch
          aangevuld — zonder dat je elke maand opnieuw hoeft te betalen.
        </p>
        <EBtn kind="primary" size="md" href="/subscribe">
          Bekijk abonnementen →
        </EBtn>
      </Section>
    );
  }

  const isCancelled = subscription.status === "cancelled";
  // "Managed" = admin-comped, no recurring billing through Mollie.
  const isManaged = !subscription.mollieSubscriptionId;
  const planName = plan?.name ?? subscription.plan;
  const intervalNl =
    plan?.interval?.toLowerCase() === "1 month"
      ? "elke maand"
      : plan?.interval?.toLowerCase() === "12 months"
        ? "elk jaar"
        : (plan?.interval ?? "");
  const priceStr = plan
    ? `€${(plan.priceCents / 100).toFixed(2).replace(".", ",")}`
    : "";
  const endsAtStr = subscription.endsAt
    ? subscription.endsAt.toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <Section
      id="abonnement"
      title="Abonnement"
      meta={
        isCancelled
          ? "Opgezegd — actief tot het einde van de huidige periode"
          : `${planName} — ${intervalNl}`
      }
    >
      <div
        style={{
          padding: 20,
          background: V2.paperDeep,
          border: `1px solid ${V2.paperShade}`,
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontFamily: V2.display,
                fontSize: 22,
                fontStyle: "italic",
                fontWeight: 400,
                color: V2.ink,
              }}
            >
              {planName}
            </div>
            <div
              style={{
                fontFamily: V2.mono,
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: V2.inkMute,
                marginTop: 6,
              }}
            >
              {priceStr} {intervalNl}
              {plan?.creditsPerInterval ? ` · ${plan.creditsPerInterval} verhalen` : ""}
            </div>
          </div>
          <div
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 13,
              color: isCancelled ? V2.heart : V2.goldDeep,
              textAlign: "right",
            }}
          >
            {isCancelled
              ? endsAtStr
                ? `Actief tot ${endsAtStr}`
                : "Opgezegd"
              : isManaged
                ? endsAtStr
                  ? `Actief tot ${endsAtStr}`
                  : "Actief (handmatig)"
                : endsAtStr
                  ? `Volgende incasso ${endsAtStr}`
                  : "Actief"}
          </div>
        </div>
        {isManaged && !isCancelled && (
          <p
            style={{
              marginTop: 14,
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 12,
              color: V2.inkMute,
              lineHeight: 1.5,
            }}
          >
            Dit abonnement is door ons toegekend en wordt niet automatisch
            geïncasseerd. Verlenging gaat via ons — neem gerust contact op
            als je iets wilt aanpassen.
          </p>
        )}
      </div>

      {!isCancelled && cancelStep !== "reason" ? (
        <div>
          <p
            style={{
              fontFamily: V2.body,
              fontSize: 14,
              color: V2.inkSoft,
              margin: "0 0 14px",
              lineHeight: 1.55,
              maxWidth: "60ch",
            }}
          >
            Wil je opzeggen? Dat kan elk moment. Je behoudt toegang tot
            het einde van de lopende periode; daarna wordt er niets
            meer afgeschreven.
          </p>
          <EBtn kind="ghost" size="md" href="/account?cancelStep=reason#abonnement">
            Abonnement opzeggen
          </EBtn>
        </div>
      ) : !isCancelled && cancelStep === "reason" ? (
        <CancelReasonForm />
      ) : (
        <p
          style={{
            fontFamily: V2.body,
            fontSize: 14,
            color: V2.inkSoft,
            margin: 0,
            lineHeight: 1.55,
            maxWidth: "60ch",
          }}
        >
          Wil je toch doorgaan? Mail{" "}
          <a
            href="mailto:info@onsverhaaltje.nl"
            style={{ color: "inherit" }}
          >
            info@onsverhaaltje.nl
          </a>{" "}
          en we zetten het abonnement weer aan vóór de huidige periode
          afloopt.
        </p>
      )}
    </Section>
  );
}

const CANCEL_REASON_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "te_duur", label: "Te duur" },
  { value: "weinig_gebruikt", label: "Te weinig gebruikt" },
  { value: "tijdelijk", label: "Tijdelijke pauze — kom misschien later terug" },
  { value: "anders", label: "Anders, namelijk…" },
];

function CancelReasonForm() {
  return (
    <form action={cancelSubscriptionAction}>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.inkSoft,
          margin: "0 0 16px",
          lineHeight: 1.55,
          maxWidth: "60ch",
        }}
      >
        Voor we je abonnement opzeggen — kort: waarom stop je? Het helpt
        ons enorm bij het verbeteren. Niets is verplicht; je kunt ook
        gewoon doorklikken.
      </p>
      <fieldset
        style={{
          border: "none",
          padding: 0,
          margin: "0 0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {CANCEL_REASON_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontFamily: V2.body,
              fontSize: 14,
              color: V2.ink,
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="reason"
              value={opt.value}
              style={{ accentColor: V2.gold }}
            />
            {opt.label}
          </label>
        ))}
      </fieldset>
      <label
        style={{
          display: "block",
          fontFamily: V2.ui,
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: V2.inkMute,
          marginBottom: 6,
        }}
      >
        Toelichting (optioneel)
      </label>
      <textarea
        name="reasonNote"
        rows={3}
        maxLength={1000}
        placeholder="Bijvoorbeeld: ik mis een functie X, of de prijs ging onverwacht omhoog…"
        style={{
          width: "100%",
          maxWidth: 560,
          padding: 12,
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.ink,
          background: V2.paper,
          border: `1px solid ${V2.paperShade}`,
          resize: "vertical",
          lineHeight: 1.5,
          marginBottom: 18,
          outline: "none",
        }}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <EBtnSubmit
          kind="ghost"
          size="md"
          pendingLabel="Opzeggen…"
        >
          Bevestig opzegging
        </EBtnSubmit>
        <Link
          href="/account#abonnement"
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Toch niet
        </Link>
      </div>
    </form>
  );
}

function Section({
  title,
  meta,
  children,
  id,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      style={{
        marginTop: 48,
        paddingTop: 32,
        borderTop: `1px solid ${V2.paperShade}`,
        scrollMarginTop: 24,
      }}
    >
      <div style={{ marginBottom: 28 }}>
        <h2
          style={{
            fontFamily: V2.display,
            fontWeight: 300,
            fontSize: 26,
            margin: 0,
            letterSpacing: -0.5,
            color: V2.ink,
          }}
        >
          {title}
        </h2>
        {meta && (
          <p
            style={{
              fontFamily: V2.body,
              fontStyle: "italic",
              fontSize: 14,
              color: V2.inkMute,
              margin: "6px 0 0",
            }}
          >
            {meta}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function FlashSaved({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 32,
        padding: "14px 20px",
        background: "rgba(201,169,97,0.14)",
        borderLeft: `2px solid ${V2.gold}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      ✓ {children}
    </div>
  );
}

/**
 * Inline waarom-survey die verschijnt direct na een uitschrijving via
 * /account. Klant blijft binnen z'n eigen portaal (geen redirect naar
 * de publieke /unsubscribe-pagina). Submit slaat de reden op via
 * `submitAccountUnsubscribeReasonAction`; "Liever overslaan" linkt
 * gewoon weg met state-reset.
 */
function NewsletterReasonForm({ noteRequired }: { noteRequired: boolean }) {
  return (
    <form
      action={submitAccountUnsubscribeReasonAction}
      style={{ display: "grid", gap: 20, marginTop: 4, minWidth: 0 }}
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          margin: 0,
          lineHeight: 1.6,
          maxWidth: "60ch",
        }}
      >
        Mag ik nog kort iets vragen — dat helpt om de nieuwsbrief beter te
        maken. Optioneel, je bent al uitgeschreven.
      </p>

      <fieldset
        style={{
          border: "none",
          padding: 0,
          margin: 0,
          display: "grid",
          gap: 10,
          minInlineSize: 0,
          minWidth: 0,
        }}
      >
        <legend
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: V2.inkMute,
            marginBottom: 4,
          }}
        >
          Waarom afgemeld?
        </legend>
        {NEWSLETTER_REASON_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "14px 16px",
              background: V2.paper,
              border: `1px solid ${V2.paperShade}`,
              cursor: "pointer",
              fontFamily: V2.body,
              fontSize: 15,
              color: V2.ink,
              lineHeight: 1.4,
            }}
          >
            <input
              type="radio"
              name="reason"
              value={opt.value}
              required
              style={{ marginTop: 4, flex: "0 0 auto" }}
            />
            <span
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                flex: 1,
                minWidth: 0,
              }}
            >
              <span>{opt.label}</span>
              {opt.hint && (
                <span
                  style={{
                    fontSize: 13,
                    fontStyle: "italic",
                    color: V2.inkMute,
                  }}
                >
                  {opt.hint}
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>

      <div>
        <label
          htmlFor="newsletter-note"
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: V2.inkMute,
            display: "block",
            marginBottom: 6,
          }}
        >
          Toelichting{" "}
          <span
            style={{
              fontWeight: 400,
              textTransform: "none",
              letterSpacing: 0,
            }}
          >
            (optioneel — verplicht bij &ldquo;Anders&rdquo;)
          </span>
        </label>
        <textarea
          id="newsletter-note"
          name="note"
          rows={4}
          maxLength={2000}
          placeholder="Wat had je anders gewild?"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 14px",
            fontFamily: V2.body,
            fontSize: 15,
            lineHeight: 1.5,
            color: V2.ink,
            background: V2.paper,
            border: `1px solid ${noteRequired ? V2.heart : V2.paperShade}`,
            outline: "none",
            resize: "vertical",
          }}
        />
        {noteRequired && (
          <p
            style={{
              marginTop: 6,
              fontFamily: V2.body,
              fontSize: 13,
              color: V2.heart,
            }}
          >
            Vul een korte toelichting in wanneer je &ldquo;Anders&rdquo; kiest.
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <EBtnSubmit kind="primary" size="md" pendingLabel="Versturen…">
          Verstuur →
        </EBtnSubmit>
        <Link
          href="/account"
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            color: V2.inkMute,
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Liever overslaan
        </Link>
      </div>
    </form>
  );
}

/**
 * Inline-bevestiging direct binnen een Section — voor acties die wegduwen
 * van de globale FlashSaved bovenaan de pagina (waar je 'm zou missen
 * als je halverwege de pagina op een knop klikt en de scroll wordt
 * behouden).
 */
function InlineConfirm({
  kind,
  children,
}: {
  kind: "on" | "off";
  children: React.ReactNode;
}) {
  const accent = kind === "on" ? V2.gold : V2.inkMute;
  const bg = kind === "on" ? "rgba(201,169,97,0.14)" : V2.paperDeep;
  return (
    <div
      style={{
        marginBottom: 18,
        padding: "12px 16px",
        background: bg,
        borderLeft: `2px solid ${accent}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
        lineHeight: 1.45,
      }}
    >
      ✓ {children}
    </div>
  );
}

function FlashError({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 32,
        padding: "14px 20px",
        background: "rgba(196,165,168,0.18)",
        borderLeft: `2px solid ${V2.rose}`,
        fontFamily: V2.body,
        fontSize: 14,
        color: V2.ink,
      }}
    >
      {children}
    </div>
  );
}

function FieldRow({
  children,
  threeTwo,
}: {
  children: React.ReactNode;
  threeTwo?: boolean;
}) {
  return (
    <div
      className="app-form-row"
      style={{
        display: "grid",
        gridTemplateColumns: threeTwo
          ? "minmax(0, 2.4fr) minmax(0, 1fr)"
          : "repeat(2, minmax(0, 1fr))",
        gap: 24,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: V2.inkMute,
        display: "block",
        marginBottom: 8,
      }}
    >
      {children}
    </label>
  );
}

function EField({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <FieldLabel>{label}</FieldLabel>
      <input
        name={name}
        {...props}
        style={{
          width: "100%",
          padding: "10px 0",
          border: "none",
          borderBottom: `1px solid ${V2.paperShade}`,
          background: "transparent",
          fontSize: 16,
          fontFamily: V2.body,
          color: V2.ink,
          outline: "none",
        }}
      />
    </div>
  );
}

function SubscriptionHero({
  plan,
  status,
  endsAt,
  storyCount,
  childrenCount,
  credits,
  isAdmin,
}: {
  plan: string;
  status: string;
  endsAt: Date | null;
  storyCount: number;
  childrenCount: number;
  credits: number | null;
  isAdmin: boolean;
}) {
  const planLabel =
    plan === "premium"
      ? "Jaarabonnement"
      : plan === "basic"
        ? "Maandabonnement"
        : "Proefperiode";
  const subMeta =
    isAdmin
      ? "Admin-account · onbeperkt"
      : plan === "free"
        ? "Gratis verhalen. Upgrade later naar een abonnement."
        : endsAt
          ? `verlengt ${new Date(endsAt).toLocaleDateString("nl-NL", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`
          : `status: ${status}`;

  const stats = [
    {
      n: isAdmin ? "∞" : credits !== null ? String(credits) : String(storyCount),
      l: isAdmin
        ? "ONBEPERKT"
        : credits !== null
          ? "TEGOED"
          : "VERHALEN",
    },
    {
      n: String(storyCount),
      l: storyCount === 1 ? "GEMAAKT" : "GEMAAKT",
    },
    {
      n: String(childrenCount),
      l: childrenCount === 1 ? "KIND" : "KINDEREN",
    },
  ];

  return (
    <div
      style={{
        background: V2.night,
        color: V2.paper,
        padding: "36px 40px",
        position: "relative",
        overflow: "hidden",
        marginBottom: 40,
      }}
    >
      <StarField count={10} />
      <div style={{ position: "relative" }}>
        <Kicker color={V2.gold}>Jouw abonnement</Kicker>
        <div
          style={{
            fontFamily: V2.display,
            fontSize: 36,
            fontWeight: 300,
            marginTop: 10,
            letterSpacing: -0.8,
            color: V2.paper,
          }}
        >
          {isAdmin ? (
            <>
              Admin <span style={{ fontStyle: "italic" }}>toegang</span>
            </>
          ) : (
            <>
              {planLabel.split(" ")[0]}{" "}
              <span style={{ fontStyle: "italic" }}>
                {planLabel.split(" ").slice(1).join(" ") || ""}
              </span>
            </>
          )}
        </div>
        <div
          style={{
            fontFamily: V2.ui,
            fontSize: 13,
            opacity: 0.8,
            marginTop: 4,
          }}
        >
          {subMeta}
        </div>
        <div
          style={{
            display: "flex",
            gap: 48,
            marginTop: 28,
            paddingTop: 28,
            borderTop: `1px solid rgba(255,255,255,0.12)`,
            flexWrap: "wrap",
          }}
        >
          {stats.map((s, i) => (
            <div key={i}>
              <div
                style={{
                  fontFamily: V2.display,
                  fontSize: 36,
                  fontWeight: 300,
                  color: V2.gold,
                  lineHeight: 1,
                }}
              >
                {s.n}
              </div>
              <div
                style={{
                  fontFamily: V2.mono,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  marginTop: 8,
                  opacity: 0.75,
                  color: V2.paper,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { applyMolliePaymentStatus } from "@/lib/payments/orders";
import { V2 } from "@/components/v2/tokens";
import { Kicker, EBtn } from "@/components/v2";
import { AppShell } from "@/components/v2/app/AppShell";

interface Props {
  params: Promise<{ orderId: string }>;
}

export const metadata = {
  title: "Bestelling",
};

/**
 * Landing page after Mollie's hosted checkout. Mollie hits us here
 * regardless of outcome (paid, failed, cancelled). The webhook is the
 * source-of-truth for status, but the user might land here BEFORE the
 * webhook has fired — so we re-poll Mollie inline once if we still see
 * `pending`. That way the page reflects reality without forcing them
 * to refresh.
 */
export default async function OrderStatusPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { orderId } = await params;

  let order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
  });
  if (!order) notFound();

  // If we land here while still pending and we have a Mollie payment id,
  // poll Mollie once. Webhook usually beats the redirect, but not always.
  if (order.status === "pending" && order.molliePaymentId) {
    try {
      await applyMolliePaymentStatus(order.molliePaymentId);
      const refreshed = await prisma.order.findFirst({
        where: { id: orderId, userId: session.user.id },
      });
      if (refreshed) order = refreshed;
    } catch {
      // ignore; we'll show pending and the user can refresh
    }
  }

  return (
    <AppShell
      userName={session.user.name ?? "jij"}
      credits={null}
      nav={[
        { label: "Bibliotheek", href: "/dashboard" },
        { label: "Credits", href: "/credits" },
        { label: "Account", href: "/account" },
      ]}
    >
      <div
        className="app-page-pad"
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "60px 32px 80px",
          fontFamily: V2.body,
          color: V2.ink,
        }}
      >
        <StatusBlock order={order} />
      </div>
    </AppShell>
  );
}

function StatusBlock({
  order,
}: {
  order: {
    status: string;
    description: string;
    amountCents: number;
    creditAmount: number | null;
    paidAt: Date | null;
  };
}) {
  if (order.status === "paid") {
    return (
      <Layout
        kicker="Gelukt"
        title={
          <>
            Bedankt — je credits staan{" "}
            <span style={{ fontStyle: "italic" }}>klaar.</span>
          </>
        }
        body={
          <>
            We hebben{" "}
            <strong>
              {order.creditAmount}{" "}
              {order.creditAmount === 1 ? "verhaal" : "verhalen"}
            </strong>{" "}
            aan je tegoed toegevoegd. Je kunt direct beginnen met het maken
            van een verhaal, of bewaren voor later — credits verlopen niet.
          </>
        }
        ctas={
          <>
            <EBtn kind="primary" size="md" href="/dashboard">
              Naar je verhalen →
            </EBtn>
            <EBtn kind="ghost" size="md" href="/credits">
              Nog een pakket
            </EBtn>
          </>
        }
        accent="success"
      />
    );
  }
  if (order.status === "pending") {
    return (
      <Layout
        kicker="Even geduld"
        title={
          <>
            We{" "}
            <span style={{ fontStyle: "italic" }}>verwerken</span> je
            betaling
          </>
        }
        body={
          <>
            Soms duurt het een paar seconden voordat de bank de betaling
            bevestigt. Ververs deze pagina, of wacht — we mailen je zodra
            de credits klaarstaan.
          </>
        }
        ctas={
          <>
            <EBtn kind="primary" size="md" href={`/credits/order/${order ? "" : ""}`}>
              Vernieuwen
            </EBtn>
            <EBtn kind="ghost" size="md" href="/dashboard">
              Terug naar bibliotheek
            </EBtn>
          </>
        }
        accent="pending"
      />
    );
  }
  if (order.status === "cancelled") {
    return (
      <Layout
        kicker="Geannuleerd"
        title={
          <>
            Je hebt de betaling{" "}
            <span style={{ fontStyle: "italic" }}>onderbroken.</span>
          </>
        }
        body={
          <>
            Geen probleem — er is niets afgeschreven. Je kunt het opnieuw
            proberen of een ander pakket kiezen.
          </>
        }
        ctas={
          <>
            <EBtn kind="primary" size="md" href="/credits">
              Opnieuw kiezen
            </EBtn>
            <EBtn kind="ghost" size="md" href="/dashboard">
              Naar bibliotheek
            </EBtn>
          </>
        }
        accent="warning"
      />
    );
  }
  // failed / expired / refunded
  return (
    <Layout
      kicker="Mislukt"
      title={
        <>
          De betaling is niet{" "}
          <span style={{ fontStyle: "italic" }}>gelukt.</span>
        </>
      }
      body={
        <>
          We hebben geen geld ontvangen, dus je tegoed is niet gewijzigd.
          Probeer het opnieuw, of neem contact op via{" "}
          <Link
            href="/contact"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            contact
          </Link>{" "}
          als het blijft niet werken.
        </>
      }
      ctas={
        <>
          <EBtn kind="primary" size="md" href="/credits">
            Opnieuw proberen
          </EBtn>
          <EBtn kind="ghost" size="md" href="/contact">
            Contact opnemen
          </EBtn>
        </>
      }
      accent="error"
    />
  );
}

function Layout({
  kicker,
  title,
  body,
  ctas,
  accent,
}: {
  kicker: string;
  title: React.ReactNode;
  body: React.ReactNode;
  ctas: React.ReactNode;
  accent: "success" | "pending" | "warning" | "error";
}) {
  const accentColor =
    accent === "success"
      ? V2.goldDeep
      : accent === "pending"
        ? V2.inkMute
        : accent === "warning"
          ? V2.rose
          : V2.heart;
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 44,
            height: 1,
            background: accentColor,
            opacity: 0.8,
          }}
        />
        <Kicker color={accentColor}>{kicker}</Kicker>
      </div>
      <h1
        style={{
          fontFamily: V2.display,
          fontWeight: 300,
          fontSize: "clamp(36px, 5vw, 56px)",
          letterSpacing: -1.4,
          lineHeight: 1.05,
          margin: "0 0 24px",
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 17,
          lineHeight: 1.6,
          color: V2.inkSoft,
          marginBottom: 36,
          maxWidth: 560,
        }}
      >
        {body}
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{ctas}</div>
    </>
  );
}

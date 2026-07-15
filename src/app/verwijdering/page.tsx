import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AuthShell } from "@/components/v2/auth/AuthShell";
import { EBtnSubmit } from "@/components/v2/EBtnSubmit";
import { SignOutButtonV2 } from "@/components/v2/app/SignOutButton";
import { restoreAccountAction } from "./actions";

export const metadata = {
  title: "Account wordt verwijderd",
  robots: { index: false, follow: false },
};

function formatDateNl(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Statuspagina tijdens de 30-dagen-bedenktijd van een verwijderverzoek.
 * Staat bewust BUITEN de (app)-groep: de (app)-layout stuurt iedereen
 * met een gezet `deletionRequestedAt` hierheen, dus binnen die groep
 * zou dit een redirect-loop geven.
 */
export default async function VerwijderingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { deletionRequestedAt: true },
  });
  if (!user?.deletionRequestedAt) redirect("/dashboard");

  const deleteAt = new Date(
    user.deletionRequestedAt.getTime() + 30 * 86_400_000,
  );

  return (
    <AuthShell
      kicker="Verwijderverzoek"
      heading={
        <>
          Je account wordt{" "}
          <span style={{ fontStyle: "italic" }}>verwijderd.</span>
        </>
      }
      footer={<SignOutButtonV2 />}
      rightKicker="Tot ziens?"
      rightTitle="De boekenkast blijft nog even staan"
      rightMeta="30 DAGEN BEDENKTIJD"
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        Op{" "}
        <strong style={{ color: V2.ink }}>{formatDateNl(deleteAt)}</strong>{" "}
        wissen we je account definitief — inclusief alle kindprofielen,
        foto&apos;s, verhalen en boekjes. Tot die tijd staat je account op
        slot.
      </p>
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 14,
          color: V2.inkMute,
          lineHeight: 1.6,
          margin: "16px 0 0",
        }}
      >
        Een eventueel abonnement is bij je aanvraag stopgezet en start
        niet automatisch opnieuw. Ook mails van ons zijn gepauzeerd
        zolang het verzoek loopt.
      </p>

      <form action={restoreAccountAction} style={{ marginTop: 32 }}>
        <EBtnSubmit
          kind="primary"
          size="lg"
          pendingLabel="Herstellen…"
          style={{ width: "100%" }}
        >
          Herstel mijn account
        </EBtnSubmit>
      </form>

      <a
        href="/api/account/export"
        download
        style={{
          display: "block",
          marginTop: 20,
          fontFamily: V2.ui,
          fontSize: 13,
          color: V2.inkMute,
          textAlign: "center",
          textDecoration: "underline",
          textUnderlineOffset: 3,
        }}
      >
        Download je gegevens (JSON)
      </a>
    </AuthShell>
  );
}

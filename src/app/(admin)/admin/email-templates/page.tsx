import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { V2 } from "@/components/v2/tokens";
import { AdminShell, ADMIN_NAV } from "@/components/v2/admin/AdminShell";
import { EDITABLE_TEMPLATES } from "@/lib/email/template-store";

export const dynamic = "force-dynamic";

export default async function EmailTemplatesIndexPage() {
  const session = await auth();
  const overrides = await prisma.emailTemplate.findMany({
    select: { code: true, updatedAt: true, subject: true },
  });
  const overrideMap = new Map(overrides.map((o) => [o.code, o]));
  const nav = ADMIN_NAV.map((n) => ({
    ...n,
    active: n.href === "/admin/email-templates",
  }));

  return (
    <AdminShell
      section="E-mail"
      title="Mail-templates"
      eyebrow="Inhoud van transactionele mails"
      nav={nav}
      adminEmail={session?.user?.email ?? undefined}
    >
      <p
        style={{
          fontFamily: V2.body,
          fontSize: 15,
          color: V2.inkSoft,
          lineHeight: 1.55,
          maxWidth: 640,
          margin: "0 0 28px",
        }}
      >
        Tekst van automatische mails die naar klanten worden verstuurd. De
        defaults staan in de code; pas je iets aan dan slaat dat op als
        override en wordt vanaf de eerstvolgende verzending jouw versie
        gebruikt. <strong>Reset</strong> haalt de override weer weg.
        Variabelen in {"{{krullen}}"} worden bij het versturen automatisch
        ingevuld.
      </p>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: V2.body,
          fontSize: 14,
          background: V2.paper,
          border: `1px solid ${V2.paperShade}`,
        }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${V2.paperShade}` }}>
            <Th>Template</Th>
            <Th>Status</Th>
            <Th>Laatst aangepast</Th>
            <Th></Th>
          </tr>
        </thead>
        <tbody>
          {EDITABLE_TEMPLATES.map((t) => {
            const override = overrideMap.get(t.code);
            return (
              <tr
                key={t.code}
                style={{ borderBottom: `1px solid ${V2.paperShade}` }}
              >
                <Td>
                  <div style={{ fontWeight: 500 }}>{t.label}</div>
                  <div
                    style={{
                      fontFamily: V2.mono,
                      fontSize: 11,
                      color: V2.inkMute,
                      marginTop: 2,
                    }}
                  >
                    {t.code}
                  </div>
                  <div
                    style={{
                      fontFamily: V2.body,
                      fontStyle: "italic",
                      fontSize: 12,
                      color: V2.inkMute,
                      marginTop: 4,
                      lineHeight: 1.4,
                    }}
                  >
                    {t.description}
                  </div>
                </Td>
                <Td>
                  {override ? (
                    <Badge color={V2.gold}>aangepast</Badge>
                  ) : (
                    <Badge color={V2.inkMute}>standaard</Badge>
                  )}
                </Td>
                <Td mono>
                  {override
                    ? override.updatedAt.toLocaleDateString("nl-NL", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </Td>
                <Td align="right">
                  <Link
                    href={`/admin/email-templates/${t.code}`}
                    style={{
                      fontFamily: V2.ui,
                      fontSize: 12,
                      color: V2.goldDeep,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Bewerken →
                  </Link>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminShell>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th
      style={{
        fontFamily: V2.ui,
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: V2.inkMute,
        padding: "12px 18px",
        textAlign: "left",
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
        padding: "16px 18px",
        textAlign: align ?? "left",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function Badge({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        background: `${color}22`,
        color,
        fontFamily: V2.mono,
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Slot op de hele (app)-groep tijdens de 30-dagen-bedenktijd van een
 * accountverwijdering: is `deletionRequestedAt` gezet, dan mag de
 * gebruiker nergens meer in de app komen behalve op /verwijdering
 * (buiten deze groep — anders redirect-loop), waar de herstelknop staat.
 *
 * Verder bewust een pass-through: de (app)-pagina's renderen zelf hun
 * AppShell en regelen hun eigen auth-redirect als er geen sessie is.
 */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { deletionRequestedAt: true },
    });
    if (user?.deletionRequestedAt) redirect("/verwijdering");
  }
  return <>{children}</>;
}

import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assignInvoiceNumber } from "@/lib/payments/invoices";
import { InvoicePdfDocument } from "@/lib/pdf/invoice-pdf";

/**
 * GET /api/orders/[orderId]/factuur — genereert de PDF-factuur voor één
 * betaalde (of terugbetaalde) order en streamt 'm terug als download.
 *
 * Auth: de eigenaar van de order óf een admin. Andere gebruikers
 * krijgen 404, niet 403, zodat het bestaan van andermans orders niet
 * lekt.
 *
 * Factuurnummers worden normaal al in de webhook toegekend; voor oudere
 * orders van vóór die feature kennen we het nummer hier lazy toe
 * (backfill vanzelf bij de eerste download).
 *
 * BTW-berekening vanuit het brutobedrag (consumentenprijs):
 *   excl = round(amountCents / (1 + vatRate/100)); btw = bruto - excl.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }
  const { orderId } = await context.params;
  const isAdmin = session.user.role === "admin";

  const order = await prisma.order.findFirst({
    where: isAdmin
      ? { id: orderId }
      : { id: orderId, userId: session.user.id },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          street: true,
          houseNumber: true,
          postalCode: true,
          city: true,
          country: true,
        },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (order.status !== "paid" && order.status !== "refunded") {
    return NextResponse.json(
      { error: "Alleen betaalde bestellingen hebben een factuur." },
      { status: 409 },
    );
  }

  // Lazy backfill voor orders van vóór de factuurnummer-feature.
  let invoiceNumber = order.invoiceNumber;
  if (!invoiceNumber) {
    try {
      invoiceNumber = await assignInvoiceNumber(order.id);
    } catch (err) {
      console.error(
        `[factuur] invoice number assignment failed for order ${order.id}`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  if (!invoiceNumber) {
    return NextResponse.json(
      { error: "Factuurnummer toekennen mislukt, probeer het zo opnieuw." },
      { status: 500 },
    );
  }

  // BTW vanuit bruto: consument betaalde amountCents inclusief.
  const exclCents = Math.round(
    order.amountCents / (1 + order.vatRate / 100),
  );
  const vatCents = order.amountCents - exclCents;

  // Klantblok: naam + adres voor zover ingevuld; anders alleen
  // naam/e-mail. Verwijderd account (userId null) = neutrale regel,
  // de order zelf is het fiscale snapshot.
  const addressLines: string[] = [];
  if (order.user) {
    const street = [order.user.street, order.user.houseNumber]
      .filter((v) => v && v.trim().length > 0)
      .join(" ");
    if (street) addressLines.push(street);
    const cityLine = [order.user.postalCode, order.user.city]
      .filter((v) => v && v.trim().length > 0)
      .join(" ");
    if (cityLine) addressLines.push(cityLine);
    if (order.user.country && order.user.country.trim().length > 0) {
      addressLines.push(order.user.country);
    }
  }

  const buffer = await renderToBuffer(
    InvoicePdfDocument({
      invoice: {
        invoiceNumber,
        invoiceDate: order.paidAt ?? order.createdAt,
        description: order.description,
        exclCents,
        vatCents,
        totalCents: order.amountCents,
        vatRate: order.vatRate,
        currency: order.currency,
        customerName: order.user?.name ?? "Account verwijderd",
        customerEmail: order.user?.email ?? null,
        customerAddressLines: addressLines,
        orderId: order.id,
        refundedAt: order.refundedAt,
      },
    }),
  );

  const filename = `factuur-${invoiceNumber}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=0, no-store",
    },
  });
}

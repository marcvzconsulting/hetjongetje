import { prisma } from "@/lib/db";

/**
 * Ken een opeenvolgend factuurnummer toe aan een order, in het formaat
 * `OV-{jaar}-{5 cijfers}` (bv. OV-2026-00001). Het jaar komt uit
 * `paidAt` (fallback: nu); de teller staat in de singleton-rij van
 * InvoiceCounter en reset naar 1 bij een jaarwisseling.
 *
 * Idempotent: een order die al een nummer heeft, houdt dat nummer.
 * Alleen orders met status "paid" of "refunded" (= ooit betaald)
 * krijgen een nummer; voor alle andere statussen is het resultaat null.
 *
 * Atomair: de hele toekenning draait in één prisma.$transaction. De
 * `update` op de counter-rij neemt een row-lock, dus twee gelijktijdige
 * webhooks krijgen gegarandeerd verschillende nummers; de @unique op
 * Order.invoiceNumber is het laatste vangnet.
 *
 * Aanroepers in de betaal-flow horen dit best-effort te doen (try/catch
 * + console.error) — een factuurnummer mag een betaling nooit blokkeren.
 */
export async function assignInvoiceNumber(
  orderId: string,
): Promise<string | null> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, invoiceNumber: true, paidAt: true },
    });
    if (!order) return null;
    if (order.invoiceNumber) return order.invoiceNumber;
    if (order.status !== "paid" && order.status !== "refunded") return null;

    const year = (order.paidAt ?? new Date()).getFullYear();

    // Counter-rij ophalen of aanmaken. De update met `increment` is de
    // serialisatie-plek: Postgres locke't de rij tot de transactie
    // commit, dus gelijktijdige toekenningen wachten netjes op elkaar.
    const existing = await tx.invoiceCounter.findUnique({ where: { id: 1 } });
    let next: number;
    if (!existing) {
      await tx.invoiceCounter.create({ data: { id: 1, year, counter: 1 } });
      next = 1;
    } else if (existing.year !== year) {
      // Jaarwisseling: teller terug naar 1 voor het nieuwe jaar.
      await tx.invoiceCounter.update({
        where: { id: 1 },
        data: { year, counter: 1 },
      });
      next = 1;
    } else {
      const updated = await tx.invoiceCounter.update({
        where: { id: 1 },
        data: { counter: { increment: 1 } },
      });
      next = updated.counter;
    }

    const invoiceNumber = `OV-${year}-${String(next).padStart(5, "0")}`;
    await tx.order.update({
      where: { id: orderId },
      data: { invoiceNumber },
    });
    return invoiceNumber;
  });
}

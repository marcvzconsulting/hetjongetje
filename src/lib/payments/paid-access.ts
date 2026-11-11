import { prisma } from "@/lib/db";

/**
 * Heeft deze gebruiker ooit betaald? Een order met status "paid" (los
 * tegoed, abonnement of boek); terugbetaalde orders tellen niet mee.
 *
 * Gebruikt als drempel voor dure functies die geen credit kosten. Het
 * trainen van een persoonlijk model kost ons €2-3 per run; zonder drempel
 * kon elk gratis account dat twee keer per dag starten.
 */
export async function hasPaidOrder(userId: string): Promise<boolean> {
  const paid = await prisma.order.findFirst({
    where: { userId, status: "paid" },
    select: { id: true },
  });
  return paid !== null;
}

import { and, eq, gt, isNull, or, sql } from "drizzle-orm";

import { db, offers, packages } from "@/lib/db";

import type { BookingAmount, BookingAmountInput, PricedOffer } from "../types/payment";
import { assertValidPax, computeBookingAmount } from "../utils/booking-amount";
import { getPenPerUsd } from "../utils/currency";
import { PaymentAmountError } from "../utils/payment-error";

// Se repite el predicado de visibilidad de modules/packages (allí es privado).
const isPublished = eq(packages.status, "published");

// D11: sin caché: el monto se calcula contra la DB en cada llamada.
// Orden: pax -> tipo de cambio -> paquete -> oferta -> cálculo puro (D5).
export async function getBookingAmount(input: BookingAmountInput): Promise<BookingAmount> {
  const { packageId, pax, offerId } = input;
  assertValidPax(pax);
  const penPerUsd = getPenPerUsd();

  const [pkg] = await db
    .select({ priceCents: packages.priceCents })
    .from(packages)
    .where(and(eq(packages.id, packageId), isPublished));
  if (!pkg) throw new PaymentAmountError("package_not_found");

  let offer: PricedOffer | null = null;
  if (offerId != null) {
    // D1/D8: una sola causa pública (inexistente, de otro paquete, inactiva o vencida).
    const [row] = await db
      .select({
        id: offers.id,
        discountType: offers.discountType,
        discountValue: offers.discountValue,
        minPeople: offers.minPeople,
      })
      .from(offers)
      .where(
        and(
          eq(offers.id, offerId),
          eq(offers.packageId, packageId),
          eq(offers.isActive, true),
          or(isNull(offers.validUntil), gt(offers.validUntil, sql`now()`)),
        ),
      );
    if (!row) throw new PaymentAmountError("offer_invalid");
    offer = row;
  }

  return computeBookingAmount({ unitCents: pkg.priceCents, pax, offer, penPerUsd });
}

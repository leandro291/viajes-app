import { calculateOffer } from "@/modules/offers/pricing";

import type { BookingAmount, PricedOffer } from "../types/payment";
import { penToUsdCents } from "./currency";
import { PaymentAmountError } from "./payment-error";

// Valida antes de calculateOffer, que lanzaría RangeError crudo.
export function assertValidPax(pax: number): void {
  if (!Number.isInteger(pax) || pax < 1) {
    throw new PaymentAmountError("invalid_pax", "pax debe ser un entero >= 1");
  }
}

// D5. Pura: sin DB ni env. No lanza por total 0 ni por monto bajo el mínimo de Stripe (Q1).
export function computeBookingAmount(input: {
  unitCents: number;
  pax: number;
  offer: PricedOffer | null;
  penPerUsd: number;
}): BookingAmount {
  const { unitCents, pax, offer, penPerUsd } = input;
  assertValidPax(pax);

  const { discountCents, totalCents } = offer
    ? calculateOffer({ unitCents, pax, ...offer })
    : { discountCents: 0, totalCents: unitCents * pax };

  return {
    // D7: solo la oferta que rebajó algo.
    offerId: offer && discountCents > 0 ? offer.id : null,
    unitPriceCents: unitCents,
    discountCents,
    totalCents,
    exchangeRate: penPerUsd,
    amountUsdCents: penToUsdCents(totalCents, penPerUsd),
  };
}

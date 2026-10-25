import type { OfferTerms } from "@/modules/offers/pricing";

export type PricedOffer = OfferTerms & { id: string };

export type BookingAmountInput = {
  packageId: string; // uuid de packages.id
  pax: number; // entero >= 1
  offerId?: string | null;
};

// Snapshot listo para la tarjeta 014 (bookings.* en PEN, payments.amount_cents en USD).
export type BookingAmount = {
  offerId: string | null; // oferta efectivamente aplicada (D7)
  unitPriceCents: number; // packages.price_cents, por persona, PEN -> bookings.unit_price_cents
  discountCents: number; // PEN -> bookings.discount_cents
  totalCents: number; // unit × pax − discount, PEN -> bookings.total_cents
  exchangeRate: number; // soles por dólar usado -> bookings.exchange_rate
  amountUsdCents: number; // lo que se envía a Stripe, USD -> payments.amount_cents
};

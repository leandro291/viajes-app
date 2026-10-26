import type { BookingAmount } from "@/modules/payments";

export type CheckoutErrorCode =
  | "invalid_input"
  | "invalid_link"
  | "unauthenticated"
  | "profile_missing"
  | "departure_unavailable"
  | "insufficient_seats"
  | "offer_invalid"
  | "below_minimum"
  | "payments_unavailable"
  | "unexpected";

export type CheckoutQuote = {
  departure: { id: string; startsAt: Date; seatsLeft: number };
  package: {
    id: string;
    slug: string;
    title: string;
    coverImageUrl: string | null;
    region: string;
    durationDays: number;
    nights: number;
  };
  pax: number;
  amount: BookingAmount; // PEN (snapshot) + USD a cobrar
  offerExpired: boolean; // se pidió oferta y ya no es válida: amount va sin oferta
  belowMinimum: boolean; // amount.amountUsdCents < STRIPE_MIN_AMOUNT_USD_CENTS
};

export type QuoteResult =
  | { ok: true; quote: CheckoutQuote }
  | { ok: false; code: "departure_unavailable" | "payments_unavailable" }
  | {
      ok: false;
      code: "insufficient_seats";
      seatsLeft: number;
      packageSlug: string;
    };

export type CheckoutField =
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "docType"
  | "docNumber"
  | "terms";

export type CheckoutFormState =
  | { status: "idle" }
  | {
      status: "error";
      code: CheckoutErrorCode;
      message: string;
      fieldErrors?: Partial<Record<CheckoutField, string>>;
      values?: Partial<Record<Exclude<CheckoutField, "terms">, string>>;
    };

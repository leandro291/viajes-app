import { describe, expect, it } from "vitest";

import type { BookingAmount } from "@/modules/payments";

import type { CheckoutErrorCode } from "../types/checkout";
import {
  checkoutErrorMessage,
  describeAmount,
  formatTravelers,
} from "./checkout-labels";

const P = "S/\u00a0";
const T = "\u202f";

const base: BookingAmount = {
  offerId: null,
  unitPriceCents: 129000,
  discountCents: 0,
  totalCents: 258000,
  exchangeRate: 3.75,
  amountUsdCents: 68800,
};

describe("formatTravelers", () => {
  it("AC22: singular y plural", () => {
    expect(formatTravelers(1)).toBe("1 viajero");
    expect(formatTravelers(2)).toBe("2 viajeros");
    expect(formatTravelers(20)).toBe("20 viajeros");
  });
});

describe("describeAmount", () => {
  it("AC22: 129000 x 2 a 3.75, sin descuento", () => {
    expect(describeAmount(base, 2)).toEqual({
      unitLine: `${P}1${T}290 × 2`,
      subtotal: `${P}2${T}580`,
      discount: null,
      total: `${P}2${T}580`,
      charge: "US$\u00a0688.00",
      rate: "1 US$ = S/\u00a03.75",
    });
  });

  it("AC22: con descuento muestra la línea y el total rebajado", () => {
    const out = describeAmount(
      { ...base, offerId: "o1", discountCents: 129000, totalCents: 129000, amountUsdCents: 34400 },
      2,
    );
    expect(out.subtotal).toBe(`${P}2${T}580`);
    expect(out.discount).toBe(`−${P}1${T}290`);
    expect(out.total).toBe(`${P}1${T}290`);
    expect(out.charge).toBe("US$\u00a0344.00");
  });

  it("AC22: tipo de cambio con 2 decimales", () => {
    expect(describeAmount({ ...base, exchangeRate: 4 }, 1).rate).toBe(
      "1 US$ = S/\u00a04.00",
    );
  });
});

describe("checkoutErrorMessage", () => {
  const codes: CheckoutErrorCode[] = [
    "invalid_input",
    "invalid_link",
    "unauthenticated",
    "profile_missing",
    "departure_unavailable",
    "insufficient_seats",
    "offer_invalid",
    "below_minimum",
    "payments_unavailable",
    "unexpected",
  ];

  it.each(codes)("AC21: %s tiene mensaje en español", (code) => {
    const msg = checkoutErrorMessage(code, { seatsLeft: 3 });
    expect(msg.length).toBeGreaterThan(0);
    expect(msg).not.toBe(code);
  });

  it("AC21: cupo incluye el número", () => {
    expect(checkoutErrorMessage("insufficient_seats", { seatsLeft: 3 })).toBe(
      "Solo quedan 3 cupos.",
    );
    expect(checkoutErrorMessage("insufficient_seats", { seatsLeft: 1 })).toBe(
      "Solo queda 1 cupo.",
    );
    expect(checkoutErrorMessage("insufficient_seats", { seatsLeft: 0 })).toBe(
      "Esta salida se agotó.",
    );
    expect(checkoutErrorMessage("insufficient_seats")).toBe(
      "Esta salida se agotó.",
    );
  });

  it("AC24: oferta vencida", () => {
    expect(checkoutErrorMessage("offer_invalid")).toBe(
      "La oferta ya no está vigente.",
    );
  });
});

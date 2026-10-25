import { describe, expect, it } from "vitest";

import type { PricedOffer } from "../types/payment";
import { assertValidPax, computeBookingAmount } from "./booking-amount";
import { PaymentAmountError } from "./payment-error";

const RATE = 3.75;

const percent = (value: number, minPeople: number | null = null): PricedOffer => ({
  id: `offer-${value}`,
  discountType: "percent",
  discountValue: value,
  minPeople,
});
const twoForOne: PricedOffer = {
  id: "offer-2x1",
  discountType: "two_for_one",
  discountValue: null,
  minPeople: null,
};

function expectInvalidPax(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PaymentAmountError);
    expect((error as PaymentAmountError).code).toBe("invalid_pax");
    return;
  }
  throw new Error("no lanzó");
}

describe("computeBookingAmount", () => {
  it("AC5: sin oferta, 129000 × 3", () => {
    expect(computeBookingAmount({ unitCents: 129000, pax: 3, offer: null, penPerUsd: RATE })).toEqual({
      offerId: null,
      unitPriceCents: 129000,
      discountCents: 0,
      totalCents: 387000,
      exchangeRate: RATE,
      amountUsdCents: 103200,
    });
  });

  it("AC5: percent 15, 129000 × 2", () => {
    expect(
      computeBookingAmount({ unitCents: 129000, pax: 2, offer: percent(15), penPerUsd: RATE }),
    ).toEqual({
      offerId: "offer-15",
      unitPriceCents: 129000,
      discountCents: 38600,
      totalCents: 219400,
      exchangeRate: RATE,
      amountUsdCents: 58507,
    });
  });

  it("AC5: two_for_one, 9500 × 3", () => {
    expect(
      computeBookingAmount({ unitCents: 9500, pax: 3, offer: twoForOne, penPerUsd: RATE }),
    ).toMatchObject({
      offerId: "offer-2x1",
      discountCents: 9500,
      totalCents: 19000,
      amountUsdCents: 5067,
    });
  });

  it("AC5: min_people 4 con pax 3 no descuenta y offerId es null (D7)", () => {
    expect(
      computeBookingAmount({ unitCents: 52000, pax: 3, offer: percent(20, 4), penPerUsd: RATE }),
    ).toMatchObject({ offerId: null, discountCents: 0, totalCents: 156000, amountUsdCents: 41600 });
  });

  it("AC5: min_people 4 con pax 4 descuenta y devuelve el id de la oferta", () => {
    expect(
      computeBookingAmount({ unitCents: 52000, pax: 4, offer: percent(20, 4), penPerUsd: RATE }),
    ).toMatchObject({
      offerId: "offer-20",
      discountCents: 41600,
      totalCents: 166400,
      amountUsdCents: 44373,
    });
  });

  it("AC5: percent 100 da total 0 y usd 0 sin lanzar", () => {
    expect(
      computeBookingAmount({ unitCents: 129000, pax: 2, offer: percent(100), penPerUsd: RATE }),
    ).toMatchObject({ totalCents: 0, amountUsdCents: 0 });
  });

  it("AC5: exchangeRate devuelto es el penPerUsd recibido", () => {
    expect(
      computeBookingAmount({ unitCents: 6000, pax: 1, offer: null, penPerUsd: 3.8123 }).exchangeRate,
    ).toBe(3.8123);
  });

  const offers: (PricedOffer | null)[] = [
    null,
    percent(10),
    percent(15),
    percent(33),
    percent(100),
    percent(20, 4),
    twoForOne,
  ];

  it("AC5: total = unit × pax − discount y todo monto es entero (matriz)", () => {
    for (const unitCents of [0, 6000, 9500, 52000, 129000, 165000]) {
      for (const pax of [1, 2, 3, 4, 5, 8]) {
        for (const offer of offers) {
          const r = computeBookingAmount({ unitCents, pax, offer, penPerUsd: RATE });
          expect(r.totalCents).toBe(r.unitPriceCents * pax - r.discountCents);
          expect(r.discountCents).toBeGreaterThanOrEqual(0);
          for (const value of [r.unitPriceCents, r.discountCents, r.totalCents, r.amountUsdCents]) {
            expect(Number.isInteger(value)).toBe(true);
          }
          expect(r.offerId === null).toBe(r.discountCents === 0);
        }
      }
    }
  });

  it.each([0, -1, 1.5, NaN, "2" as unknown as number])(
    "AC6: computeBookingAmount con pax %j lanza invalid_pax",
    (pax) => {
      expectInvalidPax(() =>
        computeBookingAmount({ unitCents: 6000, pax, offer: percent(10), penPerUsd: RATE }),
      );
    },
  );
});

describe("assertValidPax", () => {
  it.each([0, -1, 1.5, NaN, Infinity, "2" as unknown as number, undefined as unknown as number])(
    "AC6: rechaza %j con invalid_pax",
    (pax) => {
      expectInvalidPax(() => assertValidPax(pax));
    },
  );

  it("AC6: acepta enteros >= 1", () => {
    expect(() => assertValidPax(1)).not.toThrow();
    expect(() => assertValidPax(8)).not.toThrow();
  });
});

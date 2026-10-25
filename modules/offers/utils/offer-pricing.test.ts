import { describe, expect, it } from "vitest";

import { applyOffer } from "@/lib/db/seed/helpers";

import type { OfferTerms } from "../types/offer";
import { calculateOffer, compareOffers, discountRank } from "./offer-pricing";

const UNITS = [6000, 9500, 52000, 129000, 165000];
const PAX = [1, 2, 3, 4, 5, 6, 7, 8];
const MIN_PEOPLE = [null, 4];
const TERMS: Omit<OfferTerms, "minPeople">[] = [
  ...[10, 15, 20, 25, 30, 100].map((p) => ({
    discountType: "percent" as const,
    discountValue: p,
  })),
  { discountType: "two_for_one", discountValue: null },
];

describe("calculateOffer", () => {
  it("AC2: coincide con applyOffer (oráculo) en toda la matriz", () => {
    for (const unitCents of UNITS)
      for (const pax of PAX)
        for (const t of TERMS)
          for (const minPeople of MIN_PEOPLE) {
            const input = { ...t, minPeople, unitCents, pax };
            expect(calculateOffer(input), JSON.stringify(input)).toEqual(applyOffer(input));
          }
  });

  it("AC2: redondea a mitad hacia arriba (129000 c x 15 % = S/ 1 097)", () => {
    const r = calculateOffer({
      discountType: "percent",
      discountValue: 15,
      minPeople: null,
      unitCents: 129000,
      pax: 1,
    });
    expect(r.discountedUnitCents).toBe(109700);
  });

  it("AC2: lanza RangeError con entradas inválidas", () => {
    const ok = { discountType: "percent", discountValue: 20, minPeople: null, unitCents: 9500, pax: 2 } as const;
    expect(() => calculateOffer({ ...ok, pax: 0 })).toThrow(RangeError);
    expect(() => calculateOffer({ ...ok, pax: 1.5 })).toThrow(RangeError);
    expect(() => calculateOffer({ ...ok, pax: -1 })).toThrow(RangeError);
    expect(() => calculateOffer({ ...ok, unitCents: -1 })).toThrow(RangeError);
    expect(() => calculateOffer({ ...ok, unitCents: 10.5 })).toThrow(RangeError);
    expect(() => calculateOffer({ ...ok, discountValue: 0 })).toThrow(RangeError);
    expect(() => calculateOffer({ ...ok, discountValue: 101 })).toThrow(RangeError);
    expect(() => calculateOffer({ ...ok, discountValue: null })).toThrow(RangeError);
  });
});

const percent = (value: number) =>
  ({ discountType: "percent", discountValue: value, minPeople: null }) as const;
const twoForOne = { discountType: "two_for_one", discountValue: null, minPeople: null } as const;

describe("discountRank / compareOffers", () => {
  it("AC4: 2x1 vale 50 y percent su valor", () => {
    expect(discountRank(twoForOne)).toBe(50);
    expect(discountRank(percent(25))).toBe(25);
  });

  const offers = [
    { id: "d", validUntil: null, ...percent(20) },
    { id: "c", validUntil: "2026-12-31T04:59:00.000Z", ...percent(20) },
    { id: "b", validUntil: "2026-11-30T04:59:00.000Z", ...percent(20) },
    { id: "a", validUntil: "2026-11-30T04:59:00.000Z", ...percent(20) },
    { id: "e", validUntil: null, ...percent(25) },
    { id: "f", validUntil: "2027-01-01T00:00:00.000Z", ...twoForOne },
  ];
  const expected = ["f", "e", "a", "b", "c", "d"];

  it("AC4: 2x1 > 25 > 20; empate por vencimiento (nulo al final) y luego id", () => {
    expect([...offers].sort(compareOffers).map((o) => o.id)).toEqual(expected);
  });

  it("AC4: el orden no depende del orden de entrada", () => {
    expect([...offers].reverse().sort(compareOffers).map((o) => o.id)).toEqual(expected);
    const shuffled = [offers[3], offers[0], offers[5], offers[2], offers[4], offers[1]];
    expect(shuffled.sort(compareOffers).map((o) => o.id)).toEqual(expected);
  });
});

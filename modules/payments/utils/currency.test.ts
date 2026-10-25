import { afterEach, describe, expect, it, vi } from "vitest";

import { penToUsdCents as seedPenToUsdCents, SEED_PEN_PER_USD } from "@/lib/db/seed/helpers";

import {
  getPenPerUsd,
  parsePenPerUsd,
  penToUsdCents,
  STRIPE_MIN_AMOUNT_USD_CENTS,
} from "./currency";
import { PaymentAmountError } from "./payment-error";

function expectInvalidRate(fn: () => unknown) {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(PaymentAmountError);
    expect((error as PaymentAmountError).code).toBe("invalid_exchange_rate");
    return;
  }
  throw new Error("no lanzó");
}

describe("parsePenPerUsd", () => {
  it.each([
    ["3.75", 3.75],
    [" 3.75 ", 3.75],
    ["4", 4],
    ["0.0001", 0.0001],
  ])("AC3: acepta %j", (raw, expected) => {
    expect(parsePenPerUsd(raw)).toBe(expected);
  });

  it.each([
    undefined,
    "",
    "   ",
    "abc",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "3,75",
    "3.75001",
    "10000",
  ])("AC3: rechaza %j con invalid_exchange_rate", (raw) => {
    expectInvalidRate(() => parsePenPerUsd(raw));
  });
});

describe("getPenPerUsd", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("AC3: lee process.env.PEN_PER_USD en cada llamada", () => {
    vi.stubEnv("PEN_PER_USD", "3.75");
    expect(getPenPerUsd()).toBe(3.75);
    vi.stubEnv("PEN_PER_USD", "4");
    expect(getPenPerUsd()).toBe(4);
  });

  it("AC3: valor ausente, vacío o inválido lanza invalid_exchange_rate", () => {
    vi.stubEnv("PEN_PER_USD", "");
    expectInvalidRate(() => getPenPerUsd());
    vi.stubEnv("PEN_PER_USD", "3,75");
    expectInvalidRate(() => getPenPerUsd());
    vi.stubEnv("PEN_PER_USD", undefined);
    expectInvalidRate(() => getPenPerUsd());
  });
});

describe("penToUsdCents", () => {
  it("AC4: STRIPE_MIN_AMOUNT_USD_CENTS vale 50", () => {
    expect(STRIPE_MIN_AMOUNT_USD_CENTS).toBe(50);
  });

  it.each([
    [0, 0],
    [1, 0],
    [2, 1],
    [9500, 2533],
    [129000, 34400],
    [165000, 44000],
    [247600, 66027],
  ])("AC4: 3.75 con %i → %i", (total, expected) => {
    expect(penToUsdCents(total, 3.75)).toBe(expected);
  });

  it.each([
    [2, 4, 1],
    [6, 4, 2],
    [1, 4, 0],
    [1, 2, 1],
    [3, 2, 2],
  ])("AC4: empate exacto %i con tipo %d → %i (mitad hacia arriba)", (total, rate, expected) => {
    expect(penToUsdCents(total, rate)).toBe(expected);
  });

  it("AC4: coincide con el oráculo del seed con 3.75", () => {
    for (const unit of [6000, 9500, 52000, 129000, 165000]) {
      for (let pax = 1; pax <= 8; pax++) {
        const total = unit * pax;
        expect(penToUsdCents(total, SEED_PEN_PER_USD)).toBe(
          seedPenToUsdCents(total, SEED_PEN_PER_USD),
        );
      }
    }
  });

  it.each([-1, 1.5, Number.NaN, Infinity])("AC4: totalCents %d lanza RangeError", (total) => {
    expect(() => penToUsdCents(total, 3.75)).toThrow(RangeError);
  });

  it.each([0, -1, Number.NaN, Infinity, 3.75001, 10000])(
    "AC4: penPerUsd %d lanza RangeError",
    (rate) => {
      expect(() => penToUsdCents(100, rate)).toThrow(RangeError);
    },
  );
});

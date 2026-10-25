import { PaymentAmountError } from "./payment-error";

export const STRIPE_MIN_AMOUNT_USD_CENTS = 50; // USD 0.50; la 014 decide qué hacer debajo (Q1)

const RATE_SCALE = 10_000; // bookings.exchange_rate es numeric(8,4)

// D2/D3. Número finito > 0, < 10 000 y con a lo sumo 4 decimales.
function isValidRate(rate: number): boolean {
  return (
    Number.isFinite(rate) &&
    rate > 0 &&
    rate < RATE_SCALE &&
    Math.abs(rate * RATE_SCALE - Math.round(rate * RATE_SCALE)) < 1e-6
  );
}

// D2/D3. Lanza PaymentAmountError("invalid_exchange_rate").
export function parsePenPerUsd(raw: string | undefined): number {
  const text = raw?.trim() ?? "";
  const rate = Number(text);
  if (!/^\d+(\.\d+)?$/.test(text) || !isValidRate(rate)) {
    throw new PaymentAmountError(
      "invalid_exchange_rate",
      "PEN_PER_USD debe ser un número > 0 y < 10000, con hasta 4 decimales",
    );
  }
  return rate;
}

// Se lee en cada llamada: nada se evalúa al importar el módulo.
export function getPenPerUsd(): number {
  return parsePenPerUsd(process.env.PEN_PER_USD);
}

// D4. Redondeo mitad hacia arriba exacto en enteros: sin división flotante.
// Lanza RangeError con entradas inválidas.
export function penToUsdCents(totalCents: number, penPerUsd: number): number {
  if (!Number.isInteger(totalCents) || totalCents < 0) {
    throw new RangeError("totalCents debe ser un entero >= 0");
  }
  if (!isValidRate(penPerUsd)) {
    throw new RangeError("penPerUsd debe ser > 0 y < 10000, con hasta 4 decimales");
  }
  const r = Math.round(penPerUsd * RATE_SCALE);
  return Math.floor((2 * totalCents * RATE_SCALE + r) / (2 * r));
}

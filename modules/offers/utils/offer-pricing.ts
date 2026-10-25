import type { OfferDto, OfferTerms } from "../types/offer";

export type OfferPricingInput = OfferTerms & { unitCents: number; pax: number };
export type OfferPricing = {
  discountedUnitCents: number; // precio por persona con descuento (percent); = unitCents en two_for_one
  discountCents: number;
  totalCents: number;
};

// D4. Mismo resultado que applyOffer de lib/db/seed/helpers.ts en dominio válido.
// Lanza RangeError con entradas inválidas. Es lo que reutilizará la tarjeta 013.
export function calculateOffer(input: OfferPricingInput): OfferPricing {
  const { unitCents, pax, discountType, discountValue, minPeople } = input;
  if (!Number.isInteger(pax) || pax < 1) throw new RangeError("pax debe ser un entero >= 1");
  if (!Number.isInteger(unitCents) || unitCents < 0) {
    throw new RangeError("unitCents debe ser un entero >= 0");
  }
  if (
    discountType === "percent" &&
    (discountValue === null ||
      !Number.isInteger(discountValue) ||
      discountValue < 1 ||
      discountValue > 100)
  ) {
    throw new RangeError("discountValue debe ser un entero entre 1 y 100");
  }

  const baseCents = unitCents * pax;

  if (minPeople !== null && pax < minPeople) {
    return { discountedUnitCents: unitCents, discountCents: 0, totalCents: baseCents };
  }

  if (discountType === "two_for_one") {
    const discountCents = (pax - Math.ceil(pax / 2)) * unitCents;
    return {
      discountedUnitCents: unitCents,
      discountCents,
      totalCents: baseCents - discountCents,
    };
  }

  // percent redondeado a soles enteros por unidad, mitad hacia arriba.
  const discountedUnitCents =
    Math.floor((unitCents * (100 - (discountValue ?? 0)) + 5000) / 10000) * 100;
  const discountCents = (unitCents - discountedUnitCents) * pax;
  return { discountedUnitCents, discountCents, totalCents: baseCents - discountCents };
}

// D3. percent → discountValue; two_for_one → 50 (con 2 personas se paga 1).
export function discountRank(terms: OfferTerms): number {
  return terms.discountType === "two_for_one" ? 50 : (terms.discountValue ?? 0);
}

type Rankable = Pick<OfferDto, "id" | "validUntil"> & OfferTerms;

// Ascendente: mayor descuento, luego vence antes (nulo al final), luego id.
export function compareOffers(a: Rankable, b: Rankable): number {
  const byRank = discountRank(b) - discountRank(a);
  if (byRank !== 0) return byRank;

  if (a.validUntil !== b.validUntil) {
    if (a.validUntil === null) return 1;
    if (b.validUntil === null) return -1;
    const byDate = Date.parse(a.validUntil) - Date.parse(b.validUntil);
    if (byDate !== 0) return byDate;
  }

  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

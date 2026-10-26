import type { OfferTerms } from "../types/offer";

const MAX_TRAVELERS = 20; // D11
const DEFAULT_TRAVELERS = 2;

// D12: viajeros con los que la oferta sí aplica.
export function suggestedTravelers(terms: Pick<OfferTerms, "discountType" | "minPeople">): number {
  if (terms.discountType === "two_for_one" || terms.minPeople == null) return DEFAULT_TRAVELERS;
  return Math.min(terms.minPeople, MAX_TRAVELERS);
}

// Las salidas llegan ordenadas por fecha: la primera con cupo suficiente.
export function pickDeparture<T extends { id: string; seatsLeft: number }>(
  departures: T[],
  travelers: number,
): T | null {
  return departures.find((d) => d.seatsLeft >= travelers) ?? null;
}

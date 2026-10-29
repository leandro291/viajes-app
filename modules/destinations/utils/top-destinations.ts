import type { DestinationSalesRow, TopDestinationDto } from "../types/destination-sales";

export const TOP_DESTINATIONS_LIMIT = 5;

/** Solo destinos con ventas: reservas desc, ingresos desc, nombre asc. No muta la entrada. */
export function rankTopDestinations(
  rows: DestinationSalesRow[],
  limit: number = TOP_DESTINATIONS_LIMIT,
): TopDestinationDto[] {
  return rows
    .filter((r) => r.bookingsCount > 0)
    .sort(
      (a, b) =>
        b.bookingsCount - a.bookingsCount ||
        b.revenueCents - a.revenueCents ||
        a.name.localeCompare(b.name, "es"),
    )
    .slice(0, limit);
}

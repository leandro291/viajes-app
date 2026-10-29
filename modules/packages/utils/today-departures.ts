import type { TodayDeparturesDto, TodayDepartureRow } from "../types/departure-today";

export const TODAY_DEPARTURES_LIST_LIMIT = 8;

// Los totales cuentan todas las filas; `items` es solo la lista acotada.
export function summarizeDepartures(
  rows: TodayDepartureRow[],
  limit: number = TODAY_DEPARTURES_LIST_LIMIT,
): TodayDeparturesDto {
  const items = [...rows]
    .sort(
      (a, b) =>
        a.startsAt.getTime() - b.startsAt.getTime() ||
        a.packageTitle.localeCompare(b.packageTitle, "es"),
    )
    .slice(0, limit);
  return {
    departuresCount: rows.length,
    travelersCount: rows.reduce((sum, r) => sum + r.bookedSeats, 0),
    items,
  };
}

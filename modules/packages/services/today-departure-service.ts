import { and, asc, eq, gte, lt, ne } from "drizzle-orm";

import { db, departures, packages } from "@/lib/db";
import type { DateRange } from "@/lib/lima-time";

import type { TodayDeparturesDto, TodayDepartureRow } from "../types/departure-today";
import { summarizeDepartures } from "../utils/today-departures";

// Lectura global del panel admin (sin filtro por operador), dinámica (sin "use cache").
export async function getTodayDepartures(range: DateRange): Promise<TodayDeparturesDto> {
  const rows = await db
    .select({
      id: departures.id,
      packageTitle: packages.title,
      startsAt: departures.startsAt,
      capacity: departures.capacity,
      bookedSeats: departures.bookedSeats,
      status: departures.status,
    })
    .from(departures)
    .innerJoin(packages, eq(packages.id, departures.packageId))
    .where(
      and(
        gte(departures.startsAt, range.from),
        lt(departures.startsAt, range.to),
        ne(departures.status, "cancelled"),
      ),
    )
    .orderBy(asc(departures.startsAt), asc(packages.title), asc(departures.id));
  // El where ya excluye "cancelled"; el narrowing hace que tsc avise si el enum suma valores.
  const items = rows.flatMap((r): TodayDepartureRow[] =>
    r.status === "cancelled" ? [] : [{ ...r, status: r.status }],
  );
  return summarizeDepartures(items);
}

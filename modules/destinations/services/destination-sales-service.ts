import { and, count, eq, gte, lt, sql } from "drizzle-orm";

import { bookings, db, destinations, packages } from "@/lib/db";
import type { DateRange } from "@/lib/lima-time";

import type { TopDestinationDto } from "../types/destination-sales";
import { rankTopDestinations, TOP_DESTINATIONS_LIMIT } from "../utils/top-destinations";

/** Destinos más vendidos: reservas `confirmed` creadas en `range` ([from, to)). Global, sin caché. */
export async function getTopDestinations(
  range: DateRange,
  limit: number = TOP_DESTINATIONS_LIMIT,
): Promise<TopDestinationDto[]> {
  const rows = await db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      bookingsCount: count(bookings.id),
      revenueCents: sql<string>`coalesce(sum(${bookings.totalCents}), 0)`,
    })
    .from(bookings)
    .innerJoin(packages, eq(packages.id, bookings.packageId))
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(
      and(
        eq(bookings.status, "confirmed"),
        gte(bookings.createdAt, range.from),
        lt(bookings.createdAt, range.to),
      ),
    )
    .groupBy(destinations.id);

  return rankTopDestinations(
    rows.map((r) => ({
      ...r,
      bookingsCount: Number(r.bookingsCount),
      revenueCents: Number(r.revenueCents),
    })),
    limit,
  );
}

import { and, asc, count, desc, eq, exists, gt, inArray, lt, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { bookings, db, departures, destinations, packages } from "@/lib/db";

import type { TourCardDto, TourFilters } from "../types/package";
import { dayRange } from "../utils/tour-filters";
import { isDayTourRow, isPublished } from "./package-service";

// Salida futura, programada y con cupo (D2), opcionalmente dentro de [from, to).
function openDeparture(range?: { from: Date; to: Date }): SQL[] {
  const conditions: SQL[] = [
    eq(departures.status, "scheduled"),
    gt(departures.startsAt, sql`now()`),
    lt(departures.bookedSeats, departures.capacity),
  ];
  if (range) {
    conditions.push(sql`${departures.startsAt} >= ${range.from}`, sql`${departures.startsAt} < ${range.to}`);
  }
  return conditions;
}

// Sin LIMIT: techo conocido ~60 tours (ver spec 010, Edge cases).
export async function getTours(filters: TourFilters): Promise<TourCardDto[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.packages, CACHE_TAGS.departures);

  const range = filters.fecha ? dayRange(filters.fecha) : undefined;

  const conditions: SQL[] = [isPublished, isDayTourRow];
  if (filters.ciudad) conditions.push(eq(destinations.slug, filters.ciudad));
  if (range) {
    conditions.push(
      exists(
        db
          .select({ one: departures.id })
          .from(departures)
          .where(and(eq(departures.packageId, packages.id), ...openDeparture(range))),
      ),
    );
  }

  const order =
    filters.orden === "precio-asc"
      ? [asc(packages.priceCents), asc(packages.id)]
      : filters.orden === "mas-cortos"
        ? [asc(packages.durationHours), asc(packages.priceCents), asc(packages.id)]
        : [desc(count(bookings.id)), desc(packages.createdAt), asc(packages.id)];

  const rows = await db
    .select({
      id: packages.id,
      slug: packages.slug,
      title: packages.title,
      blurb: packages.blurb,
      priceCents: packages.priceCents,
      coverImageUrl: packages.coverImageUrl,
      durationHours: packages.durationHours,
      startTime: packages.startTime,
      destinationSlug: destinations.slug,
      destinationName: destinations.name,
      destinationRegion: destinations.region,
    })
    .from(packages)
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .leftJoin(
      bookings,
      and(eq(bookings.packageId, packages.id), eq(bookings.status, "confirmed")),
    )
    .where(and(...conditions))
    .groupBy(packages.id, destinations.id)
    .orderBy(...order);

  if (rows.length === 0) return [];

  // Segunda consulta (D8): un join con departures multiplicaría filas y rompería count(bookings).
  const next = await db
    .selectDistinctOn([departures.packageId], {
      packageId: departures.packageId,
      startsAt: departures.startsAt,
      capacity: departures.capacity,
      bookedSeats: departures.bookedSeats,
    })
    .from(departures)
    .where(
      and(
        inArray(
          departures.packageId,
          rows.map((r) => r.id),
        ),
        ...openDeparture(range),
      ),
    )
    .orderBy(asc(departures.packageId), asc(departures.startsAt));
  const nextByPackage = new Map(next.map((d) => [d.packageId, d]));

  return rows.map((r) => {
    const d = nextByPackage.get(r.id);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      blurb: r.blurb,
      priceCents: r.priceCents,
      coverImageUrl: r.coverImageUrl,
      durationHours: r.durationHours,
      startTime: r.startTime,
      destination: { slug: r.destinationSlug, name: r.destinationName, region: r.destinationRegion },
      nextDeparture: d ? { startsAt: d.startsAt, seatsLeft: d.capacity - d.bookedSeats } : null,
    };
  });
}

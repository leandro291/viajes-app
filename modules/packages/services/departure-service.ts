import { and, eq, gt, sql } from "drizzle-orm";
import { z } from "zod";

import { db, departures, destinations, packages } from "@/lib/db";

import type { BookableDepartureDto } from "../types/package";
import { isPublished } from "./package-service";

const uuid = z.uuid();

// Sin caché (D14): el cupo se evalúa en cada llamada, antes de reservar y de cobrar.
export async function getBookableDeparture(
  departureId: string,
): Promise<BookableDepartureDto | null> {
  if (!uuid.safeParse(departureId).success) return null;

  const [row] = await db
    .select({
      id: departures.id,
      startsAt: departures.startsAt,
      capacity: departures.capacity,
      bookedSeats: departures.bookedSeats,
      packageId: packages.id,
      slug: packages.slug,
      title: packages.title,
      coverImageUrl: packages.coverImageUrl,
      region: destinations.region,
      durationDays: packages.durationDays,
      nights: packages.nights,
    })
    .from(departures)
    .innerJoin(packages, eq(packages.id, departures.packageId))
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(
      and(
        eq(departures.id, departureId),
        eq(departures.status, "scheduled"),
        gt(departures.startsAt, sql`now()`),
        isPublished,
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    startsAt: row.startsAt,
    seatsLeft: Math.max(0, row.capacity - row.bookedSeats),
    package: {
      id: row.packageId,
      slug: row.slug,
      title: row.title,
      coverImageUrl: row.coverImageUrl,
      region: row.region,
      durationDays: row.durationDays,
      nights: row.nights,
    },
  };
}

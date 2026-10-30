import { and, asc, eq, gt, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  db,
  departures,
  destinations,
  packageImages,
  packageInclusions,
  packageItineraryDays,
  packages,
} from "@/lib/db";

import type { DepartureDto, PackageDetailDto } from "../types/package";
import { isPublished } from "./package-service";

const MAX_DEPARTURES = 8;

export async function getPackageBySlug(slug: string): Promise<PackageDetailDto | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.packages);

  const [row] = await db
    .select({
      id: packages.id,
      slug: packages.slug,
      title: packages.title,
      blurb: packages.blurb,
      description: packages.description,
      kind: packages.kind,
      durationDays: packages.durationDays,
      nights: packages.nights,
      durationHours: packages.durationHours,
      startTime: packages.startTime,
      priceCents: packages.priceCents,
      maxGroupSize: packages.maxGroupSize,
      languages: packages.languages,
      meetingPoint: packages.meetingPoint,
      meetingLat: packages.meetingLat,
      meetingLng: packages.meetingLng,
      coverImageUrl: packages.coverImageUrl,
      destinationSlug: destinations.slug,
      destinationName: destinations.name,
      destinationRegion: destinations.region,
    })
    .from(packages)
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(and(isPublished, eq(packages.slug, slug)))
    .limit(1);

  if (!row) return null;

  const [images, itinerary, inclusions] = await Promise.all([
    db
      .select({ url: packageImages.url, alt: packageImages.alt, credit: packageImages.credit })
      .from(packageImages)
      .where(eq(packageImages.packageId, row.id))
      .orderBy(asc(packageImages.sortOrder)),
    db
      .select({
        dayNumber: packageItineraryDays.dayNumber,
        title: packageItineraryDays.title,
        description: packageItineraryDays.description,
        place: packageItineraryDays.place,
        transportLeg: packageItineraryDays.transportLeg,
        imageUrl: packageItineraryDays.imageUrl,
        lat: packageItineraryDays.lat,
        lng: packageItineraryDays.lng,
      })
      .from(packageItineraryDays)
      .where(eq(packageItineraryDays.packageId, row.id))
      .orderBy(asc(packageItineraryDays.dayNumber)),
    db
      .select({ kind: packageInclusions.kind, text: packageInclusions.text })
      .from(packageInclusions)
      .where(eq(packageInclusions.packageId, row.id))
      .orderBy(asc(packageInclusions.sortOrder)),
  ]);

  const { destinationSlug, destinationName, destinationRegion, ...pkg } = row;
  return {
    ...pkg,
    destination: { slug: destinationSlug, name: destinationName, region: destinationRegion },
    images,
    itinerary,
    inclusions: {
      included: inclusions.filter((i) => i.kind === "included").map((i) => i.text),
      excluded: inclusions.filter((i) => i.kind === "excluded").map((i) => i.text),
    },
  };
}

// El cupo cambia con cada reserva: caché corta (D3). 014 lo revalida antes de cobrar.
export async function getDepartures(packageId: string): Promise<DepartureDto[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CACHE_TAGS.departures);

  const rows = await db
    .select({
      id: departures.id,
      startsAt: departures.startsAt,
      capacity: departures.capacity,
      bookedSeats: departures.bookedSeats,
    })
    .from(departures)
    .where(
      and(
        eq(departures.packageId, packageId),
        eq(departures.status, "scheduled"),
        gt(departures.startsAt, sql`now()`),
      ),
    )
    .orderBy(asc(departures.startsAt))
    .limit(MAX_DEPARTURES);

  return rows.map((r) => ({
    id: r.id,
    startsAt: r.startsAt,
    capacity: r.capacity,
    seatsLeft: Math.max(0, r.capacity - r.bookedSeats),
  }));
}

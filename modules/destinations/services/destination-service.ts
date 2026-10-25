import { asc, count, desc, eq, min } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { db, destinations, packages } from "@/lib/db";

import type { DestinationDto } from "../types/destination";

/** Destinos con al menos un paquete publicado: más paquetes primero, luego nombre. */
export async function getDestinations(): Promise<DestinationDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.destinations, CACHE_TAGS.packages);

  const packageCount = count(packages.id);
  const rows = await db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      region: destinations.region,
      heroImageUrl: destinations.heroImageUrl,
      packageCount,
      minPriceCents: min(packages.priceCents),
    })
    .from(destinations)
    .innerJoin(packages, eq(packages.destinationId, destinations.id))
    .where(eq(packages.status, "published"))
    .groupBy(destinations.id)
    .orderBy(desc(packageCount), asc(destinations.name));

  return rows.map((r) => ({
    ...r,
    packageCount: Number(r.packageCount),
    minPriceCents: Number(r.minPriceCents),
  }));
}

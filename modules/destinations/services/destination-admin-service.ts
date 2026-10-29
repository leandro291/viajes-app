import { asc, eq, sql } from "drizzle-orm";

import {
  db,
  destinationClimateMonths,
  destinationFaqs,
  destinations,
  destinationSights,
  packages,
} from "@/lib/db";

import type {
  DestinationAdminItem,
  DestinationEdit,
} from "../types/destination-manage";

// Sin "use cache": lecturas del panel directo a la BD. Subconsultas correlacionadas
// para que los conteos no se multipliquen entre sí.
export async function listAdminDestinations(): Promise<DestinationAdminItem[]> {
  return db
    .select({
      id: destinations.id,
      slug: destinations.slug,
      name: destinations.name,
      region: destinations.region,
      heroImageUrl: destinations.heroImageUrl,
      packageCount:
        sql<number>`(select count(*) from ${packages} where ${packages.destinationId} = ${destinations.id})`.mapWith(
          Number,
        ),
      publishedCount:
        sql<number>`(select count(*) from ${packages} where ${packages.destinationId} = ${destinations.id} and ${packages.status} = 'published')`.mapWith(
          Number,
        ),
      sightCount:
        sql<number>`(select count(*) from ${destinationSights} where ${destinationSights.destinationId} = ${destinations.id})`.mapWith(
          Number,
        ),
    })
    .from(destinations)
    .orderBy(asc(destinations.name));
}

/** `null` si no existe. `id` debe venir validado como uuid (destinationIdSchema). */
export async function getDestinationForEdit(
  id: string,
): Promise<DestinationEdit | null> {
  const [dest] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.id, id));
  if (!dest) return null;

  const [months, sights, faqs] = await Promise.all([
    db
      .select()
      .from(destinationClimateMonths)
      .where(eq(destinationClimateMonths.destinationId, id)),
    db
      .select()
      .from(destinationSights)
      .where(eq(destinationSights.destinationId, id))
      .orderBy(asc(destinationSights.sortOrder)),
    db
      .select()
      .from(destinationFaqs)
      .where(eq(destinationFaqs.destinationId, id))
      .orderBy(asc(destinationFaqs.sortOrder)),
  ]);

  // Meses faltantes -> null (12 posiciones, [0] = enero).
  const climate = Array.from(
    { length: 12 },
    (_, i) => months.find((m) => m.month === i + 1)?.season ?? null,
  );

  return {
    id: dest.id,
    slug: dest.slug,
    values: {
      name: dest.name,
      region: dest.region,
      heroImageUrl: dest.heroImageUrl ?? "",
      tagline: dest.tagline,
      description: dest.description,
      altitudeM: dest.altitudeM,
      bestSeasonText: dest.bestSeasonText,
      fromLimaText: dest.fromLimaText,
      howToGetText: dest.howToGetText,
      tipsText: dest.tipsText,
      climate,
      sights: sights.map((s) => ({
        name: s.name,
        description: s.description,
        imageUrl: s.imageUrl,
        lat: s.lat,
        lng: s.lng,
      })),
      faqs: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    },
  };
}

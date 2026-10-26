import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  db,
  destinationClimateMonths,
  destinationFaqs,
  destinations,
  destinationSights,
} from "@/lib/db";

import type { DestinationDetailDto } from "../types/destination";

/** Destino con clima, lugares y preguntas. No trae paquetes (ver `getDestinationPage`). */
export async function getDestinationBySlug(slug: string): Promise<DestinationDetailDto | null> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.destinations);

  const [destination] = await db
    .select()
    .from(destinations)
    .where(eq(destinations.slug, slug))
    .limit(1);
  if (!destination) return null;

  const [climate, sights, faqs] = await Promise.all([
    db
      .select({ month: destinationClimateMonths.month, season: destinationClimateMonths.season })
      .from(destinationClimateMonths)
      .where(eq(destinationClimateMonths.destinationId, destination.id))
      .orderBy(asc(destinationClimateMonths.month)),
    db
      .select({
        id: destinationSights.id,
        name: destinationSights.name,
        description: destinationSights.description,
        imageUrl: destinationSights.imageUrl,
        sortOrder: destinationSights.sortOrder,
        lat: destinationSights.lat,
        lng: destinationSights.lng,
      })
      .from(destinationSights)
      .where(eq(destinationSights.destinationId, destination.id))
      .orderBy(asc(destinationSights.sortOrder)),
    db
      .select({
        id: destinationFaqs.id,
        question: destinationFaqs.question,
        answer: destinationFaqs.answer,
      })
      .from(destinationFaqs)
      .where(eq(destinationFaqs.destinationId, destination.id))
      .orderBy(asc(destinationFaqs.sortOrder)),
  ]);

  return { ...destination, climate, sights, faqs };
}

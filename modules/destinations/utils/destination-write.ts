import type {
  destinationClimateMonths,
  destinationFaqs,
  destinationSights,
  destinations,
} from "@/lib/db/schema";

import type { DestinationInput } from "../schemas/destination-schema";

// Helpers puros del service de escritura (sin BD): testeables sin DATABASE_URL.

// Campos editables: nunca incluye id ni slug (AC15), para que el UPDATE no los nombre.
export function toDestinationRow(
  input: DestinationInput,
): Omit<typeof destinations.$inferInsert, "id" | "slug"> {
  return {
    name: input.name,
    region: input.region,
    tagline: input.tagline,
    description: input.description,
    altitudeM: input.altitudeM,
    bestSeasonText: input.bestSeasonText,
    fromLimaText: input.fromLimaText,
    howToGetText: input.howToGetText,
    tipsText: input.tipsText,
    heroImageUrl: input.heroImageUrl,
  };
}

export function toChildRows(
  destinationId: string,
  input: DestinationInput,
): {
  climate: (typeof destinationClimateMonths.$inferInsert)[];
  sights: (typeof destinationSights.$inferInsert)[];
  faqs: (typeof destinationFaqs.$inferInsert)[];
} {
  // El schema garantiza todo-o-nada: sin clima -> sin filas.
  const climate = input.climate.flatMap((season, i) =>
    season ? [{ destinationId, month: i + 1, season }] : [],
  );
  return {
    climate,
    sights: input.sights.map((s, i) => ({ destinationId, ...s, sortOrder: i })),
    faqs: input.faqs.map((f, i) => ({ destinationId, ...f, sortOrder: i })),
  };
}

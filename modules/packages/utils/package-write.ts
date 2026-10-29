import type {
  packageCategories,
  packageImages,
  packageInclusions,
  packageItineraryDays,
  packages,
} from "@/lib/db/schema";

import { findPgError } from "@/lib/db/pg-errors";

import type { PackageInput } from "../schemas/package-schema";

export { isFkViolation, isUniqueViolation } from "@/lib/db/pg-errors";

// Helpers puros del service de escritura (sin BD): testeables sin DATABASE_URL.

// Libre -> base; ocupado -> el primer `base-N` (N >= 2) libre, contando huecos.
export function pickAvailableSlug(base: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

// Campos editables: nunca incluye organizerId, slug ni createdAt (AC15), para que el UPDATE no los nombre.
export function toPackageUpdate(
  input: PackageInput,
): Omit<typeof packages.$inferInsert, "organizerId" | "slug"> {
  return {
    destinationId: input.destinationId,
    kind: input.kind,
    title: input.title,
    blurb: input.blurb,
    description: input.description,
    durationDays: input.durationDays,
    nights: input.nights,
    durationHours: input.durationHours,
    startTime: input.startTime,
    priceCents: input.priceCents,
    currency: "PEN",
    maxGroupSize: input.maxGroupSize,
    languages: input.languages,
    meetingPoint: input.meetingPoint,
    meetingLat: input.meetingLat,
    meetingLng: input.meetingLng,
    coverImageUrl: input.coverImageUrl,
    status: input.status,
  };
}

export function toPackageRow(
  organizerId: string,
  input: PackageInput,
  slug: string,
): typeof packages.$inferInsert {
  return { organizerId, slug, ...toPackageUpdate(input) };
}

export function toChildRows(packageId: string, input: PackageInput) {
  const categories: (typeof packageCategories.$inferInsert)[] = input.categoryIds.map(
    (categoryId) => ({ packageId, categoryId }),
  );
  const images: (typeof packageImages.$inferInsert)[] = input.images.map((img, i) => ({
    packageId,
    url: img.url,
    alt: img.alt,
    credit: img.credit,
    sortOrder: i,
  }));
  const itinerary: (typeof packageItineraryDays.$inferInsert)[] = input.itinerary.map((d, i) => ({
    packageId,
    dayNumber: i + 1,
    title: d.title,
    description: d.description,
    place: d.place,
    transportLeg: d.transportLeg,
    imageUrl: d.imageUrl,
    lat: d.lat,
    lng: d.lng,
  }));
  const inclusions: (typeof packageInclusions.$inferInsert)[] = [
    ...input.included.map((text, i) => ({
      packageId,
      kind: "included" as const,
      text,
      sortOrder: i,
    })),
    ...input.excluded.map((text, i) => ({
      packageId,
      kind: "excluded" as const,
      text,
      sortOrder: i,
    })),
  ];
  return { categories, images, itinerary, inclusions };
}

const FK_FIELDS: Record<string, "destinationId" | "categoryIds"> = {
  packages_destination_id_destinations_id_fk: "destinationId",
  package_categories_category_id_categories_id_fk: "categoryIds",
};

// Campo del input cuyo uuid (válido pero inexistente) rompió una FK; null si no es mapeable.
export function fkViolationField(error: unknown): "destinationId" | "categoryIds" | null {
  const e = findPgError(error, "23503");
  const name = e?.constraint ?? e?.constraint_name;
  return typeof name === "string" ? (FK_FIELDS[name] ?? null) : null;
}

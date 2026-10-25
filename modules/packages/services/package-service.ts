import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  bookings,
  categories,
  db,
  destinations,
  packageCategories,
  packages,
} from "@/lib/db";

import type { CategoryDto, PackageCardDto } from "../types/package";

// Único lugar del filtro de visibilidad pública (lo reutilizan 008/011).
const isPublished = eq(packages.status, "published");

export async function getFeaturedPackages(limit: number): Promise<PackageCardDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.packages);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`getFeaturedPackages: limit inválido (${limit}), debe ser un entero >= 1.`);
  }

  const rows = await db
    .select({
      id: packages.id,
      slug: packages.slug,
      title: packages.title,
      blurb: packages.blurb,
      kind: packages.kind,
      durationDays: packages.durationDays,
      priceCents: packages.priceCents,
      coverImageUrl: packages.coverImageUrl,
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
    .where(isPublished)
    .groupBy(packages.id, destinations.id)
    .orderBy(desc(count(bookings.id)), desc(packages.createdAt), asc(packages.id))
    .limit(limit);

  if (rows.length === 0) return [];

  const catRows = await db
    .select({
      packageId: packageCategories.packageId,
      slug: categories.slug,
      name: categories.name,
    })
    .from(packageCategories)
    .innerJoin(categories, eq(categories.id, packageCategories.categoryId))
    .where(
      inArray(
        packageCategories.packageId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(categories.name));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    blurb: r.blurb,
    kind: r.kind,
    durationDays: r.durationDays,
    priceCents: r.priceCents,
    coverImageUrl: r.coverImageUrl,
    destination: { slug: r.destinationSlug, name: r.destinationName, region: r.destinationRegion },
    categories: catRows
      .filter((c) => c.packageId === r.id)
      .map((c) => ({ slug: c.slug, name: c.name })),
  }));
}

export async function getCategories(): Promise<CategoryDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.categories);

  return db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(asc(categories.name));
}

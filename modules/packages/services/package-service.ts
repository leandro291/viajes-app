import { and, asc, between, count, desc, eq, exists, gte, inArray, or, type SQL } from "drizzle-orm";
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

import type { CategoryDto, PackageCardDto, PackageFilters } from "../types/package";

// Único lugar del filtro de visibilidad pública (lo reutilizan 008/011).
export const isPublished = eq(packages.status, "published");

const cardColumns = {
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
};

type CardRow = Omit<PackageCardDto, "destination" | "categories"> & {
  destinationSlug: string;
  destinationName: string;
  destinationRegion: string;
};

// Segunda consulta: categorías (ordenadas por nombre) de los paquetes obtenidos, y mapeo a DTO.
async function withCategories(rows: CardRow[]): Promise<PackageCardDto[]> {
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

export async function getFeaturedPackages(limit: number): Promise<PackageCardDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.packages);

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`getFeaturedPackages: limit inválido (${limit}), debe ser un entero >= 1.`);
  }

  const rows = await db
    .select(cardColumns)
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

  return withCategories(rows);
}

// Sin LIMIT: techo conocido ~60 paquetes (ver spec 008, Edge cases).
export async function getPackages(filters: PackageFilters): Promise<PackageCardDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.packages);

  const conditions: SQL[] = [isPublished];
  if (filters.destino) conditions.push(eq(destinations.slug, filters.destino));
  if (filters.categoria) {
    conditions.push(
      exists(
        db
          .select({ one: packageCategories.packageId })
          .from(packageCategories)
          .innerJoin(categories, eq(categories.id, packageCategories.categoryId))
          .where(
            and(
              eq(packageCategories.packageId, packages.id),
              eq(categories.slug, filters.categoria),
            ),
          ),
      ),
    );
  }
  if (filters.duracion === "1") {
    conditions.push(or(eq(packages.kind, "day_tour"), eq(packages.durationDays, 1))!);
  } else if (filters.duracion === "2-3") {
    conditions.push(between(packages.durationDays, 2, 3));
  } else if (filters.duracion === "4-mas") {
    conditions.push(gte(packages.durationDays, 4));
  }

  const order =
    filters.orden === "precio-asc"
      ? [asc(packages.priceCents), asc(packages.id)]
      : filters.orden === "precio-desc"
        ? [desc(packages.priceCents), asc(packages.id)]
        : [desc(count(bookings.id)), desc(packages.createdAt), asc(packages.id)];

  const rows = await db
    .select(cardColumns)
    .from(packages)
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .leftJoin(
      bookings,
      and(eq(bookings.packageId, packages.id), eq(bookings.status, "confirmed")),
    )
    .where(and(...conditions))
    .groupBy(packages.id, destinations.id)
    .orderBy(...order);

  return withCategories(rows);
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

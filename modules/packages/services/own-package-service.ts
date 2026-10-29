import { and, asc, count, desc, eq } from "drizzle-orm";

import {
  db,
  departures,
  destinations,
  organizers,
  packageCategories,
  packageImages,
  packageInclusions,
  packageItineraryDays,
  packages,
} from "@/lib/db";

import { packageIdSchema, type PackageInput } from "../schemas/package-schema";
import type { CategoryDto } from "../types/package";
import type { PackageScope } from "../types/package-manage";
import { getCategories } from "./package-service";

// Lecturas del panel del operador: dinámicas (sin "use cache") y filtradas por organizer_id (o sin filtro con scope "all", admin).

export type OwnPackageListItem = {
  id: string;
  slug: string;
  title: string;
  kind: "package" | "day_tour";
  status: "draft" | "published";
  durationDays: number;
  priceCents: number;
  coverImageUrl: string | null;
  destinationName: string;
  departureCount: number;
  organizerName: string;
};

export type OwnPackageEdit = {
  id: string;
  slug: string;
  values: PackageInput;
  departureCount: number;
};

export type ManageOptions = {
  destinations: { id: string; name: string; region: string }[];
  categories: CategoryDto[];
};

const scopeFilter = (scope: PackageScope) =>
  scope === "all" ? undefined : eq(packages.organizerId, scope.id);

export async function listOwnPackages(scope: PackageScope): Promise<OwnPackageListItem[]> {
  return db
    .select({
      id: packages.id,
      slug: packages.slug,
      title: packages.title,
      kind: packages.kind,
      status: packages.status,
      durationDays: packages.durationDays,
      priceCents: packages.priceCents,
      coverImageUrl: packages.coverImageUrl,
      destinationName: destinations.name,
      departureCount: count(departures.id),
      organizerName: organizers.businessName,
    })
    .from(packages)
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .innerJoin(organizers, eq(organizers.id, packages.organizerId))
    .leftJoin(departures, eq(departures.packageId, packages.id))
    .where(scopeFilter(scope))
    .groupBy(packages.id, destinations.id, organizers.id)
    .orderBy(desc(packages.createdAt), asc(packages.id));
}

// `id` mal formado -> null (el uuid de Postgres lanzaría); la action/página puede validar antes igualmente.
export async function getOwnPackageForEdit(
  scope: PackageScope,
  id: string,
): Promise<OwnPackageEdit | null> {
  if (!packageIdSchema.safeParse(id).success) return null;

  const [pkg] = await db
    .select()
    .from(packages)
    .where(and(eq(packages.id, id), scopeFilter(scope)));
  if (!pkg) return null;

  const [cats, images, days, inclusions, [{ departureCount }]] = await Promise.all([
    db
      .select({ categoryId: packageCategories.categoryId })
      .from(packageCategories)
      .where(eq(packageCategories.packageId, id))
      .orderBy(asc(packageCategories.categoryId)),
    db
      .select({ url: packageImages.url, alt: packageImages.alt, credit: packageImages.credit })
      .from(packageImages)
      .where(eq(packageImages.packageId, id))
      .orderBy(asc(packageImages.sortOrder)),
    db
      .select({
        title: packageItineraryDays.title,
        description: packageItineraryDays.description,
        place: packageItineraryDays.place,
        transportLeg: packageItineraryDays.transportLeg,
        imageUrl: packageItineraryDays.imageUrl,
        lat: packageItineraryDays.lat,
        lng: packageItineraryDays.lng,
      })
      .from(packageItineraryDays)
      .where(eq(packageItineraryDays.packageId, id))
      .orderBy(asc(packageItineraryDays.dayNumber)),
    db
      .select({ kind: packageInclusions.kind, text: packageInclusions.text })
      .from(packageInclusions)
      .where(eq(packageInclusions.packageId, id))
      .orderBy(asc(packageInclusions.sortOrder)),
    db.select({ departureCount: count() }).from(departures).where(eq(departures.packageId, id)),
  ]);

  const textsOf = (kind: "included" | "excluded") =>
    inclusions.filter((i) => i.kind === kind).map((i) => i.text);

  return {
    id: pkg.id,
    slug: pkg.slug,
    departureCount,
    values: {
      kind: pkg.kind,
      title: pkg.title,
      blurb: pkg.blurb,
      description: pkg.description ?? "",
      destinationId: pkg.destinationId,
      categoryIds: cats.map((c) => c.categoryId),
      priceCents: pkg.priceCents,
      durationDays: pkg.durationDays,
      nights: pkg.nights,
      durationHours: pkg.durationHours,
      // Postgres `time` devuelve "HH:MM:SS"; el formulario usa "HH:MM".
      startTime: pkg.startTime ? pkg.startTime.slice(0, 5) : null,
      maxGroupSize: pkg.maxGroupSize,
      languages: pkg.languages as PackageInput["languages"],
      meetingPoint: pkg.meetingPoint,
      meetingLat: pkg.meetingLat,
      meetingLng: pkg.meetingLng,
      coverImageUrl: pkg.coverImageUrl ?? "",
      images,
      itinerary: days,
      included: textsOf("included"),
      excluded: textsOf("excluded"),
      status: pkg.status,
    },
  };
}

export async function getManageOptions(): Promise<ManageOptions> {
  const [dests, categories] = await Promise.all([
    db
      .select({ id: destinations.id, name: destinations.name, region: destinations.region })
      .from(destinations)
      .orderBy(asc(destinations.name)),
    getCategories(),
  ]);
  return { destinations: dests, categories };
}

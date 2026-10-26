import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { db, destinations, offers, packages } from "@/lib/db";

import type { OfferDto } from "../types/offer";
import { compareOffers } from "../utils/offer-pricing";

// D16: se repite el predicado de visibilidad de modules/packages (allí es privado).
const isPublished = eq(packages.status, "published");

// D2: activa = is_active, vigente (valid_until nulo o futuro) y paquete publicado.
// El "futuro" se evalúa al llenar la caché (desfase aceptado, ver spec Edge cases).
export async function getActiveOffers(): Promise<OfferDto[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CACHE_TAGS.offers, CACHE_TAGS.packages);

  const rows = await db
    .select({
      id: offers.id,
      kind: offers.kind,
      discountType: offers.discountType,
      discountValue: offers.discountValue,
      minPeople: offers.minPeople,
      validUntil: offers.validUntil,
      packageId: packages.id,
      slug: packages.slug,
      title: packages.title,
      durationDays: packages.durationDays,
      priceCents: packages.priceCents,
      coverImageUrl: packages.coverImageUrl,
      region: destinations.region,
    })
    .from(offers)
    .innerJoin(packages, eq(packages.id, offers.packageId))
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(
      and(
        eq(offers.isActive, true),
        or(isNull(offers.validUntil), gt(offers.validUntil, sql`now()`)),
        isPublished,
      ),
    );

  return rows
    .map(
      (r): OfferDto => ({
        id: r.id,
        kind: r.kind,
        discountType: r.discountType,
        discountValue: r.discountValue,
        minPeople: r.minPeople,
        validUntil: r.validUntil ? r.validUntil.toISOString() : null,
        package: {
          id: r.packageId,
          slug: r.slug,
          title: r.title,
          durationDays: r.durationDays,
          priceCents: r.priceCents,
          coverImageUrl: r.coverImageUrl,
          region: r.region,
        },
      }),
    )
    .sort(compareOffers);
}

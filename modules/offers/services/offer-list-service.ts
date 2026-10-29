import { asc, desc, eq } from "drizzle-orm";

import { db, offers, packages } from "@/lib/db";

import type {
  OfferFormOptions,
  OfferScope,
  OwnOfferItem,
} from "../types/offer-manage";

// Lecturas del panel: dinámicas (sin "use cache"). `offers` no tiene organizer_id:
// el dueño es packages.organizer_id, así que todo pasa por el join.
const MAX_ROWS = 500;

const scopeFilter = (scope: OfferScope) =>
  scope === "all" ? undefined : eq(packages.organizerId, scope.id);

export async function listOffers(scope: OfferScope): Promise<OwnOfferItem[]> {
  return (
    db
      .select({
        id: offers.id,
        packageId: offers.packageId,
        packageTitle: packages.title,
        packageStatus: packages.status,
        packageMaxGroupSize: packages.maxGroupSize,
        kind: offers.kind,
        discountType: offers.discountType,
        discountValue: offers.discountValue,
        minPeople: offers.minPeople,
        validUntil: offers.validUntil,
        isActive: offers.isActive,
      })
      .from(offers)
      .innerJoin(packages, eq(packages.id, offers.packageId))
      .where(scopeFilter(scope))
      .orderBy(asc(packages.title), desc(offers.createdAt), asc(offers.id))
      // ponytail: sin paginación, tope de 500 filas; paginar/filtrar por paquete si se supera.
      .limit(MAX_ROWS)
  );
}

export async function getOfferFormOptions(
  scope: OfferScope,
): Promise<OfferFormOptions> {
  const pkgs = await db
    .select({
      id: packages.id,
      title: packages.title,
      status: packages.status,
      maxGroupSize: packages.maxGroupSize,
    })
    .from(packages)
    .where(scopeFilter(scope))
    .orderBy(asc(packages.title), asc(packages.id));
  return { packages: pkgs };
}

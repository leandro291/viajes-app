import { and, eq } from "drizzle-orm";

import { db, offers, packages } from "@/lib/db";
import { getWriteBlock, manageFail } from "@/modules/packages";
import type { ManageResult } from "@/modules/packages";

import type { OfferInput, OfferUpdateInput } from "../schemas/offer-schema";
import type { OfferScope } from "../types/offer-manage";
import { checkOffer } from "../utils/offer-rules";

// Las ofertas no se "publican": `pending` escribe, `suspended` no. `"all"` (admin) no se bloquea.
const blockOf = (scope: OfferScope) =>
  scope === "all" ? null : getWriteBlock(scope.status, { publishing: false });

const ownerFilter = (scope: OfferScope) =>
  scope === "all" ? undefined : eq(packages.organizerId, scope.id);

// `offers` no tiene organizer_id: el dueño es el del paquete.
async function findOwnOffer(scope: OfferScope, id: string) {
  const [row] = await db
    .select({
      validUntil: offers.validUntil,
      minPeople: offers.minPeople,
      packageStatus: packages.status,
      maxGroupSize: packages.maxGroupSize,
    })
    .from(offers)
    .innerJoin(packages, eq(offers.packageId, packages.id))
    .where(and(eq(offers.id, id), ownerFilter(scope)));
  return row;
}

export async function createOffer(
  scope: OfferScope,
  input: OfferInput,
  now: Date = new Date(),
): Promise<ManageResult<{ id: string; catalogChanged: boolean }>> {
  const block = blockOf(scope);
  if (block) return manageFail(block);

  const [pkg] = await db
    .select({ status: packages.status, maxGroupSize: packages.maxGroupSize })
    .from(packages)
    .where(and(eq(packages.id, input.packageId), ownerFilter(scope)));
  if (!pkg) return manageFail("INVALID_INPUT", { packageId: "Elige un paquete tuyo." });

  const errors = checkOffer(null, input, pkg.maxGroupSize, now);
  if (errors) return manageFail("INVALID_INPUT", errors);

  // Crear no rechaza si el paquete ya tiene otra oferta activa (D1).
  const [row] = await db
    .insert(offers)
    .values({
      packageId: input.packageId,
      kind: input.kind,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minPeople: input.minPeople,
      validUntil: input.validUntil,
      isActive: input.isActive,
    })
    .returning({ id: offers.id });
  return { ok: true, id: row.id, catalogChanged: pkg.status === "published" };
}

export async function updateOffer(
  scope: OfferScope,
  id: string,
  input: OfferUpdateInput,
  now: Date = new Date(),
): Promise<ManageResult<{ catalogChanged: boolean }>> {
  const block = blockOf(scope);
  if (block) return manageFail(block);

  const current = await findOwnOffer(scope, id);
  if (!current) return manageFail("NOT_FOUND");

  const errors = checkOffer(current, input, current.maxGroupSize, now);
  if (errors) return manageFail("INVALID_INPUT", errors);

  // Sin guarda optimista (D14): offers no tiene contadores, última escritura gana.
  await db
    .update(offers)
    .set({
      kind: input.kind,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minPeople: input.minPeople,
      validUntil: input.validUntil,
      isActive: input.isActive,
    })
    .where(eq(offers.id, id));
  return { ok: true, catalogChanged: current.packageStatus === "published" };
}

export async function deleteOffer(
  scope: OfferScope,
  id: string,
): Promise<ManageResult<{ catalogChanged: boolean }>> {
  const block = blockOf(scope);
  if (block) return manageFail(block);

  const current = await findOwnOffer(scope, id);
  if (!current) return manageFail("NOT_FOUND");

  // bookings.offer_id es ON DELETE SET NULL: las reservas conservan importes.
  await db.delete(offers).where(eq(offers.id, id));
  return { ok: true, catalogChanged: current.packageStatus === "published" };
}

import { count, eq } from "drizzle-orm";

import { CATALOG_MESSAGES, catalogFail, type CatalogResult } from "@/lib/catalog-action";
import {
  db,
  destinationClimateMonths,
  destinationFaqs,
  destinations,
  destinationSights,
  packages,
} from "@/lib/db";
import { isFkViolation, isUniqueViolation } from "@/lib/db/pg-errors";
import { slugify } from "@/lib/slug";

import type { DestinationInput } from "../schemas/destination-schema";
import { toChildRows, toDestinationRow } from "../utils/destination-write";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Una tabla vacía no admite `insert().values([])`.
async function insertChildren(tx: Tx, destinationId: string, input: DestinationInput) {
  const { climate, sights, faqs } = toChildRows(destinationId, input);
  if (climate.length) await tx.insert(destinationClimateMonths).values(climate);
  if (sights.length) await tx.insert(destinationSights).values(sights);
  if (faqs.length) await tx.insert(destinationFaqs).values(faqs);
}

async function deleteChildren(tx: Tx, destinationId: string) {
  await tx.delete(destinationClimateMonths).where(eq(destinationClimateMonths.destinationId, destinationId));
  await tx.delete(destinationSights).where(eq(destinationSights.destinationId, destinationId));
  await tx.delete(destinationFaqs).where(eq(destinationFaqs.destinationId, destinationId));
}

export async function createDestination(
  input: DestinationInput,
): Promise<CatalogResult<{ id: string; slug: string }>> {
  const slug = slugify(input.name);
  try {
    return await db.transaction(async (tx): Promise<CatalogResult<{ id: string; slug: string }>> => {
      const [row] = await tx
        .insert(destinations)
        .values({ slug, ...toDestinationRow(input) })
        .returning({ id: destinations.id });
      await insertChildren(tx, row.id, input);
      return { ok: true, id: row.id, slug };
    });
  } catch (error) {
    // Slug duplicado: el rollback ya dejó todo como estaba.
    if (isUniqueViolation(error)) return catalogFail("SLUG_TAKEN", { name: CATALOG_MESSAGES.SLUG_TAKEN });
    throw error;
  }
}

export async function updateDestination(id: string, input: DestinationInput): Promise<CatalogResult> {
  return db.transaction(async (tx): Promise<CatalogResult> => {
    const [current] = await tx
      .select({ id: destinations.id })
      .from(destinations)
      .where(eq(destinations.id, id))
      .for("update");
    if (!current) return catalogFail("NOT_FOUND");
    // id y slug nunca se tocan (AC15): el UPDATE ni los nombra.
    await tx.update(destinations).set(toDestinationRow(input)).where(eq(destinations.id, id));
    await deleteChildren(tx, id);
    await insertChildren(tx, id, input);
    return { ok: true };
  });
}

export async function deleteDestination(id: string): Promise<CatalogResult> {
  try {
    return await db.transaction(async (tx): Promise<CatalogResult> => {
      const [found] = await tx
        .select({ id: destinations.id })
        .from(destinations)
        .where(eq(destinations.id, id))
        .for("update");
      if (!found) return catalogFail("NOT_FOUND");
      const [{ used }] = await tx
        .select({ used: count() })
        .from(packages)
        .where(eq(packages.destinationId, id));
      if (used > 0) return catalogFail("HAS_PACKAGES");
      // Hijas (destination_*) en cascade.
      await tx.delete(destinations).where(eq(destinations.id, id));
      return { ok: true };
    });
  } catch (error) {
    // Carrera: un paquete apareció entre el chequeo y el delete (FK restrict).
    if (isFkViolation(error)) return catalogFail("HAS_PACKAGES");
    throw error;
  }
}

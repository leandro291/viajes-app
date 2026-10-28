import { and, eq, like, sql } from "drizzle-orm";

import {
  bookings,
  db,
  departures,
  offers,
  packageCategories,
  packageImages,
  packageInclusions,
  packageItineraryDays,
  packages,
} from "@/lib/db";
import { slugify } from "@/lib/slug";

import type { PackageInput } from "../schemas/package-schema";
import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { getWriteBlock, manageFail } from "../utils/manage-gate";
import {
  fkViolationField,
  isFkViolation,
  isUniqueViolation,
  pickAvailableSlug,
  toChildRows,
  toPackageRow,
  toPackageUpdate,
} from "../utils/package-write";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Status = PackageInput["status"];

const SLUG_CONSTRAINT = "packages_slug_unique";
const MAX_SLUG_ATTEMPTS = 3;

const FK_MESSAGES = {
  destinationId: "El destino seleccionado no existe.",
  categoryIds: "Alguna categoría seleccionada no existe.",
};

// uuid válido pero inexistente: la transacción ya hizo rollback; se devuelve como error de campo.
function failFk(error: unknown) {
  const field = fkViolationField(error);
  return field ? manageFail("INVALID_INPUT", { [field]: FK_MESSAGES[field] }) : null;
}

// Una tabla vacía no admite `insert().values([])`.
async function insertChildren(tx: Tx, packageId: string, input: PackageInput) {
  const { categories, images, itinerary, inclusions } = toChildRows(packageId, input);
  if (categories.length) await tx.insert(packageCategories).values(categories);
  if (images.length) await tx.insert(packageImages).values(images);
  if (itinerary.length) await tx.insert(packageItineraryDays).values(itinerary);
  if (inclusions.length) await tx.insert(packageInclusions).values(inclusions);
}

async function deleteChildren(tx: Tx, packageId: string) {
  await tx.delete(packageCategories).where(eq(packageCategories.packageId, packageId));
  await tx.delete(packageImages).where(eq(packageImages.packageId, packageId));
  await tx.delete(packageItineraryDays).where(eq(packageItineraryDays.packageId, packageId));
  await tx.delete(packageInclusions).where(eq(packageInclusions.packageId, packageId));
}

// Bloquea la fila del paquete (solo si es del operador) hasta el fin de la transacción.
async function lockOwn(tx: Tx, scope: OrganizerScope, id: string) {
  const [row] = await tx
    .select({ status: packages.status, slug: packages.slug })
    .from(packages)
    .where(and(eq(packages.id, id), eq(packages.organizerId, scope.id)))
    .for("update");
  return row;
}

export async function createPackage(
  scope: OrganizerScope,
  input: PackageInput,
): Promise<ManageResult<{ id: string; slug: string; catalogChanged: boolean }>> {
  const block = getWriteBlock(scope.status, { publishing: input.status === "published" });
  if (block) return manageFail(block);

  const base = slugify(input.title);
  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt++) {
    try {
      return await db.transaction(
        async (
          tx,
        ): Promise<ManageResult<{ id: string; slug: string; catalogChanged: boolean }>> => {
          // slug es único global: se mira en todos los operadores.
          const taken = await tx
            .select({ slug: packages.slug })
            .from(packages)
            .where(like(packages.slug, `${base}%`));
          const slug = pickAvailableSlug(
            base,
            taken.map((r) => r.slug),
          );
          const [row] = await tx
            .insert(packages)
            .values(toPackageRow(scope.id, input, slug))
            .returning({ id: packages.id });
          await insertChildren(tx, row.id, input);
          return { ok: true, id: row.id, slug, catalogChanged: input.status === "published" };
        },
      );
    } catch (error) {
      // Carrera: otro creó el mismo slug entre el select y el insert -> nueva transacción.
      const fk = failFk(error);
      if (fk) return fk;
      if (!isUniqueViolation(error, SLUG_CONSTRAINT)) throw error;
    }
  }
  return manageFail("UNKNOWN");
}

export async function updatePackage(
  scope: OrganizerScope,
  id: string,
  input: PackageInput,
): Promise<ManageResult<{ id: string; catalogChanged: boolean }>> {
  const block = getWriteBlock(scope.status, { publishing: input.status === "published" });
  if (block) return manageFail(block);

  try {
    return await db.transaction(
      async (tx): Promise<ManageResult<{ id: string; catalogChanged: boolean }>> => {
        const current = await lockOwn(tx, scope, id);
        if (!current) return manageFail("NOT_FOUND");
        // organizerId y slug nunca se tocan (AC15): el UPDATE ni los nombra.
        await tx.update(packages).set(toPackageUpdate(input)).where(eq(packages.id, id));
        await deleteChildren(tx, id);
        await insertChildren(tx, id, input);
        return {
          ok: true,
          id,
          catalogChanged: current.status === "published" || input.status === "published",
        };
      },
    );
  } catch (error) {
    const fk = failFk(error);
    if (fk) return fk;
    throw error;
  }
}

export async function setPackageStatus(
  scope: OrganizerScope,
  id: string,
  status: Status,
): Promise<ManageResult<{ catalogChanged: boolean }>> {
  const block = getWriteBlock(scope.status, { publishing: status === "published" });
  if (block) return manageFail(block);

  return db.transaction(async (tx): Promise<ManageResult<{ catalogChanged: boolean }>> => {
    const current = await lockOwn(tx, scope, id);
    if (!current) return manageFail("NOT_FOUND");
    if (current.status === status) return { ok: true, catalogChanged: false };
    await tx.update(packages).set({ status }).where(eq(packages.id, id));
    return { ok: true, catalogChanged: true };
  });
}

export async function deletePackage(
  scope: OrganizerScope,
  id: string,
): Promise<ManageResult<{ catalogChanged: boolean }>> {
  // Borrar no publica nada: solo `suspended` queda bloqueado.
  const block = getWriteBlock(scope.status, { publishing: false });
  if (block) return manageFail(block);

  try {
    return await db.transaction(async (tx): Promise<ManageResult<{ catalogChanged: boolean }>> => {
      // Una consulta: fila propia (bloqueada) + conteos de dependencias que restringen el borrado.
      // Los conteos usan `id` como parámetro: en un select de una tabla Drizzle no califica las
      // columnas dentro de `sql`, y `packages.id` se resolvería contra la subconsulta.
      const [row] = await tx
        .select({
          status: packages.status,
          bookingCount: sql<number>`(select count(*)::int from ${bookings} where ${bookings.packageId} = ${id})`,
          departureCount: sql<number>`(select count(*)::int from ${departures} where ${departures.packageId} = ${id})`,
          offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.packageId} = ${id})`,
        })
        .from(packages)
        .where(and(eq(packages.id, id), eq(packages.organizerId, scope.id)))
        .for("update");
      if (!row) return manageFail("NOT_FOUND");
      if (row.bookingCount > 0) return manageFail("HAS_BOOKINGS");
      if (row.departureCount > 0) return manageFail("HAS_DEPARTURES");
      if (row.offerCount > 0) return manageFail("HAS_OFFERS");

      await tx.delete(packages).where(eq(packages.id, id));
      return { ok: true, catalogChanged: row.status === "published" };
    });
  } catch (error) {
    // Carrera: alguien creó una reserva/salida/oferta entre el chequeo y el delete.
    if (isFkViolation(error)) return manageFail("HAS_DEPENDENCIES");
    throw error;
  }
}

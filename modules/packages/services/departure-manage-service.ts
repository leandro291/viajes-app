import { and, eq } from "drizzle-orm";

import { db, departures, guides, packages } from "@/lib/db";

import type { DepartureInput, DepartureUpdateInput } from "../schemas/departure-schema";
import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { checkDepartureChange, checkNewDeparture } from "../utils/departure-rules";
import { getWriteBlock, manageFail } from "../utils/manage-gate";
import { isFkViolation, isUniqueViolation } from "../utils/package-write";

const UNIQUE_CONSTRAINT = "departures_package_starts_at_unique";

const DUPLICATE_DATE = { date: "Ya tienes una salida de este paquete a esa hora." };

// Las salidas no se "publican": `pending` escribe, `suspended` no.
const blockOf = (scope: OrganizerScope) => getWriteBlock(scope.status, { publishing: false });

// `departures` no tiene organizer_id: el dueño es el del paquete (D8).
async function findOwnDeparture(scope: OrganizerScope, id: string) {
  const [row] = await db
    .select({
      startsAt: departures.startsAt,
      capacity: departures.capacity,
      bookedSeats: departures.bookedSeats,
      status: departures.status,
      packageStatus: packages.status,
    })
    .from(departures)
    .innerJoin(packages, eq(departures.packageId, packages.id))
    .where(and(eq(departures.id, id), eq(packages.organizerId, scope.id)));
  return row;
}

async function isOwnGuide(scope: OrganizerScope, guideId: string) {
  const [row] = await db
    .select({ id: guides.id })
    .from(guides)
    .where(and(eq(guides.id, guideId), eq(guides.organizerId, scope.id)));
  return Boolean(row);
}

// ON DELETE RESTRICT (bookings.departure_id) falla con 23001; 23503 cubre FK "no action".
const isRestrictViolation = (error: unknown): boolean => {
  const e = error as { code?: unknown; cause?: { code?: unknown } } | null;
  return e?.code === "23001" || e?.cause?.code === "23001";
};

const GUIDE_ERROR = { guideId: "Elige una guía tuya." };

export async function createDeparture(
  scope: OrganizerScope,
  input: DepartureInput,
  now: Date = new Date(),
): Promise<ManageResult<{ id: string; catalogChanged: boolean }>> {
  const block = blockOf(scope);
  if (block) return manageFail(block);

  const [pkg] = await db
    .select({ status: packages.status })
    .from(packages)
    .where(and(eq(packages.id, input.packageId), eq(packages.organizerId, scope.id)));
  if (!pkg) return manageFail("INVALID_INPUT", { packageId: "Elige un paquete tuyo." });

  if (input.guideId && !(await isOwnGuide(scope, input.guideId))) {
    return manageFail("INVALID_INPUT", GUIDE_ERROR);
  }

  const rule = checkNewDeparture(input.startsAt, now);
  if (rule?.code === "INVALID_INPUT") return manageFail(rule.code, rule.fieldErrors);

  try {
    const [row] = await db
      .insert(departures)
      .values({
        packageId: input.packageId,
        guideId: input.guideId,
        startsAt: input.startsAt,
        capacity: input.capacity,
        bookedSeats: 0,
        status: "scheduled",
      })
      .returning({ id: departures.id });
    return { ok: true, id: row.id, catalogChanged: pkg.status === "published" };
  } catch (error) {
    if (isUniqueViolation(error, UNIQUE_CONSTRAINT)) {
      return manageFail("INVALID_INPUT", DUPLICATE_DATE);
    }
    throw error;
  }
}

export async function updateDeparture(
  scope: OrganizerScope,
  id: string,
  input: DepartureUpdateInput,
  now: Date = new Date(),
): Promise<ManageResult<{ catalogChanged: boolean }>> {
  const block = blockOf(scope);
  if (block) return manageFail(block);

  const current = await findOwnDeparture(scope, id);
  if (!current) return manageFail("NOT_FOUND");

  const rule = checkDepartureChange(current, input, now);
  if (rule) {
    return rule.code === "INVALID_INPUT"
      ? manageFail(rule.code, rule.fieldErrors)
      : manageFail(rule.code);
  }

  if (input.guideId && !(await isOwnGuide(scope, input.guideId))) {
    return manageFail("INVALID_INPUT", GUIDE_ERROR);
  }

  try {
    // Guarda optimista (D9): si se vendió un cupo o cambió el estado desde la lectura, 0 filas.
    const rows = await db
      .update(departures)
      .set({
        startsAt: input.startsAt,
        capacity: input.capacity,
        guideId: input.guideId,
        status: input.status,
      })
      .where(
        and(
          eq(departures.id, id),
          eq(departures.bookedSeats, current.bookedSeats),
          eq(departures.status, current.status),
        ),
      )
      .returning({ id: departures.id });
    if (!rows.length) return manageFail("STALE");
    return { ok: true, catalogChanged: current.packageStatus === "published" };
  } catch (error) {
    if (isUniqueViolation(error, UNIQUE_CONSTRAINT)) {
      return manageFail("INVALID_INPUT", DUPLICATE_DATE);
    }
    throw error;
  }
}

export async function deleteDeparture(
  scope: OrganizerScope,
  id: string,
): Promise<ManageResult<{ catalogChanged: boolean }>> {
  const block = blockOf(scope);
  if (block) return manageFail(block);

  const current = await findOwnDeparture(scope, id);
  if (!current) return manageFail("NOT_FOUND");
  if (current.bookedSeats > 0) return manageFail("DEPARTURE_HAS_BOOKINGS");

  try {
    await db.delete(departures).where(eq(departures.id, id));
    return { ok: true, catalogChanged: current.packageStatus === "published" };
  } catch (error) {
    // bookings.departure_id es restrict: reservas pendientes/canceladas también impiden borrar.
    if (isFkViolation(error) || isRestrictViolation(error)) return manageFail("DEPARTURE_HAS_BOOKINGS");
    throw error;
  }
}

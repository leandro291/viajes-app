"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";

import { CACHE_TAGS } from "@/lib/cache-tags";

import { departureIdSchema, departureInputSchema, departureUpdateSchema } from "../schemas/departure-schema";
import { createDeparture, deleteDeparture, updateDeparture } from "../services/departure-manage-service";
import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { toFieldErrors } from "../utils/field-errors";
import { manageFail } from "../utils/manage-gate";
import { withOrganizer } from "./with-organizer";

const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

// Invalida la caché solo si el catálogo público cambió (AC13), fuera del try/catch del wrapper.
// `catalogChanged` es interno: no se devuelve al cliente.
async function run<T extends object>(
  name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T & { catalogChanged: boolean }>>,
): Promise<ManageResult<T>> {
  const result = await withOrganizer(name, body);
  if (!result.ok) return result;
  const { catalogChanged, ...rest } = result;
  if (catalogChanged) updateTag(CACHE_TAGS.departures);
  return rest as unknown as ManageResult<T>;
}

export async function createDepartureAction(input: unknown): Promise<ManageResult<{ id: string }>> {
  return run<{ id: string }>("createDepartureAction", async (scope) => {
    const parsed = departureInputSchema.safeParse(input);
    return parsed.success ? createDeparture(scope, parsed.data) : invalid(parsed.error);
  });
}

export async function updateDepartureAction(id: string, input: unknown): Promise<ManageResult> {
  return run("updateDepartureAction", async (scope) => {
    const idParsed = departureIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = departureUpdateSchema.safeParse(input);
    return parsed.success ? updateDeparture(scope, idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function deleteDepartureAction(id: string): Promise<ManageResult> {
  return run("deleteDepartureAction", async (scope) => {
    const idParsed = departureIdSchema.safeParse(id);
    return idParsed.success ? deleteDeparture(scope, idParsed.data) : invalid(idParsed.error);
  });
}

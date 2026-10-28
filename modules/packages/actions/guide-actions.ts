"use server";

import { z } from "zod";

import { getCurrentOrganizer } from "@/modules/organizers";

import { guideSchema } from "../schemas/guide-schema";
import { createGuide, deleteGuide, updateGuide } from "../services/guide-service";
import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { toFieldErrors } from "../utils/field-errors";
import { manageFail } from "../utils/manage-gate";

const idSchema = z.uuid();

const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

// Sesión (lanza AuthError, no se captura) -> organizer -> body (valida + service).
// El organizerId sale siempre de la sesión, nunca del input. No invalida caché (AC22).
async function run<T>(
  name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T>>,
): Promise<ManageResult<T>> {
  const organizer = await getCurrentOrganizer();
  if (!organizer) return manageFail("NO_ORGANIZER");
  try {
    return await body(organizer);
  } catch {
    // Texto fijo: sin datos del input ni del error.
    console.error(`${name}: fallo inesperado`);
    return manageFail("UNKNOWN");
  }
}

export async function createGuideAction(input: unknown): Promise<ManageResult<{ id: string }>> {
  return run("createGuideAction", async (scope) => {
    const parsed = guideSchema.safeParse(input);
    return parsed.success ? createGuide(scope, parsed.data) : invalid(parsed.error);
  });
}

export async function updateGuideAction(id: string, input: unknown): Promise<ManageResult> {
  return run("updateGuideAction", async (scope) => {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = guideSchema.safeParse(input);
    return parsed.success ? updateGuide(scope, idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function deleteGuideAction(id: string): Promise<ManageResult> {
  return run("deleteGuideAction", async (scope) => {
    const idParsed = idSchema.safeParse(id);
    return idParsed.success ? deleteGuide(scope, idParsed.data) : invalid(idParsed.error);
  });
}

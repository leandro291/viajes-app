"use server";

import { z } from "zod";

import { guideSchema } from "../schemas/guide-schema";
import { createGuide, deleteGuide, updateGuide } from "../services/guide-service";
import type { ManageResult } from "../types/package-manage";
import { toFieldErrors } from "../utils/field-errors";
import { manageFail } from "../utils/manage-gate";
import { withOrganizer } from "./with-organizer";

const idSchema = z.uuid();

const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

export async function createGuideAction(input: unknown): Promise<ManageResult<{ id: string }>> {
  return withOrganizer("createGuideAction", async (scope) => {
    const parsed = guideSchema.safeParse(input);
    return parsed.success ? createGuide(scope, parsed.data) : invalid(parsed.error);
  });
}

export async function updateGuideAction(id: string, input: unknown): Promise<ManageResult> {
  return withOrganizer("updateGuideAction", async (scope) => {
    const idParsed = idSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = guideSchema.safeParse(input);
    return parsed.success ? updateGuide(scope, idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function deleteGuideAction(id: string): Promise<ManageResult> {
  return withOrganizer("deleteGuideAction", async (scope) => {
    const idParsed = idSchema.safeParse(id);
    return idParsed.success ? deleteGuide(scope, idParsed.data) : invalid(idParsed.error);
  });
}

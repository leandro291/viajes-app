"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";

import { CACHE_TAGS } from "@/lib/cache-tags";

import { packageIdSchema, packageInputSchema, packageStatusSchema } from "../schemas/package-schema";
import {
  createPackage,
  deletePackage,
  setPackageStatus,
  updatePackage,
} from "../services/package-manage-service";
import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { toFieldErrors } from "../utils/field-errors";
import { manageFail } from "../utils/manage-gate";
import { withOrganizer } from "./with-organizer";

const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

// Invalida la caché solo si el catálogo público cambió (AC22), fuera del try/catch del wrapper.
async function run<T extends { catalogChanged: boolean }>(
  name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T>>,
): Promise<ManageResult<T>> {
  const result = await withOrganizer(name, body);
  if (result.ok && result.catalogChanged) updateTag(CACHE_TAGS.packages);
  return result;
}

export async function createPackageAction(input: unknown): Promise<ManageResult<{ id: string }>> {
  return run("createPackageAction", async (scope) => {
    const parsed = packageInputSchema.safeParse(input);
    return parsed.success ? createPackage(scope, parsed.data) : invalid(parsed.error);
  });
}

export async function updatePackageAction(id: string, input: unknown): Promise<ManageResult> {
  return run("updatePackageAction", async (scope) => {
    const idParsed = packageIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = packageInputSchema.safeParse(input);
    return parsed.success ? updatePackage(scope, idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function setPackageStatusAction(id: string, status: unknown): Promise<ManageResult> {
  return run("setPackageStatusAction", async (scope) => {
    const idParsed = packageIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const statusParsed = packageStatusSchema.safeParse(status);
    return statusParsed.success
      ? setPackageStatus(scope, idParsed.data, statusParsed.data)
      : invalid(statusParsed.error);
  });
}

export async function deletePackageAction(id: string): Promise<ManageResult> {
  return run("deletePackageAction", async (scope) => {
    const idParsed = packageIdSchema.safeParse(id);
    return idParsed.success ? deletePackage(scope, idParsed.data) : invalid(idParsed.error);
  });
}

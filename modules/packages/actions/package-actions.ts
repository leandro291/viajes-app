"use server";

import type { z } from "zod";

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
import { runPackageAction } from "./run-package-action";
import { withOrganizer } from "./with-organizer";

const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

const run = <T extends { catalogChanged: boolean }>(
  name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T>>,
) => runPackageAction(withOrganizer, name, body);

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

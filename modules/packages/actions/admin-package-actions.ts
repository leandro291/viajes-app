"use server";

import type { z } from "zod";

import { packageIdSchema, packageInputSchema, packageStatusSchema } from "../schemas/package-schema";
import { deletePackage, setPackageStatus, updatePackage } from "../services/package-manage-service";
import type { ManageResult } from "../types/package-manage";
import { toFieldErrors } from "../utils/field-errors";
import { manageFail } from "../utils/manage-gate";
import { runPackageAction } from "./run-package-action";
import { withAdmin } from "./with-admin";

const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

export async function updatePackageAdminAction(id: string, input: unknown): Promise<ManageResult> {
  return runPackageAction(withAdmin, "updatePackageAdminAction", async (scope) => {
    const idParsed = packageIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = packageInputSchema.safeParse(input);
    return parsed.success ? updatePackage(scope, idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function setPackageStatusAdminAction(id: string, status: unknown): Promise<ManageResult> {
  return runPackageAction(withAdmin, "setPackageStatusAdminAction", async (scope) => {
    const idParsed = packageIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const statusParsed = packageStatusSchema.safeParse(status);
    return statusParsed.success
      ? setPackageStatus(scope, idParsed.data, statusParsed.data)
      : invalid(statusParsed.error);
  });
}

export async function deletePackageAdminAction(id: string): Promise<ManageResult> {
  return runPackageAction(withAdmin, "deletePackageAdminAction", async (scope) => {
    const idParsed = packageIdSchema.safeParse(id);
    return idParsed.success ? deletePackage(scope, idParsed.data) : invalid(idParsed.error);
  });
}

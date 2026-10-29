"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { catalogFail, runAdminAction } from "@/lib/catalog-action";
import type { CatalogResult } from "@/lib/catalog-action";
import { toFieldErrors } from "@/modules/packages";

import { destinationIdSchema, destinationInputSchema } from "../schemas/destination-schema";
import { createDestination, deleteDestination, updateDestination } from "../services/destination-manage-service";

const invalid = (error: z.ZodError) => catalogFail("INVALID_INPUT", toFieldErrors(error));

// Invalida la caché solo tras un resultado ok, fuera del try/catch de runAdminAction.
async function run<T extends object>(
  name: string,
  body: () => Promise<CatalogResult<T>>,
): Promise<CatalogResult<T>> {
  const result = await runAdminAction(name, body);
  if (result.ok) {
    updateTag(CACHE_TAGS.destinations);
    updateTag(CACHE_TAGS.packages);
  }
  return result;
}

export async function createDestinationAction(input: unknown): Promise<CatalogResult<{ id: string }>> {
  return run<{ id: string }>("createDestinationAction", async () => {
    const parsed = destinationInputSchema.safeParse(input);
    return parsed.success ? createDestination(parsed.data) : invalid(parsed.error);
  });
}

export async function updateDestinationAction(id: string, input: unknown): Promise<CatalogResult> {
  return run("updateDestinationAction", async () => {
    const idParsed = destinationIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = destinationInputSchema.safeParse(input);
    return parsed.success ? updateDestination(idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function deleteDestinationAction(id: string): Promise<CatalogResult> {
  return run("deleteDestinationAction", async () => {
    const idParsed = destinationIdSchema.safeParse(id);
    return idParsed.success ? deleteDestination(idParsed.data) : invalid(idParsed.error);
  });
}

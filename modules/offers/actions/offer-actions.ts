"use server";

import { updateTag } from "next/cache";
import type { z } from "zod";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { manageFail, toFieldErrors, withOrganizer } from "@/modules/packages";
import type { ManageResult, OrganizerScope } from "@/modules/packages";

import { offerIdSchema, offerInputSchema, offerUpdateSchema } from "../schemas/offer-schema";
import { createOffer, deleteOffer, updateOffer } from "../services/offer-manage-service";

const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

// Invalida la caché solo si el catálogo público cambió (AC15), fuera del try/catch del wrapper.
// `catalogChanged` es interno: no se devuelve al cliente.
async function run<T extends object>(
  name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T & { catalogChanged: boolean }>>,
): Promise<ManageResult<T>> {
  const result = await withOrganizer(name, body);
  if (!result.ok) return result;
  const { catalogChanged, ...rest } = result;
  if (catalogChanged) updateTag(CACHE_TAGS.offers);
  return rest as unknown as ManageResult<T>;
}

export async function createOfferAction(input: unknown): Promise<ManageResult<{ id: string }>> {
  return run<{ id: string }>("createOfferAction", async (scope) => {
    const parsed = offerInputSchema.safeParse(input);
    return parsed.success ? createOffer(scope, parsed.data) : invalid(parsed.error);
  });
}

export async function updateOfferAction(id: string, input: unknown): Promise<ManageResult> {
  return run("updateOfferAction", async (scope) => {
    const idParsed = offerIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = offerUpdateSchema.safeParse(input);
    return parsed.success ? updateOffer(scope, idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function deleteOfferAction(id: string): Promise<ManageResult> {
  return run("deleteOfferAction", async (scope) => {
    const idParsed = offerIdSchema.safeParse(id);
    return idParsed.success ? deleteOffer(scope, idParsed.data) : invalid(idParsed.error);
  });
}

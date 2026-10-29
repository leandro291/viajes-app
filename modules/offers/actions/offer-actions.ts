"use server";

import { withOrganizer } from "@/modules/packages";
import type { ManageResult, OrganizerScope } from "@/modules/packages";

import { offerIdSchema, offerInputSchema, offerUpdateSchema } from "../schemas/offer-schema";
import { createOffer, deleteOffer, updateOffer } from "../services/offer-manage-service";
import { invalid, runOfferAction } from "./run-offer-action";

const run = <T extends object>(
  name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T & { catalogChanged: boolean }>>,
) => runOfferAction<OrganizerScope, T>(withOrganizer, name, body);

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

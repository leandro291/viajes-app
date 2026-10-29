"use server";

import { withAdmin } from "@/modules/packages";
import type { ManageResult } from "@/modules/packages";

import { offerIdSchema, offerInputSchema, offerUpdateSchema } from "../schemas/offer-schema";
import { createOffer, deleteOffer, updateOffer } from "../services/offer-manage-service";
import { invalid, runOfferAction } from "./run-offer-action";

// El scope "all" lo fija withAdmin en el servidor; nunca viene del cliente.
const run = <T extends object>(
  name: string,
  body: (scope: "all") => Promise<ManageResult<T & { catalogChanged: boolean }>>,
) => runOfferAction<"all", T>(withAdmin, name, body);

export async function createOfferAdminAction(input: unknown): Promise<ManageResult<{ id: string }>> {
  return run<{ id: string }>("createOfferAdminAction", async (scope) => {
    const parsed = offerInputSchema.safeParse(input);
    return parsed.success ? createOffer(scope, parsed.data) : invalid(parsed.error);
  });
}

export async function updateOfferAdminAction(id: string, input: unknown): Promise<ManageResult> {
  return run("updateOfferAdminAction", async (scope) => {
    const idParsed = offerIdSchema.safeParse(id);
    if (!idParsed.success) return invalid(idParsed.error);
    const parsed = offerUpdateSchema.safeParse(input);
    return parsed.success ? updateOffer(scope, idParsed.data, parsed.data) : invalid(parsed.error);
  });
}

export async function deleteOfferAdminAction(id: string): Promise<ManageResult> {
  return run("deleteOfferAdminAction", async (scope) => {
    const idParsed = offerIdSchema.safeParse(id);
    return idParsed.success ? deleteOffer(scope, idParsed.data) : invalid(idParsed.error);
  });
}

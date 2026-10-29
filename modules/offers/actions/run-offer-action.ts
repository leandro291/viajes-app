import { updateTag } from "next/cache";
import type { z } from "zod";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { manageFail, toFieldErrors } from "@/modules/packages";
import type { ManageResult } from "@/modules/packages";

type Guard<S> = <T>(
  name: string,
  body: (scope: S) => Promise<ManageResult<T>>,
) => Promise<ManageResult<T>>;

export const invalid = (error: z.ZodError) => manageFail("INVALID_INPUT", toFieldErrors(error));

// Corre el body bajo el guard (withOrganizer | withAdmin) e invalida la caché solo si el
// catálogo público cambió (AC15), fuera del try/catch del wrapper.
// `catalogChanged` es interno: no se devuelve al cliente.
export async function runOfferAction<S, T extends object>(
  guard: Guard<S>,
  name: string,
  body: (scope: S) => Promise<ManageResult<T & { catalogChanged: boolean }>>,
): Promise<ManageResult<T>> {
  const result = await guard(name, body);
  if (!result.ok) return result;
  const { catalogChanged, ...rest } = result;
  if (catalogChanged) updateTag(CACHE_TAGS.offers);
  return rest as unknown as ManageResult<T>;
}

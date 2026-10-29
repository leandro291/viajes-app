import { updateTag } from "next/cache";

import { CACHE_TAGS } from "@/lib/cache-tags";

import type { ManageResult } from "../types/package-manage";

type Guard<S> = <T>(
  name: string,
  body: (scope: S) => Promise<ManageResult<T>>,
) => Promise<ManageResult<T>>;

// Corre el body bajo el guard (withOrganizer | withAdmin) e invalida la caché solo si el
// catálogo público cambió (AC22), fuera del try/catch del wrapper.
export async function runPackageAction<S, T extends { catalogChanged: boolean }>(
  guard: Guard<S>,
  name: string,
  body: (scope: S) => Promise<ManageResult<T>>,
): Promise<ManageResult<T>> {
  const result = await guard(name, body);
  if (result.ok && result.catalogChanged) updateTag(CACHE_TAGS.packages);
  return result;
}

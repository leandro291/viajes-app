import { getCurrentOrganizer } from "@/modules/organizers";

import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { manageFail } from "../utils/manage-gate";

// Sesión (lanza AuthError, no se captura) -> organizer -> body (valida + service).
// El organizerId sale siempre de la sesión, nunca del input.
export async function withOrganizer<T>(
  name: string,
  body: (scope: OrganizerScope) => Promise<ManageResult<T>>,
): Promise<ManageResult<T>> {
  const organizer = await getCurrentOrganizer();
  if (!organizer) return manageFail("NO_ORGANIZER");
  try {
    return await body(organizer);
  } catch {
    // Texto fijo: sin datos del input ni del error.
    console.error(`${name}: fallo inesperado`);
    return manageFail("UNKNOWN");
  }
}

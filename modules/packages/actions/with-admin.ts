import { requireRole } from "@/lib/auth/require-role";

import type { ManageResult } from "../types/package-manage";
import { manageFail } from "../utils/manage-gate";

// Sesión admin+ (lanza AuthError, no se captura) -> body (valida + service).
// El alcance "all" lo fija el servidor, nunca el cliente.
export async function withAdmin<T>(
  name: string,
  body: (scope: "all") => Promise<ManageResult<T>>,
): Promise<ManageResult<T>> {
  await requireRole("admin");
  try {
    return await body("all");
  } catch {
    // Texto fijo: sin datos del input ni del error.
    console.error(`${name}: fallo inesperado`);
    return manageFail("UNKNOWN");
  }
}

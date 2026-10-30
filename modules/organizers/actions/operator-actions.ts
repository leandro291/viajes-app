"use server";

import { requireRole } from "@/lib/auth/require-role";

import { operatorStatusSchema } from "../schemas/operator-schema";
import { setOperatorStatus } from "../services/operator-service";
import { operatorFail, type OperatorResult } from "../types/organizer-manage";
import type { OrganizerStatus } from "../types/organizer";

// requireRole fuera del try: el AuthError sube. El rol nunca viene del cliente.
// ponytail: 4º wrapper del mismo patrón (withAdmin, withOrganizer, runAdminAction); unificar en otra tarjeta.
export async function setOperatorStatusAction(
  id: string,
  status: unknown,
): Promise<OperatorResult<{ status: OrganizerStatus }>> {
  await requireRole("admin");
  try {
    const parsed = operatorStatusSchema.safeParse({ id, status });
    if (!parsed.success) return operatorFail("INVALID_INPUT");
    return await setOperatorStatus(parsed.data.id, parsed.data.status);
  } catch {
    // Texto fijo: sin datos del input ni del error.
    console.error("setOperatorStatusAction: fallo inesperado");
    return operatorFail("UNKNOWN");
  }
}

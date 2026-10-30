"use server";

import { requireRole } from "@/lib/auth/require-role";

import { grantAdminSchema, revokeAdminSchema } from "../schemas/admin-schema";
import { grantAdmin, revokeAdmin } from "../services/admin-service";
import { adminFail, type AdminResult } from "../types/admin-manage";

// requireRole fuera del try: el AuthError sube. El rol nunca viene del cliente.
export async function grantAdminAction(email: unknown): Promise<AdminResult> {
  await requireRole("super_admin");
  try {
    const parsed = grantAdminSchema.safeParse({ email });
    if (!parsed.success) return adminFail("INVALID_INPUT", { email: "Ingresa un correo válido." });
    return await grantAdmin(parsed.data.email);
  } catch {
    // Texto fijo: sin datos del input ni del error.
    console.error("grantAdminAction: fallo inesperado");
    return adminFail("UNKNOWN");
  }
}

export async function revokeAdminAction(id: unknown): Promise<AdminResult> {
  await requireRole("super_admin");
  try {
    const parsed = revokeAdminSchema.safeParse({ id });
    if (!parsed.success) return adminFail("INVALID_INPUT");
    return await revokeAdmin(parsed.data.id);
  } catch {
    console.error("revokeAdminAction: fallo inesperado");
    return adminFail("UNKNOWN");
  }
}

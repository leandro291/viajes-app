"use server";

import { requireRole } from "@/lib/auth/require-role";
import { catalogFail, type CatalogResult } from "@/lib/catalog-result";

import { notificationPreferenceSchema } from "../schemas/notification-schema";
import { setNotificationPreference } from "../services/notification-preference-service";
import { getUserByClerkId } from "../services/user-service";

// requireRole fuera del try: el AuthError sube. El dueño sale de la sesión, nunca de los argumentos (D7).
export async function setNotificationPreferenceAction(key: unknown, enabled: unknown): Promise<CatalogResult> {
  const { userId } = await requireRole("super_admin");
  try {
    const parsed = notificationPreferenceSchema.safeParse({ key, enabled });
    if (!parsed.success) return catalogFail("INVALID_INPUT");
    const user = await getUserByClerkId(userId);
    if (!user) return catalogFail("NOT_FOUND");
    await setNotificationPreference(user.id, parsed.data.key, parsed.data.enabled);
    return { ok: true };
  } catch {
    // Texto fijo: sin datos del input ni del error.
    console.error("setNotificationPreferenceAction: fallo inesperado");
    return catalogFail("UNKNOWN");
  }
}

import { clerkClient } from "@clerk/nextjs/server";

import { hasRole, roleFromClaims, type Role } from "./roles";

/**
 * Único acceso a la Clerk Backend API. Asegura que el usuario tenga al menos
 * el rol `min` en `publicMetadata.role`; nunca baja un rol mayor. Los errores
 * de Clerk se propagan al llamador.
 */
export async function ensureClerkRole(
  clerkId: string,
  min: Role,
): Promise<"updated" | "unchanged"> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkId);
  const current = roleFromClaims({ metadata: user.publicMetadata });
  if (hasRole(current, min)) return "unchanged";

  // updateUserMetadata hace merge: no pisa otras claves de publicMetadata.
  await client.users.updateUserMetadata(clerkId, { publicMetadata: { role: min } });
  return "updated";
}

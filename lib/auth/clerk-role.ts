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

/**
 * Busca un usuario de Clerk por correo. `getUserList` hace coincidencia
 * parcial, así que se filtra por coincidencia exacta (sin distinguir mayúsculas).
 */
export async function findClerkUserByEmail(
  email: string,
): Promise<{ id: string; role: Role } | null> {
  const client = await clerkClient();
  const wanted = email.toLowerCase();
  const { data } = await client.users.getUserList({ emailAddress: [email], limit: 20 });
  const user = data.find((u) =>
    u.emailAddresses.some((e) => e.emailAddress.toLowerCase() === wanted),
  );
  return user ? { id: user.id, role: roleFromClaims({ metadata: user.publicMetadata }) } : null;
}

/** Lee el rol actual en Clerk. Los errores se propagan. */
export async function getClerkRole(clerkId: string): Promise<Role> {
  const client = await clerkClient();
  const user = await client.users.getUser(clerkId);
  return roleFromClaims({ metadata: user.publicMetadata });
}

/** Fija el rol en `publicMetadata.role` (merge, no pisa otras claves). */
export async function setClerkRole(clerkId: string, role: Role): Promise<void> {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkId, { publicMetadata: { role } });
}

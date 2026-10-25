import { auth } from "@clerk/nextjs/server";

import { hasRole, roleFromClaims, type Role } from "./roles";

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}

/**
 * Guard para Server Actions y route handlers: el proxy no alcanza.
 * Exige el rol `min` o superior; el rol sale del token, nunca del cliente.
 */
export async function requireRole(min: Role) {
  const { userId, sessionClaims } = await auth();
  if (!userId) throw new AuthError("UNAUTHENTICATED");
  const role = roleFromClaims(sessionClaims);
  if (!hasRole(role, min)) throw new AuthError("FORBIDDEN");
  return { userId, role };
}

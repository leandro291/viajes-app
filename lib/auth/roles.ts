import type { userRole } from "@/lib/db/schema/enums";

export type Role = (typeof userRole.enumValues)[number];

// El rol viaja en el token por el claim `metadata` (ver SYSTEM-DESIGN §Autenticación).
declare global {
  interface CustomJwtSessionClaims {
    metadata?: { role?: unknown };
  }
}

// Jerarquía lineal: cada rol puede lo de los anteriores.
const RANK: Record<Role, number> = {
  customer: 0,
  organizer: 1,
  admin: 2,
  super_admin: 3,
};

const isRole = (value: unknown): value is Role =>
  typeof value === "string" && Object.hasOwn(RANK, value);

/** Sin rol (o rol desconocido) = customer. */
export const roleFromClaims = (claims?: CustomJwtSessionClaims | null): Role => {
  const role = claims?.metadata?.role;
  return isRole(role) ? role : "customer";
};

/** `true` si `role` es `min` o superior. */
export const hasRole = (role: Role, min: Role) => RANK[role] >= RANK[min];

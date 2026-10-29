import type { Role } from "@/lib/auth/roles";

export type AdminChange = { kind: "noop" } | { kind: "protected" } | { kind: "change"; to: Role };

// super_admin nunca se toca (D4); alta sube a admin, baja deja en customer.
export function getAdminChange(op: "grant" | "revoke", current: Role): AdminChange {
  if (current === "super_admin") return { kind: "protected" };
  if (op === "grant") {
    return current === "admin" ? { kind: "noop" } : { kind: "change", to: "admin" };
  }
  return current === "admin" ? { kind: "change", to: "customer" } : { kind: "noop" };
}

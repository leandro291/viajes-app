import { desc, eq, inArray, sql } from "drizzle-orm";

import { findClerkUserByEmail, getClerkRole, setClerkRole } from "@/lib/auth/clerk-role";
import type { Role } from "@/lib/auth/roles";
import { db, users } from "@/lib/db";

import { adminFail, type AdminItem, type AdminResult } from "../types/admin-manage";
import { getAdminChange } from "../utils/admin-change";

// Sin guard: el llamador autoriza. Sin "use cache": lectura del panel directo a la BD.
export async function listAdmins(): Promise<AdminItem[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(inArray(users.role, ["admin", "super_admin"]))
    .orderBy(sql`(${users.role} = 'super_admin') desc`, desc(users.createdAt))
    .limit(100);

  return rows.map(({ firstName, lastName, role, ...row }) => ({
    ...row,
    // El where garantiza admin | super_admin.
    role: role as AdminItem["role"],
    name:
      [firstName, lastName]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" ") || null,
  }));
}

// Clerk primero (es la verdad); el espejo en users.role puede fallar sin deshacer nada (D2).
async function applyRole(clerkId: string, to: Role): Promise<AdminResult> {
  try {
    await setClerkRole(clerkId, to);
  } catch {
    console.error("applyRole: falló Clerk");
    return adminFail("CLERK_FAILED");
  }
  try {
    await db.update(users).set({ role: to }).where(eq(users.clerkId, clerkId));
  } catch {
    console.error("applyRole: falló el espejo en la BD");
  }
  return { ok: true };
}

export async function grantAdmin(email: string): Promise<AdminResult> {
  let found: Awaited<ReturnType<typeof findClerkUserByEmail>>;
  try {
    found = await findClerkUserByEmail(email);
  } catch {
    console.error("grantAdmin: falló Clerk");
    return adminFail("CLERK_FAILED");
  }
  if (!found) return adminFail("EMAIL_NOT_FOUND");

  const change = getAdminChange("grant", found.role);
  if (change.kind === "protected") return adminFail("PROTECTED");
  if (change.kind === "noop") return { ok: true };
  return applyRole(found.id, change.to);
}

export async function revokeAdmin(id: string): Promise<AdminResult> {
  const [found] = await db.select({ clerkId: users.clerkId }).from(users).where(eq(users.id, id));
  if (!found) return adminFail("NOT_FOUND");

  let current: Role;
  try {
    current = await getClerkRole(found.clerkId);
  } catch {
    console.error("revokeAdmin: falló Clerk");
    return adminFail("CLERK_FAILED");
  }

  const change = getAdminChange("revoke", current);
  if (change.kind === "protected") return adminFail("PROTECTED");
  if (change.kind === "noop") return { ok: true };
  return applyRole(found.clerkId, change.to);
}

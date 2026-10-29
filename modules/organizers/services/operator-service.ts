import { desc, eq, sql } from "drizzle-orm";

import { ensureClerkRole } from "@/lib/auth/clerk-role";
import { db, organizers, users } from "@/lib/db";

import {
  operatorFail,
  type OperatorItem,
  type OperatorResult,
  type OperatorTarget,
} from "../types/organizer-manage";
import type { OrganizerStatus } from "../types/organizer";
import { getStatusChange } from "../utils/status-change";

// Sin guard: el llamador autoriza. Sin "use cache": lectura del panel directo a la BD.
export async function listOperators(): Promise<OperatorItem[]> {
  const rows = await db
    .select({
      id: organizers.id,
      businessName: organizers.businessName,
      ruc: organizers.ruc,
      whatsapp: organizers.whatsapp,
      status: organizers.status,
      createdAt: organizers.createdAt,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(organizers)
    .innerJoin(users, eq(organizers.userId, users.id))
    .orderBy(sql`(${organizers.status} = 'pending') desc`, desc(organizers.createdAt))
    .limit(500);

  return rows.map(({ firstName, lastName, ...row }) => ({
    ...row,
    userName:
      [firstName, lastName]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(" ") || null,
  }));
}

// Orden Clerk -> BD solo al activar (D3); suspender/rechazar no toca Clerk (D4).
export async function setOperatorStatus(
  id: string,
  target: OperatorTarget,
): Promise<OperatorResult<{ status: OrganizerStatus }>> {
  const [found] = await db
    .select({ status: organizers.status, clerkId: users.clerkId })
    .from(organizers)
    .innerJoin(users, eq(organizers.userId, users.id))
    .where(eq(organizers.id, id));
  if (!found) return operatorFail("NOT_FOUND");

  const change = getStatusChange(found.status, target);
  if (change.kind === "noop") return { ok: true, status: found.status };

  if (change.ensureRole) {
    try {
      await ensureClerkRole(found.clerkId, "organizer");
    } catch {
      console.error("setOperatorStatus: falló Clerk");
      return operatorFail("CLERK_FAILED");
    }
  }

  try {
    await db.update(organizers).set({ status: target }).where(eq(organizers.id, id));
  } catch {
    console.error("setOperatorStatus: falló la BD");
    return operatorFail(change.ensureRole ? "PARTIAL" : "UNKNOWN");
  }
  return { ok: true, status: target };
}

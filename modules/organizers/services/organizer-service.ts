import { eq } from "drizzle-orm";

import { db, organizers, users } from "@/lib/db";

import type { OrganizerProfile } from "../types/organizer";

// Perfil del operador por clerk_id; null si no hay fila en organizers (o users aún no existe).
export async function getOrganizerByClerkId(clerkId: string): Promise<OrganizerProfile | null> {
  const [organizer] = await db
    .select({
      id: organizers.id,
      businessName: organizers.businessName,
      ruc: organizers.ruc,
      whatsapp: organizers.whatsapp,
      status: organizers.status,
    })
    .from(organizers)
    .innerJoin(users, eq(organizers.userId, users.id))
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return organizer ?? null;
}

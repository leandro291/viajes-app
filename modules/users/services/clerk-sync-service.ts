import type { WebhookEvent } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";

import { db, users } from "@/lib/db";

import { mapClerkUser } from "../utils/map-clerk-user";

// Drizzle envuelve el error de Postgres en `cause`.
const pgCode = (error: unknown) =>
  (error as { cause?: { code?: string }; code?: string }).cause?.code ??
  (error as { code?: string }).code;

/**
 * Refleja un evento `user.*` de Clerk en `users`. Idempotente: el upsert va por
 * `clerk_id`, así que reintentos y eventos fuera de orden dan el mismo resultado.
 * Cualquier otro evento se ignora.
 */
export async function handleClerkEvent(event: WebhookEvent): Promise<void> {
  if (event.type === "user.created" || event.type === "user.updated") {
    const row = mapClerkUser(event.data);
    if (!row) {
      console.error(`[clerk-webhook] ${event.type} ${event.data.id}: sin correo principal, se ignora`);
      return;
    }
    const { phone, ...fields } = row;
    // Un teléfono guardado en /cuenta no se pisa con el null de un Clerk sin teléfono.
    await db
      .insert(users)
      .values(row)
      .onConflictDoUpdate({ target: users.clerkId, set: { ...fields, ...(phone && { phone }) } });
    return;
  }

  if (event.type === "user.deleted" && event.data.id) {
    try {
      await db.delete(users).where(eq(users.clerkId, event.data.id));
    } catch (error) {
      // 23001 (RESTRICT) / 23503 (FK): tiene reservas o es operador. Reintentar no lo arregla.
      const code = pgCode(error);
      if (code !== "23001" && code !== "23503") throw error;
      console.error(`[clerk-webhook] user.deleted ${event.data.id}: con reservas u operador, no se borra`);
    }
  }
}

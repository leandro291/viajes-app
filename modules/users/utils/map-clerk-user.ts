import type { WebhookEvent } from "@clerk/nextjs/webhooks";

import { roleFromClaims } from "@/lib/auth/roles";
import type { users } from "@/lib/db/schema";

type ClerkUser = Extract<WebhookEvent, { type: "user.created" | "user.updated" }>["data"];

export type UserSyncRow = Pick<
  typeof users.$inferInsert,
  "clerkId" | "email" | "firstName" | "lastName" | "phone" | "role"
>;

/**
 * Payload de Clerk → fila de `users`. `null` si no hay correo principal
 * (`users.email` es obligatorio). `country` no viene de Clerk y no se toca.
 */
export function mapClerkUser(user: ClerkUser): UserSyncRow | null {
  const email = user.email_addresses.find((e) => e.id === user.primary_email_address_id);
  if (!email) return null;

  const phone = user.phone_numbers.find((p) => p.id === user.primary_phone_number_id);

  return {
    clerkId: user.id,
    email: email.email_address,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: phone?.phone_number ?? null,
    // Sin rol (o rol desconocido) = customer; misma regla que el token.
    role: roleFromClaims({ metadata: user.public_metadata }),
  };
}

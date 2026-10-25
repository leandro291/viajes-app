import { isNotNull } from "drizzle-orm";

import { db, newsletterSubscribers } from "@/lib/db";

// Recibe el correo ya normalizado por subscribeSchema. Devuelve void a propósito:
// quien llama no puede saber si el correo existía (D12).
export async function subscribeEmail(email: string): Promise<void> {
  await db
    .insert(newsletterSubscribers)
    .values({ email })
    .onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: { unsubscribedAt: null },
      setWhere: isNotNull(newsletterSubscribers.unsubscribedAt),
    });
}

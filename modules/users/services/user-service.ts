import { eq } from "drizzle-orm";

import { db, users } from "@/lib/db";

// Espejo local del usuario de Clerk; null si el webhook aún no lo creó.
export async function getUserByClerkId(clerkId: string): Promise<{ id: string; email: string } | null> {
  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user ?? null;
}

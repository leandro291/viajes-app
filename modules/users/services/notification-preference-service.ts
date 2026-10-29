import { eq } from "drizzle-orm";

import { db, notificationPreferences } from "@/lib/db";

import { mergePreferences, type NotificationKey } from "../utils/notification-options";

export async function getNotificationPreferences(userId: string): Promise<Record<NotificationKey, boolean>> {
  const rows = await db
    .select({ key: notificationPreferences.key, enabled: notificationPreferences.enabled })
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));
  return mergePreferences(rows);
}

export async function setNotificationPreference(userId: string, key: NotificationKey, enabled: boolean): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({ userId, key, enabled })
    .onConflictDoUpdate({ target: [notificationPreferences.userId, notificationPreferences.key], set: { enabled } });
}

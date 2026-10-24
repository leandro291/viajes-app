import { boolean, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { notificationKey, organizerStatus, userRole } from "./enums";

export const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  clerkId: text().notNull().unique("users_clerk_id_unique"),
  email: text().notNull().unique("users_email_unique"),
  firstName: text(),
  lastName: text(),
  phone: text(),
  country: text(),
  role: userRole().notNull().default("customer"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const organizers = pgTable("organizers", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .unique("organizers_user_id_unique")
    .references(() => users.id, { onDelete: "restrict" }),
  businessName: text().notNull(),
  ruc: text().notNull(),
  whatsapp: text().notNull(),
  status: organizerStatus().notNull().default("pending"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: notificationKey().notNull(),
    enabled: boolean().notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

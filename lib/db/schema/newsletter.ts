import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique("newsletter_subscribers_email_unique"),
  subscribedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  unsubscribedAt: timestamp({ withTimezone: true }),
});

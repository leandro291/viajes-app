import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { paymentMethod, paymentStatus } from "./enums";
import { bookings } from "./bookings";

export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "restrict" }),
    provider: text().notNull().default("stripe"),
    method: paymentMethod().notNull(),
    status: paymentStatus().notNull().default("pending"),
    amountCents: integer().notNull(),
    // Lo que cobra Stripe (USD), convertido desde bookings.total_cents con bookings.exchange_rate.
    currency: text().notNull().default("USD"),
    stripeCheckoutSessionId: text().unique("payments_stripe_checkout_session_unique"),
    stripePaymentIntentId: text(),
    refundedCents: integer().notNull().default(0),
    paidAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("payments_amount_cents_check", sql`${t.amountCents} >= 0`),
    check(
      "payments_refunded_cents_check",
      sql`${t.refundedCents} between 0 and ${t.amountCents}`,
    ),
    index("payments_booking_idx").on(t.bookingId),
  ],
);

// Idempotencia de webhooks: id = id del evento de Stripe.
export const stripeEvents = pgTable("stripe_events", {
  id: text().primaryKey(),
  type: text().notNull(),
  processedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

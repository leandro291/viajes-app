import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { bookingStatus, docType } from "./enums";
import { departures } from "./departures";
import { offers } from "./offers";
import { packages } from "./packages";
import { users } from "./users";

// ponytail: techo de 9999 reservas; ampliar formato y check cuando se acerque.
export const bookingCodeSeq = pgSequence("booking_code_seq", {
  startWith: 4822,
  minValue: 1,
  maxValue: 9999,
});

export const bookings = pgTable(
  "bookings",
  {
    id: uuid().primaryKey().defaultRandom(),
    code: text()
      .notNull()
      .unique("bookings_code_unique")
      .default(sql`'WY-' || lpad(nextval('booking_code_seq')::text, 4, '0')`),
    customerId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    packageId: uuid()
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    departureId: uuid()
      .notNull()
      .references(() => departures.id, { onDelete: "restrict" }),
    offerId: uuid().references(() => offers.id, { onDelete: "set null" }),
    status: bookingStatus().notNull().default("pending"),
    paxCount: integer().notNull(),
    unitPriceCents: integer().notNull(),
    discountCents: integer().notNull(),
    totalCents: integer().notNull(),
    currency: text().notNull().default("PEN"),
    exchangeRate: numeric({ precision: 8, scale: 4, mode: "number" }).notNull(),
    contactEmail: text().notNull(),
    contactPhone: text().notNull(),
    termsAcceptedAt: timestamp({ withTimezone: true }).notNull(),
    cancelledAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("bookings_code_format_check", sql`${t.code} ~ '^WY-[0-9]{4}$'`),
    check("bookings_pax_count_check", sql`${t.paxCount} > 0`),
    check("bookings_discount_cents_check", sql`${t.discountCents} >= 0`),
    check(
      "bookings_total_cents_check",
      sql`${t.totalCents} = ${t.unitPriceCents} * ${t.paxCount} - ${t.discountCents}`,
    ),
    check("bookings_exchange_rate_check", sql`${t.exchangeRate} > 0`),
    index("bookings_customer_idx").on(t.customerId),
    index("bookings_departure_idx").on(t.departureId),
    index("bookings_package_status_idx").on(t.packageId, t.status),
    index("bookings_created_at_idx").on(t.createdAt),
  ],
);

export const bookingTravelers = pgTable(
  "booking_travelers",
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    firstName: text().notNull(),
    lastName: text().notNull(),
    docType: docType().notNull(),
    docNumber: text().notNull(),
    isPrimary: boolean().notNull().default(false),
  },
  (t) => [
    index("booking_travelers_booking_idx").on(t.bookingId),
    uniqueIndex("booking_travelers_primary_unique")
      .on(t.bookingId)
      .where(sql`${t.isPrimary}`),
  ],
);

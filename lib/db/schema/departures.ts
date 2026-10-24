import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { departureStatus } from "./enums";
import { packages } from "./packages";
import { organizers } from "./users";

export const guides = pgTable(
  "guides",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizerId: uuid()
      .notNull()
      .references(() => organizers.id, { onDelete: "restrict" }),
    name: text().notNull(),
    phone: text().notNull(),
  },
  (t) => [index("guides_organizer_idx").on(t.organizerId)],
);

export const departures = pgTable(
  "departures",
  {
    id: uuid().primaryKey().defaultRandom(),
    packageId: uuid()
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    guideId: uuid().references(() => guides.id, { onDelete: "set null" }),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    capacity: integer().notNull(),
    bookedSeats: integer().notNull().default(0),
    status: departureStatus().notNull().default("scheduled"),
  },
  (t) => [
    unique("departures_package_starts_at_unique").on(t.packageId, t.startsAt),
    check(
      "departures_booked_seats_check",
      sql`${t.bookedSeats} >= 0 and ${t.bookedSeats} <= ${t.capacity}`,
    ),
    check("departures_capacity_check", sql`${t.capacity} > 0`),
    index("departures_starts_at_idx").on(t.startsAt),
    index("departures_guide_idx").on(t.guideId),
  ],
);

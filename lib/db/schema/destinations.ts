import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  uuid,
} from "drizzle-orm/pg-core";

import { season } from "./enums";

export const destinations = pgTable("destinations", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  region: text().notNull(),
  tagline: text(),
  description: text(),
  altitudeM: integer(),
  bestSeasonText: text(),
  fromLimaText: text(),
  heroImageUrl: text(),
});

export const destinationClimateMonths = pgTable(
  "destination_climate_months",
  {
    destinationId: uuid()
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    month: smallint().notNull(),
    season: season().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.destinationId, t.month] }),
    check("destination_climate_months_month_check", sql`${t.month} between 1 and 12`),
  ],
);

export const destinationSights = pgTable(
  "destination_sights",
  {
    id: uuid().primaryKey().defaultRandom(),
    destinationId: uuid()
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    name: text().notNull(),
    description: text().notNull(),
    imageUrl: text().notNull(),
    sortOrder: integer().notNull(),
  },
  (t) => [index("destination_sights_destination_sort_idx").on(t.destinationId, t.sortOrder)],
);

export const destinationFaqs = pgTable(
  "destination_faqs",
  {
    id: uuid().primaryKey().defaultRandom(),
    destinationId: uuid()
      .notNull()
      .references(() => destinations.id, { onDelete: "cascade" }),
    question: text().notNull(),
    answer: text().notNull(),
    sortOrder: integer().notNull(),
  },
  (t) => [index("destination_faqs_destination_sort_idx").on(t.destinationId, t.sortOrder)],
);

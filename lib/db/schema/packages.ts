import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { destinations } from "./destinations";
import { inclusionKind, packageKind, publishStatus } from "./enums";
import { organizers } from "./users";

export const categories = pgTable("categories", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
});

export const packages = pgTable(
  "packages",
  {
    id: uuid().primaryKey().defaultRandom(),
    organizerId: uuid()
      .notNull()
      .references(() => organizers.id, { onDelete: "restrict" }),
    destinationId: uuid()
      .notNull()
      .references(() => destinations.id, { onDelete: "restrict" }),
    kind: packageKind().notNull(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    blurb: text().notNull(),
    description: text(),
    durationDays: integer().notNull(),
    nights: integer().notNull(),
    durationHours: integer(),
    startTime: time(),
    priceCents: integer().notNull(),
    currency: text().notNull().default("PEN"),
    maxGroupSize: integer().notNull(),
    languages: text().array().notNull(),
    meetingPoint: text(),
    meetingLat: doublePrecision(),
    meetingLng: doublePrecision(),
    coverImageUrl: text(),
    status: publishStatus().notNull().default("draft"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("packages_status_kind_idx").on(t.status, t.kind),
    index("packages_destination_idx").on(t.destinationId),
    index("packages_organizer_idx").on(t.organizerId),
    check("packages_price_cents_check", sql`${t.priceCents} >= 0`),
    check("packages_duration_days_check", sql`${t.durationDays} >= 1`),
    check("packages_nights_check", sql`${t.nights} >= 0`),
    check("packages_max_group_size_check", sql`${t.maxGroupSize} > 0`),
  ],
);

export const packageCategories = pgTable(
  "package_categories",
  {
    packageId: uuid()
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.packageId, t.categoryId] })],
);

export const packageImages = pgTable(
  "package_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    packageId: uuid()
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    url: text().notNull(),
    alt: text(),
    credit: text(),
    sortOrder: integer().notNull(),
  },
  (t) => [index("package_images_package_sort_idx").on(t.packageId, t.sortOrder)],
);

export const packageItineraryDays = pgTable(
  "package_itinerary_days",
  {
    id: uuid().primaryKey().defaultRandom(),
    packageId: uuid()
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    dayNumber: integer().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    place: text().notNull(),
    transportLeg: text(),
    imageUrl: text(),
    lat: doublePrecision(),
    lng: doublePrecision(),
  },
  (t) => [unique("package_itinerary_days_package_day_unique").on(t.packageId, t.dayNumber)],
);

export const packageInclusions = pgTable(
  "package_inclusions",
  {
    id: uuid().primaryKey().defaultRandom(),
    packageId: uuid()
      .notNull()
      .references(() => packages.id, { onDelete: "cascade" }),
    kind: inclusionKind().notNull(),
    text: text().notNull(),
    sortOrder: integer().notNull(),
  },
  (t) => [index("package_inclusions_package_kind_sort_idx").on(t.packageId, t.kind, t.sortOrder)],
);

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { discountType, offerKind } from "./enums";
import { packages } from "./packages";

export const offers = pgTable(
  "offers",
  {
    id: uuid().primaryKey().defaultRandom(),
    packageId: uuid()
      .notNull()
      .references(() => packages.id, { onDelete: "restrict" }),
    kind: offerKind().notNull(),
    discountType: discountType().notNull(),
    discountValue: integer(),
    minPeople: integer(),
    validUntil: timestamp({ withTimezone: true }),
    isActive: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "offers_discount_check",
      sql`(${t.discountType} = 'two_for_one' and ${t.discountValue} is null) or (${t.discountType} = 'percent' and ${t.discountValue} between 1 and 100)`,
    ),
    index("offers_package_active_idx").on(t.packageId, t.isActive),
  ],
);

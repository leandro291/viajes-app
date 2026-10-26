import { count, getTableName, sql } from "drizzle-orm";

import {
  bookings,
  bookingTravelers,
  categories,
  departures,
  destinationClimateMonths,
  destinationFaqs,
  destinations,
  destinationSights,
  guides,
  newsletterSubscribers,
  notificationPreferences,
  offers,
  organizers,
  packageCategories,
  packageImages,
  packageInclusions,
  packageItineraryDays,
  packages,
  payments,
  stripeEvents,
  users,
} from "../schema";
import {
  seedBookings,
  seedBookingTravelers,
  seedPayments,
} from "./data/bookings";
import {
  seedDestinationClimateMonths,
  seedDestinationFaqs,
  seedDestinations,
  seedDestinationSights,
} from "./data/destinations";
import {
  seedGuides,
  seedNewsletterSubscribers,
  seedNotificationPreferences,
  seedOrganizers,
  seedUsers,
} from "./data/identity";
import {
  seedPackageImages,
  seedPackageInclusions,
  seedPackageItineraryDays,
} from "./data/package-details";
import {
  seedCategories,
  seedPackageCategories,
  seedPackages,
} from "./data/packages";
import { seedDepartures, seedOffers } from "./data/schedule";

const COUNTED_TABLES = [
  users,
  organizers,
  notificationPreferences,
  destinations,
  destinationClimateMonths,
  destinationSights,
  destinationFaqs,
  categories,
  packages,
  packageCategories,
  packageImages,
  packageItineraryDays,
  packageInclusions,
  guides,
  departures,
  offers,
  bookings,
  bookingTravelers,
  payments,
  stripeEvents,
  newsletterSubscribers,
];

function abort(message: string): never {
  console.error(`Seed abortado: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  // Guard D8: antes de importar lib/db, para no tocar la base.
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    abort("no se siembran datos ficticios con NODE_ENV o VERCEL_ENV en production.");
  }
  if (!process.env.DATABASE_URL) {
    abort("falta DATABASE_URL. Definila en .env.local (ver .env.example).");
  }

  // Import dinámico: lib/db lanza al importarse si falta DATABASE_URL.
  const { db } = await import("../index");

  try {
    await db.transaction(async (tx) => {
      await tx.insert(users).values(seedUsers).onConflictDoNothing();
      await tx.insert(organizers).values(seedOrganizers).onConflictDoNothing();
      await tx
        .insert(notificationPreferences)
        .values(seedNotificationPreferences)
        .onConflictDoNothing();
      // D7: destinos y lugares se actualizan en cada seed (ids determinísticos); el resto, DoNothing.
      await tx
        .insert(destinations)
        .values(seedDestinations)
        .onConflictDoUpdate({
          target: destinations.id,
          set: {
            tagline: sql`excluded.tagline`,
            description: sql`excluded.description`,
            altitudeM: sql`excluded.altitude_m`,
            bestSeasonText: sql`excluded.best_season_text`,
            fromLimaText: sql`excluded.from_lima_text`,
            howToGetText: sql`excluded.how_to_get_text`,
            tipsText: sql`excluded.tips_text`,
          },
        });
      await tx
        .insert(destinationClimateMonths)
        .values(seedDestinationClimateMonths)
        .onConflictDoNothing();
      await tx
        .insert(destinationSights)
        .values(seedDestinationSights)
        .onConflictDoUpdate({
          target: destinationSights.id,
          set: {
            name: sql`excluded.name`,
            description: sql`excluded.description`,
            imageUrl: sql`excluded.image_url`,
            sortOrder: sql`excluded.sort_order`,
            lat: sql`excluded.lat`,
            lng: sql`excluded.lng`,
          },
        });
      await tx.insert(destinationFaqs).values(seedDestinationFaqs).onConflictDoNothing();
      await tx.insert(categories).values(seedCategories).onConflictDoNothing();
      await tx.insert(packages).values(seedPackages).onConflictDoNothing();
      await tx.insert(packageCategories).values(seedPackageCategories).onConflictDoNothing();
      await tx.insert(packageImages).values(seedPackageImages).onConflictDoNothing();
      await tx
        .insert(packageItineraryDays)
        .values(seedPackageItineraryDays)
        .onConflictDoNothing();
      await tx.insert(packageInclusions).values(seedPackageInclusions).onConflictDoNothing();
      await tx.insert(guides).values(seedGuides).onConflictDoNothing();
      await tx.insert(departures).values(seedDepartures).onConflictDoNothing();
      await tx.insert(offers).values(seedOffers).onConflictDoNothing();
      await tx.insert(bookings).values(seedBookings).onConflictDoNothing();
      await tx.insert(bookingTravelers).values(seedBookingTravelers).onConflictDoNothing();
      await tx.insert(payments).values(seedPayments).onConflictDoNothing();
      await tx
        .insert(newsletterSubscribers)
        .values(seedNewsletterSubscribers)
        .onConflictDoNothing();
    });

    for (const table of COUNTED_TABLES) {
      const [row] = await db.select({ n: count() }).from(table);
      console.log(`${getTableName(table)}: ${row.n}`);
    }
  } finally {
    await db.$client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "error desconocido";
  console.error(`Seed fallido: ${message}`);
  process.exit(1);
});

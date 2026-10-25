import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { seedBookings, seedBookingTravelers, seedPayments } from "./data/bookings";
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
import { seedCategories, seedPackageCategories, seedPackages } from "./data/packages";
import { seedDepartures, seedOffers } from "./data/schedule";
import { limaDate, SEED_ANCHOR } from "./helpers";
import { SEED_IMAGES } from "./images";

const tables = {
  users: seedUsers,
  organizers: seedOrganizers,
  notification_preferences: seedNotificationPreferences,
  destinations: seedDestinations,
  destination_climate_months: seedDestinationClimateMonths,
  destination_sights: seedDestinationSights,
  destination_faqs: seedDestinationFaqs,
  categories: seedCategories,
  packages: seedPackages,
  package_categories: seedPackageCategories,
  package_images: seedPackageImages,
  package_itinerary_days: seedPackageItineraryDays,
  package_inclusions: seedPackageInclusions,
  guides: seedGuides,
  departures: seedDepartures,
  offers: seedOffers,
  bookings: seedBookings,
  booking_travelers: seedBookingTravelers,
  payments: seedPayments,
  stripe_events: [],
  newsletter_subscribers: seedNewsletterSubscribers,
} as const;

// Anexo §9
const expectedCounts: Record<keyof typeof tables, number> = {
  users: 11,
  organizers: 1,
  notification_preferences: 9,
  destinations: 8,
  destination_climate_months: 12,
  destination_sights: 5,
  destination_faqs: 3,
  categories: 5,
  packages: 20,
  package_categories: 29,
  package_images: 13,
  package_itinerary_days: 18,
  package_inclusions: 43,
  guides: 4,
  departures: 52,
  offers: 8,
  bookings: 8,
  booking_travelers: 9,
  payments: 8,
  stripe_events: 0,
  newsletter_subscribers: 4,
};

const ids = (rows: readonly { id?: string }[]): Set<string> =>
  new Set(rows.map((r) => r.id as string));

const packageIds = ids(seedPackages);
const departureById = new Map(seedDepartures.map((d) => [d.id as string, d]));

describe("seed data: conteos e ids (AC11)", () => {
  it.each(Object.keys(expectedCounts) as (keyof typeof tables)[])(
    "AC11: %s tiene el conteo del anexo §9",
    (name) => {
      expect(tables[name]).toHaveLength(expectedCounts[name]);
    },
  );

  it("AC11: los ids no se repiten dentro de cada tabla", () => {
    for (const [name, rows] of Object.entries(tables)) {
      const withId = (rows as readonly { id?: string }[]).filter((r) => r.id !== undefined);
      expect(new Set(withId.map((r) => r.id)).size, name).toBe(withId.length);
    }
  });

  it("AC11: tablas con pk compuesta no tienen duplicados", () => {
    const keys = (rows: string[]) => expect(new Set(rows).size).toBe(rows.length);
    keys(seedNotificationPreferences.map((r) => `${r.userId}:${r.key}`));
    keys(seedDestinationClimateMonths.map((r) => `${r.destinationId}:${r.month}`));
    keys(seedPackageCategories.map((r) => `${r.packageId}:${r.categoryId}`));
  });
});

describe("seed data: referencias (AC11)", () => {
  const userIds = ids(seedUsers);
  const organizerIds = ids(seedOrganizers);
  const destinationIds = ids(seedDestinations);
  const categoryIds = ids(seedCategories);
  const guideIds = ids(seedGuides);
  const offerIds = ids(seedOffers);
  const bookingIds = ids(seedBookings);

  it("AC11: toda referencia resuelve a una fila del seed", () => {
    const resolves = (values: (string | null | undefined)[], target: Set<string>, label: string) => {
      for (const v of values) expect(target.has(v as string), `${label}: ${v}`).toBe(true);
    };
    resolves(seedOrganizers.map((r) => r.userId), userIds, "organizers.user_id");
    resolves(seedNotificationPreferences.map((r) => r.userId), userIds, "prefs.user_id");
    resolves(seedGuides.map((r) => r.organizerId), organizerIds, "guides.organizer_id");
    resolves(seedPackages.map((r) => r.organizerId), organizerIds, "packages.organizer_id");
    resolves(seedPackages.map((r) => r.destinationId), destinationIds, "packages.destination_id");
    resolves(seedDestinationClimateMonths.map((r) => r.destinationId), destinationIds, "climate");
    resolves(seedDestinationSights.map((r) => r.destinationId), destinationIds, "sights");
    resolves(seedDestinationFaqs.map((r) => r.destinationId), destinationIds, "faqs");
    resolves(seedPackageCategories.map((r) => r.packageId), packageIds, "pkg_cat.package_id");
    resolves(seedPackageCategories.map((r) => r.categoryId), categoryIds, "pkg_cat.category_id");
    resolves(seedPackageImages.map((r) => r.packageId), packageIds, "images");
    resolves(seedPackageItineraryDays.map((r) => r.packageId), packageIds, "itinerary");
    resolves(seedPackageInclusions.map((r) => r.packageId), packageIds, "inclusions");
    resolves(seedDepartures.map((r) => r.packageId), packageIds, "departures.package_id");
    resolves(
      seedDepartures.filter((r) => r.guideId).map((r) => r.guideId),
      guideIds,
      "departures.guide_id",
    );
    resolves(seedOffers.map((r) => r.packageId), packageIds, "offers.package_id");
    resolves(seedBookings.map((r) => r.customerId), userIds, "bookings.customer_id");
    resolves(seedBookings.map((r) => r.packageId), packageIds, "bookings.package_id");
    resolves(seedBookings.map((r) => r.departureId), ids(seedDepartures), "bookings.departure_id");
    resolves(
      seedBookings.filter((r) => r.offerId).map((r) => r.offerId),
      offerIds,
      "bookings.offer_id",
    );
    resolves(seedBookingTravelers.map((r) => r.bookingId), bookingIds, "travelers");
    resolves(seedPayments.map((r) => r.bookingId), bookingIds, "payments");
  });

  it("AC11: la salida de cada reserva pertenece al paquete de la reserva", () => {
    for (const b of seedBookings) {
      expect(departureById.get(b.departureId)?.packageId).toBe(b.packageId);
    }
  });
});

describe("seed data: reservas (AC11)", () => {
  it("AC11: los 8 totales de reserva son los del anexo", () => {
    const byCode = Object.fromEntries(seedBookings.map((b) => [b.code, b.totalCents]));
    expect(byCode).toEqual({
      "WY-4821": 258000,
      "WY-4820": 48000,
      "WY-4819": 247600,
      "WY-4818": 28500,
      "WY-4817": 142400,
      "WY-4816": 208000,
      "WY-4815": 148000,
      "WY-4814": 98000,
    });
  });

  it("AC11: total = unit * pax - discount en cada reserva", () => {
    for (const b of seedBookings) {
      expect(b.totalCents, b.code).toBe(b.unitPriceCents * b.paxCount - b.discountCents!);
    }
  });

  it("AC11: un solo viajero principal por reserva", () => {
    for (const b of seedBookings) {
      const primaries = seedBookingTravelers.filter((t) => t.bookingId === b.id && t.isPrimary);
      expect(primaries, b.code).toHaveLength(1);
    }
  });

  it("AC11: refunded_cents <= amount_cents", () => {
    for (const p of seedPayments) {
      expect(p.refundedCents!).toBeGreaterThanOrEqual(0);
      expect(p.refundedCents!).toBeLessThanOrEqual(p.amountCents);
    }
  });
});

describe("seed data: salidas y catálogo (AC11)", () => {
  it("AC11: sum(pax confirmed) <= booked_seats <= capacity en cada salida", () => {
    for (const d of seedDepartures) {
      const confirmed = seedBookings
        .filter((b) => b.departureId === d.id && b.status === "confirmed")
        .reduce((sum, b) => sum + b.paxCount, 0);
      expect(confirmed).toBeLessThanOrEqual(d.bookedSeats!);
      expect(d.bookedSeats!).toBeLessThanOrEqual(d.capacity);
    }
  });

  it("AC11: hay 4 salidas el 2026-10-24 (Lima)", () => {
    const start = limaDate(SEED_ANCHOR).getTime();
    const today = seedDepartures.filter((d) => {
      const t = (d.startsAt as Date).getTime();
      return t >= start && t < start + 24 * 3600_000;
    });
    expect(today).toHaveLength(4);
  });

  it("AC11: los 20 paquetes están published", () => {
    expect(seedPackages.every((p) => p.status === "published")).toBe(true);
  });

  it("AC11: los 4 roles de user_role tienen al menos un usuario", () => {
    const roles = new Set(seedUsers.map((u) => u.role));
    expect([...roles].sort()).toEqual(["admin", "customer", "organizer", "super_admin"]);
  });
});

describe("seed data: imágenes (AC15)", () => {
  const allowed = new Set(Object.values(SEED_IMAGES).map((i) => i.path));
  const used = [
    ...seedDestinations.map((r) => r.heroImageUrl),
    ...seedDestinationSights.map((r) => r.imageUrl),
    ...seedPackages.map((r) => r.coverImageUrl),
    ...seedPackageImages.map((r) => r.url),
    ...seedPackageItineraryDays.map((r) => r.imageUrl),
  ].filter((u): u is string => typeof u === "string");

  it("AC15: hay imágenes referenciadas", () => {
    expect(used.length).toBeGreaterThan(0);
  });

  it("AC15: todo *_url del seed sale de SEED_IMAGES con forma /seed/<key>.jpg", () => {
    for (const url of used) {
      expect(allowed.has(url), url).toBe(true);
      expect(url).toMatch(/^\/seed\/[a-z0-9]+\.jpg$/);
    }
  });

  it("AC15: cada ruta de SEED_IMAGES existe en public/seed/", () => {
    for (const p of allowed) {
      expect(fs.existsSync(path.join(process.cwd(), "public", p)), p).toBe(true);
    }
  });

  it("AC15: package_images.credit sale de SEED_IMAGES", () => {
    const credits = new Set(Object.values(SEED_IMAGES).map((i) => i.credit));
    for (const r of seedPackageImages) expect(credits.has(r.credit as string)).toBe(true);
  });
});

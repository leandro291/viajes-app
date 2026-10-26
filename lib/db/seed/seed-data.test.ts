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
  destination_climate_months: 96,
  destination_sights: 15,
  destination_faqs: 24,
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

describe("seed data: destinos completos (AC5, AC6)", () => {
  const D = "dry", M = "mixed", R = "rainy";
  const ALT = [R, R, R, M, D, D, D, D, D, M, R, R];
  const COAST = [D, D, D, D, M, M, M, M, M, M, M, D];
  // slug: [altitudeM, fromLimaText, bestSeasonText, clima, lugares]
  const expected = {
    cusco: [3399, "~1 h 30 en avión", "Mayo a septiembre", ALT, 5],
    arequipa: [2335, "~1 h 45 en avión", "Abril a diciembre", [R, R, M, D, D, D, D, D, D, D, D, M], 2],
    puno: [3827, "~1 h 50 en avión a Juliaca", "Mayo a septiembre", ALT, 1],
    amazonia: [183, "~1 h 40 en avión a Puerto Maldonado", "Mayo a octubre", [R, R, R, M, D, D, D, D, D, D, M, R], 1],
    "ica-paracas": [406, "~4 h en bus", "Todo el año", [D, D, D, D, M, M, M, M, D, D, D, D], 3],
    huaraz: [3052, "~8 h en bus", "Mayo a septiembre", ALT, 1],
    lima: [154, null, "Diciembre a abril", COAST, 1],
    mancora: [4, "~1 h 50 en avión a Talara + 1 h por tierra", "Diciembre a abril", COAST, 1],
  } as const;
  const bySlug = (slug: string) => seedDestinations.find((d) => d.slug === slug)!;
  const sightsOf = (slug: string) =>
    seedDestinationSights
      .filter((s) => s.destinationId === bySlug(slug).id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  it.each(Object.entries(expected))("AC6: %s coincide con la tabla de datos", (slug, e) => {
    const d = bySlug(slug);
    expect(d.altitudeM).toBe(e[0]);
    expect(d.fromLimaText).toBe(e[1]);
    expect(d.bestSeasonText).toBe(e[2]);
    const months = seedDestinationClimateMonths
      .filter((c) => c.destinationId === d.id)
      .sort((a, b) => a.month - b.month);
    expect(months.map((c) => c.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(months.map((c) => c.season)).toEqual(e[3]);
    expect(sightsOf(slug)).toHaveLength(e[4]);
  });

  it("AC6: lugares con coordenadas en Perú, sort_order contiguo y fotos únicas del seed", () => {
    const allowed = new Set(Object.values(SEED_IMAGES).map((i) => i.path));
    for (const slug of Object.keys(expected)) {
      sightsOf(slug).forEach((s, i) => {
        expect(s.sortOrder, slug).toBe(i + 1);
        expect(s.lat!, s.name).toBeGreaterThanOrEqual(-19);
        expect(s.lat!, s.name).toBeLessThanOrEqual(0);
        expect(s.lng!, s.name).toBeGreaterThanOrEqual(-82);
        expect(s.lng!, s.name).toBeLessThanOrEqual(-68);
      });
    }
    const urls = seedDestinationSights.map((s) => s.imageUrl);
    expect(new Set(urls).size).toBe(15);
    for (const u of urls) expect(allowed.has(u), u).toBe(true);
  });

  it("AC6: los 8 destinos tienen textos completos y 3 preguntas; Lima sin fromLimaText", () => {
    for (const d of seedDestinations) {
      for (const k of ["tagline", "description", "bestSeasonText", "howToGetText", "tipsText"] as const) {
        expect(d[k], `${d.slug}.${k}`).toBeTruthy();
      }
      expect(d.altitudeM, d.slug).not.toBeNull();
      expect(d.fromLimaText === null, d.slug).toBe(d.slug === "lima");
      expect(seedDestinationFaqs.filter((f) => f.destinationId === d.id), d.slug).toHaveLength(3);
    }
    expect(bySlug("lima").howToGetText).not.toMatch(/desde lima/i);
  });

  it("AC6: textos sin vacíos, sin 'garantiz', sin precios y sin promesas de entrada", () => {
    const texts = [
      ...seedDestinations.flatMap((d) => [d.tagline, d.description, d.howToGetText, d.tipsText]),
      ...seedDestinationSights.map((s) => s.description),
      ...seedDestinationFaqs.flatMap((f) => [f.question, f.answer]),
    ];
    for (const t of texts) {
      expect(t?.trim(), String(t)).toBeTruthy();
      expect(t, String(t)).not.toMatch(/garantiz/i);
      expect(t, String(t)).not.toMatch(/S\/[\s\u00a0\u202f]*\d/);
      expect(t, String(t)).not.toMatch(/\n/);
    }
    for (const f of seedDestinationFaqs) {
      if (/entrada/i.test(`${f.question} ${f.answer}`)) {
        expect(f.answer, f.question).toMatch(/en los paquetes que (lo|la) indican/i);
      }
    }
  });
});

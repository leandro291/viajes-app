import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("booking-service (db)", () => {
  const DRAFT_ID = "00000000-0000-4000-8000-0000001400ff";
  const ids = {
    ok: "00000000-0000-4000-8000-000000141001",
    full: "00000000-0000-4000-8000-000000141002",
    past: "00000000-0000-4000-8000-000000141003",
    cancelled: "00000000-0000-4000-8000-000000141004",
    draft: "00000000-0000-4000-8000-000000141005",
    missing: "00000000-0000-4000-8000-000000141099",
  };
  const fixtureIds = [ids.ok, ids.full, ids.past, ids.cancelled, ids.draft];
  const DAY = 24 * 3600 * 1000;
  // Salidas relativas a now(): las del seed caducan.
  const at = (days: number) => new Date(Date.now() + days * DAY);

  type Service = typeof import("./booking-service");
  type Errors = typeof import("../types/booking");
  let svc: Service;
  let BookingError: Errors["BookingError"];
  let dbModule: typeof import("@/lib/db");
  let seedId: typeof import("@/lib/db/seed/helpers").seedId;
  let customerId: string;
  let packageId: string;
  let unitPriceCents: number;

  const input = (departureId: string, paxCount = 2): import("../types/booking").NewBookingInput => ({
    customerId,
    departureId,
    paxCount,
    amount: {
      offerId: null,
      unitPriceCents,
      discountCents: 1000,
      totalCents: unitPriceCents * paxCount - 1000,
      exchangeRate: 3.75,
      amountUsdCents: 34400,
    },
    contact: { email: "test@example.com", phone: "+51987654321" },
    traveler: { firstName: "Ana", lastName: "Pérez", docType: "dni", docNumber: "12345678" },
  });

  const bookingsOf = (departureId: string) => {
    const { db, bookings } = dbModule;
    return db.select().from(bookings).where(eq(bookings.departureId, departureId));
  };

  async function cleanup() {
    const { db, bookings, departures, packages } = dbModule;
    // FKs: travelers (cascade) -> bookings -> departures -> packages.
    await db.delete(bookings).where(inArray(bookings.departureId, fixtureIds));
    await db.delete(departures).where(inArray(departures.id, fixtureIds));
    await db.delete(packages).where(eq(packages.id, DRAFT_ID));
  }

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./booking-service");
    ({ BookingError } = await import("../types/booking"));
    seedId = (await import("@/lib/db/seed/helpers")).seedId;

    const { db, packages, departures, users } = dbModule;
    await cleanup();

    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, "seed_customer_01"));
    customerId = user.id;
    packageId = seedId("package:machu-picchu-magico");
    const [pkg] = await db
      .select({ priceCents: packages.priceCents })
      .from(packages)
      .where(eq(packages.id, packageId));
    unitPriceCents = pkg.priceCents;

    await db.insert(packages).values({
      id: DRAFT_ID,
      organizerId: seedId("organizer:wayra"),
      destinationId: seedId("destination:cusco"),
      kind: "package",
      slug: "test-draft-booking-service",
      title: "Borrador de prueba",
      blurb: "No debe verse",
      durationDays: 3,
      nights: 2,
      priceCents: 100,
      maxGroupSize: 10,
      languages: ["es"],
      status: "draft",
    });
    const base = { packageId, capacity: 10 };
    await db.insert(departures).values([
      { ...base, id: ids.ok, startsAt: at(300), bookedSeats: 4 }, // seatsLeft 6
      { ...base, id: ids.full, startsAt: at(301), bookedSeats: 10 },
      { ...base, id: ids.past, startsAt: at(-300) },
      { ...base, id: ids.cancelled, startsAt: at(302), status: "cancelled" },
      { packageId: DRAFT_ID, capacity: 10, id: ids.draft, startsAt: at(304) },
    ]);
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC10: crea un booking pending con snapshot y un viajero principal, sin tocar booked_seats", async () => {
    const created = await svc.createPendingBooking(input(ids.ok));
    expect(created.code).toMatch(/^WY-\d{4}$/);

    const { db, bookingTravelers, departures } = dbModule;
    const rows = await bookingsOf(ids.ok);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: created.id,
      code: created.code,
      status: "pending",
      customerId,
      packageId,
      paxCount: 2,
      unitPriceCents,
      discountCents: 1000,
      totalCents: unitPriceCents * 2 - 1000,
      currency: "PEN",
      exchangeRate: 3.75,
      offerId: null,
      contactEmail: "test@example.com",
      contactPhone: "+51987654321",
    });
    expect(Math.abs(rows[0].termsAcceptedAt.getTime() - Date.now())).toBeLessThan(60_000);

    const travelers = await db
      .select()
      .from(bookingTravelers)
      .where(eq(bookingTravelers.bookingId, created.id));
    expect(travelers).toHaveLength(1);
    expect(travelers[0]).toMatchObject({
      firstName: "Ana",
      lastName: "Pérez",
      docType: "dni",
      docNumber: "12345678",
      isPrimary: true,
    });

    const [dep] = await db
      .select({ bookedSeats: departures.bookedSeats })
      .from(departures)
      .where(eq(departures.id, ids.ok));
    expect(dep.bookedSeats).toBe(4);
  });

  it("AC10: si falla el viajero no queda el booking (rollback)", async () => {
    const before = (await bookingsOf(ids.ok)).length;
    const bad = input(ids.ok, 1);
    bad.traveler.docType = "invalid" as never;
    await expect(svc.createPendingBooking(bad)).rejects.toThrow();
    expect(await bookingsOf(ids.ok)).toHaveLength(before);
  });

  it("AC11: sin cupo lanza insufficient_seats con seatsLeft y no inserta; pax = seatsLeft se acepta", async () => {
    const before = (await bookingsOf(ids.ok)).length;
    const err = await svc.createPendingBooking(input(ids.ok, 7)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BookingError);
    expect(err).toMatchObject({ code: "insufficient_seats", seatsLeft: 6 });
    expect(await bookingsOf(ids.ok)).toHaveLength(before);

    const fullErr = await svc.createPendingBooking(input(ids.full, 1)).catch((e: unknown) => e);
    expect(fullErr).toMatchObject({ code: "insufficient_seats", seatsLeft: 0 });
    expect(await bookingsOf(ids.full)).toHaveLength(0);

    await expect(svc.createPendingBooking(input(ids.ok, 6))).resolves.toHaveProperty("id");
  });

  it("AC11: salida pasada, cancelada, de paquete draft o inexistente -> departure_unavailable", async () => {
    for (const id of [ids.past, ids.cancelled, ids.draft, ids.missing]) {
      const err = await svc.createPendingBooking(input(id, 1)).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BookingError);
      expect(err).toMatchObject({ code: "departure_unavailable" });
      expect(await bookingsOf(id)).toHaveLength(0);
    }
  });

  it("AC11: dos llamadas por la misma plaza crean dos pending que coexisten", async () => {
    const before = (await bookingsOf(ids.ok)).filter((b) => b.status === "pending").length;
    const a = await svc.createPendingBooking(input(ids.ok, 1));
    const b = await svc.createPendingBooking(input(ids.ok, 1));
    expect(a.id).not.toBe(b.id);
    const after = (await bookingsOf(ids.ok)).filter((x) => x.status === "pending").length;
    expect(after).toBe(before + 2);
  });

  it("AC12: cancelPendingBooking pasa pending a cancelled; confirmed o ya cancelled -> false sin cambios", async () => {
    const { db, bookings } = dbModule;
    const statusOf = async (id: string) =>
      (await db.select().from(bookings).where(eq(bookings.id, id)))[0];

    const { id } = await svc.createPendingBooking(input(ids.ok, 1));
    expect(await svc.cancelPendingBooking(id)).toBe(true);
    const cancelled = await statusOf(id);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
    expect(await svc.cancelPendingBooking(id)).toBe(false);

    const { id: confirmedId } = await svc.createPendingBooking(input(ids.ok, 1));
    await db.update(bookings).set({ status: "confirmed" }).where(eq(bookings.id, confirmedId));
    expect(await svc.cancelPendingBooking(confirmedId)).toBe(false);
    const confirmed = await statusOf(confirmedId);
    expect(confirmed.status).toBe("confirmed");
    expect(confirmed.cancelledAt).toBeNull();
  });
});

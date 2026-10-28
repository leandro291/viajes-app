import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("voucher-service (db)", () => {
  const id = (n: number) => `00000000-0000-4000-8000-00000016${String(n).padStart(4, "0")}`;
  const PKG_FULL = id(1); // con punto de encuentro, coordenadas y portada
  const PKG_BARE = id(2); // sin nada de eso
  const DEP_FULL = id(11);
  const DEP_BARE = id(12);
  const OTHER_USER = id(21);
  const B_CONFIRMED = id(31);
  const B_PENDING = id(32);
  const B_CANCELLED = id(33);
  const CODES = { confirmed: "WY-0971", pending: "WY-0972", cancelled: "WY-0973" };
  const bookingIds = [B_CONFIRMED, B_PENDING, B_CANCELLED];
  const DAY = 24 * 3600 * 1000;
  const at = (days: number) => new Date(Date.now() + days * DAY);

  type Service = typeof import("./voucher-service");
  let svc: Service;
  let dbModule: typeof import("@/lib/db");
  let ownerId: string;

  async function cleanup() {
    const { db, bookings, departures, packages, payments, users } = dbModule;
    // FKs: payments -> bookings (travelers en cascade) -> departures -> packages -> users.
    await db.delete(payments).where(inArray(payments.bookingId, bookingIds));
    await db.delete(bookings).where(inArray(bookings.id, bookingIds));
    await db.delete(departures).where(inArray(departures.id, [DEP_FULL, DEP_BARE]));
    await db.delete(packages).where(inArray(packages.id, [PKG_FULL, PKG_BARE]));
    await db.delete(users).where(eq(users.id, OTHER_USER));
  }

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./voucher-service");
    const { seedId } = await import("@/lib/db/seed/helpers");
    const { db, bookings, bookingTravelers, departures, packages, payments, users } = dbModule;
    await cleanup();

    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, "seed_customer_01"));
    ownerId = owner.id;
    await db.insert(users).values({
      id: OTHER_USER,
      clerkId: "test_voucher_admin",
      email: "voucher-admin@example.com",
      role: "admin",
    });

    const pkg = {
      organizerId: seedId("organizer:wayra"),
      destinationId: seedId("destination:cusco"),
      kind: "package" as const,
      blurb: "Prueba",
      durationDays: 4,
      nights: 3,
      priceCents: 100000,
      maxGroupSize: 10,
      languages: ["es"],
      status: "published" as const,
    };
    await db.insert(packages).values([
      {
        ...pkg,
        id: PKG_FULL,
        slug: "test-voucher-full",
        title: "Paquete con punto",
        meetingPoint: "Plaza de Armas",
        meetingLat: -13.5163,
        meetingLng: -71.9785,
        coverImageUrl: "/seed/test.jpg",
      },
      { ...pkg, id: PKG_BARE, slug: "test-voucher-bare", title: "Paquete sin punto" },
    ]);
    await db.insert(departures).values([
      { id: DEP_FULL, packageId: PKG_FULL, capacity: 10, startsAt: at(400) },
      { id: DEP_BARE, packageId: PKG_BARE, capacity: 10, startsAt: at(401) },
    ]);

    const base = {
      customerId: ownerId,
      paxCount: 2,
      unitPriceCents: 100000,
      discountCents: 0,
      totalCents: 200000,
      exchangeRate: 3.75,
      contactEmail: "dueno@example.com",
      contactPhone: "+51987654321",
      termsAcceptedAt: new Date(),
    };
    await db.insert(bookings).values([
      { ...base, id: B_CONFIRMED, code: CODES.confirmed, packageId: PKG_FULL, departureId: DEP_FULL, status: "confirmed" },
      { ...base, id: B_PENDING, code: CODES.pending, packageId: PKG_BARE, departureId: DEP_BARE, status: "pending" },
      { ...base, id: B_CANCELLED, code: CODES.cancelled, packageId: PKG_FULL, departureId: DEP_FULL, status: "cancelled" },
    ]);
    await db.insert(bookingTravelers).values([
      // el no principal va primero: el servicio debe devolver al principal antes
      { bookingId: B_CONFIRMED, firstName: "Luis", lastName: "Gómez", docType: "passport", docNumber: "AB1234567", isPrimary: false },
      { bookingId: B_CONFIRMED, firstName: "Ana", lastName: "Pérez", docType: "dni", docNumber: "12345678", isPrimary: true },
    ]);
    await db.insert(payments).values([
      // varios pagos: gana el más reciente
      { bookingId: B_CONFIRMED, method: "card", status: "failed", amountCents: 11111, createdAt: at(-2) },
      { bookingId: B_CONFIRMED, method: "card", status: "succeeded", amountCents: 53333, createdAt: at(-1) },
      { bookingId: B_CANCELLED, method: "card", status: "refunded", amountCents: 53333, refundedCents: 53333, createdAt: at(-1) },
    ]);
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC7: el dueño recibe el DTO completo, con documento enmascarado y cobro", async () => {
    const dto = await svc.getBookingVoucher(CODES.confirmed, ownerId);
    expect(dto).toMatchObject({
      id: B_CONFIRMED,
      code: CODES.confirmed,
      status: "confirmed",
      paxCount: 2,
      totalCents: 200000,
      package: {
        slug: "test-voucher-full",
        title: "Paquete con punto",
        coverImageUrl: "/seed/test.jpg",
        durationDays: 4,
        nights: 3,
        meetingPoint: "Plaza de Armas",
        meetingLat: -13.5163,
        meetingLng: -71.9785,
        destinationName: expect.any(String),
      },
      chargedUsdCents: 53333,
      paymentStatus: "succeeded",
    });
    expect(dto?.startsAt).toBeInstanceOf(Date);
    expect(dto?.travelers).toEqual([
      { firstName: "Ana", lastName: "Pérez", docType: "dni", docNumberMasked: "****5678", isPrimary: true },
      { firstName: "Luis", lastName: "Gómez", docType: "passport", docNumberMasked: "****4567", isPrimary: false },
    ]);
    expect(JSON.stringify(dto)).not.toContain("12345678");
  });

  it("AC7: otro usuario (incluido un admin) o código inexistente dan null, idéntico", async () => {
    const foreign = await svc.getBookingVoucher(CODES.confirmed, OTHER_USER);
    const missing = await svc.getBookingVoucher("WY-0999", ownerId);
    expect(foreign).toBeNull();
    expect(missing).toBeNull();
    expect(foreign).toEqual(missing);
  });

  it("AC8: código con formato inválido devuelve null sin lanzar", async () => {
    for (const code of ["wy-0971", "", "WY-1", "WY-0971 ", "x".repeat(5000)]) {
      await expect(svc.getBookingVoucher(code, ownerId)).resolves.toBeNull();
    }
  });

  it("AC9: refleja el estado real (pending) y, sin payments ni coordenadas, devuelve nulos", async () => {
    const dto = await svc.getBookingVoucher(CODES.pending, ownerId);
    expect(dto?.status).toBe("pending");
    expect(dto?.chargedUsdCents).toBeNull();
    expect(dto?.paymentStatus).toBeNull();
    expect(dto?.package).toMatchObject({ meetingPoint: null, meetingLat: null, meetingLng: null, coverImageUrl: null });
    expect(dto?.travelers).toEqual([]);
  });

  it("AC9: cancelled con último pago refunded no muestra cobro y expone paymentStatus", async () => {
    const dto = await svc.getBookingVoucher(CODES.cancelled, ownerId);
    expect(dto?.status).toBe("cancelled");
    expect(dto?.chargedUsdCents).toBeNull();
    expect(dto?.paymentStatus).toBe("refunded");
  });

  it("AC9: solo lectura, no crea ni cambia filas", async () => {
    const { db, bookings, payments } = dbModule;
    const count = async () => ({
      b: (await db.select({ id: bookings.id }).from(bookings).where(inArray(bookings.id, bookingIds))).length,
      p: (await db.select({ id: payments.id }).from(payments).where(inArray(payments.bookingId, bookingIds))).length,
    });
    const before = await count();
    await svc.getBookingVoucher(CODES.confirmed, ownerId);
    expect(await count()).toEqual(before);
  });
});

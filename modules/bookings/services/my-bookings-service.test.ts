import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("my-bookings-service (db)", () => {
  const id = (kind: number, n: number) =>
    `00000000-0000-4000-8000-00000017${kind}${String(n).padStart(3, "0")}`;
  const CUSTOMER_A = id(5, 1);
  const CUSTOMER_B = id(5, 2);
  const CUSTOMER_EMPTY = id(5, 3);
  const USERS = [CUSTOMER_A, CUSTOMER_B, CUSTOMER_EMPTY];
  const DAY = 24 * 3600 * 1000;
  const NOW = new Date("2030-01-01T00:00:00.000Z");
  const startsIn = (days: number) => new Date(NOW.getTime() + days * DAY);
  // Base remota (Neon): varios viajes por caso, 5 s no alcanza.
  const TIMEOUT = 30_000;

  // k → reserva; cada una con su paquete y salida.
  type Spec = {
    k: number;
    owner: string;
    status: "pending" | "confirmed" | "cancelled";
    days: number;
    departureStatus?: "scheduled" | "completed";
    payments?: { status: "pending" | "succeeded" | "failed" | "refunded"; amountCents: number; daysAgo: number }[];
  };
  const SPECS: Spec[] = [
    // último pago (por created_at) es pending aunque haya un succeeded más viejo
    {
      k: 1, owner: CUSTOMER_A, status: "confirmed", days: 100,
      payments: [
        { status: "failed", amountCents: 11111, daysAgo: 3 },
        { status: "succeeded", amountCents: 53333, daysAgo: 2 },
        { status: "pending", amountCents: 22222, daysAgo: 1 },
      ],
    },
    // último pago succeeded sobre uno pending más viejo
    {
      k: 2, owner: CUSTOMER_A, status: "confirmed", days: 50,
      payments: [
        { status: "pending", amountCents: 10000, daysAgo: 2 },
        { status: "succeeded", amountCents: 40000, daysAgo: 1 },
      ],
    },
    { k: 3, owner: CUSTOMER_A, status: "pending", days: 30 },
    {
      k: 4, owner: CUSTOMER_A, status: "cancelled", days: -30,
      payments: [{ status: "refunded", amountCents: 53333, daysAgo: 1 }],
    },
    {
      k: 5, owner: CUSTOMER_A, status: "confirmed", days: -10, departureStatus: "completed",
      payments: [{ status: "succeeded", amountCents: 53333, daysAgo: 1 }],
    },
    { k: 6, owner: CUSTOMER_B, status: "confirmed", days: 60, payments: [{ status: "succeeded", amountCents: 99999, daysAgo: 1 }] },
  ];
  const ids = (kind: number) => SPECS.map((s) => id(kind, s.k));
  const code = (k: number) => `WY-88${String(k).padStart(2, "0")}`;

  let svc: typeof import("./my-bookings-service");
  let dbModule: typeof import("@/lib/db");

  async function cleanup() {
    const { db, bookings, departures, packages, payments, users } = dbModule;
    // FKs: payments -> bookings -> departures -> packages -> users.
    await db.delete(payments).where(inArray(payments.bookingId, ids(3)));
    await db.delete(bookings).where(inArray(bookings.id, ids(3)));
    await db.delete(departures).where(inArray(departures.id, ids(2)));
    await db.delete(packages).where(inArray(packages.id, ids(1)));
    await db.delete(users).where(inArray(users.id, USERS));
  }

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./my-bookings-service");
    const { seedId } = await import("@/lib/db/seed/helpers");
    const { db, bookings, departures, packages, payments, users } = dbModule;
    await cleanup();

    await db.insert(users).values(
      USERS.map((uid, i) => ({
        id: uid,
        clerkId: `test_my_bookings_${i}`,
        email: `my-bookings-${i}@example.com`,
        role: "customer" as const,
      })),
    );
    await db.insert(packages).values(
      SPECS.map((s) => ({
        id: id(1, s.k),
        organizerId: seedId("organizer:wayra"),
        destinationId: seedId("destination:cusco"),
        kind: "package" as const,
        slug: `test-my-bookings-${s.k}`,
        title: `Paquete ${s.k}`,
        blurb: "Prueba",
        durationDays: 4,
        nights: 3,
        priceCents: 100000,
        maxGroupSize: 10,
        languages: ["es"],
        status: "published" as const,
        coverImageUrl: s.k === 1 ? "/seed/test.jpg" : null,
      })),
    );
    await db.insert(departures).values(
      SPECS.map((s) => ({
        id: id(2, s.k),
        packageId: id(1, s.k),
        capacity: 10,
        startsAt: startsIn(s.days),
        status: s.departureStatus ?? ("scheduled" as const),
      })),
    );
    await db.insert(bookings).values(
      SPECS.map((s) => ({
        id: id(3, s.k),
        code: code(s.k),
        customerId: s.owner,
        packageId: id(1, s.k),
        departureId: id(2, s.k),
        status: s.status,
        paxCount: 2,
        unitPriceCents: 100000,
        discountCents: 0,
        totalCents: 200000,
        exchangeRate: 3.75,
        contactEmail: "dueno@example.com",
        contactPhone: "+51987654321",
        termsAcceptedAt: new Date(),
      })),
    );
    await db.insert(payments).values(
      SPECS.flatMap((s) =>
        (s.payments ?? []).map((p) => ({
          bookingId: id(3, s.k),
          method: "card" as const,
          status: p.status,
          amountCents: p.amountCents,
          createdAt: new Date(Date.now() - p.daysAgo * DAY),
        })),
      ),
    );
  }, 60_000);

  afterAll(async () => {
    if (dbModule) await cleanup();
  }, 60_000);

  const byCode = (list: Awaited<ReturnType<typeof svc.getMyBookings>>, k: number) =>
    list.find((b) => b.code === code(k));

  it("AC15: devuelve solo las reservas del cliente, con paquete, salida y montos", async () => {
    const list = await svc.getMyBookings(CUSTOMER_A, NOW);
    expect(list.map((b) => b.code).sort()).toEqual([1, 2, 3, 4, 5].map(code));
    expect(byCode(list, 1)).toMatchObject({
      id: id(3, 1),
      status: "confirmed",
      paxCount: 2,
      totalCents: 200000,
      departureStatus: "scheduled",
      package: {
        slug: "test-my-bookings-1",
        title: "Paquete 1",
        coverImageUrl: "/seed/test.jpg",
        destinationName: expect.any(String),
      },
      canCancel: true,
    });
    expect(byCode(list, 1)?.startsAt).toEqual(startsIn(100));
    expect(byCode(list, 1)?.freeCancelUntil).toEqual(new Date(startsIn(100).getTime() - 2 * DAY));
    expect(byCode(list, 5)?.departureStatus).toBe("completed");
    expect(byCode(list, 5)?.canCancel).toBe(false);
    expect(byCode(list, 3)?.package.coverImageUrl).toBeNull();
  }, TIMEOUT);

  it("AC15: otro cliente no ve estas reservas y viceversa", async () => {
    const list = await svc.getMyBookings(CUSTOMER_B, NOW);
    expect(list.map((b) => b.code)).toEqual([code(6)]);
  }, TIMEOUT);

  it("AC15: cliente sin reservas devuelve [] con una sola consulta", async () => {
    const spy = vi.spyOn(dbModule.db, "select");
    try {
      await expect(svc.getMyBookings(CUSTOMER_EMPTY, NOW)).resolves.toEqual([]);
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  }, TIMEOUT);

  it("AC15: paymentStatus y refundableUsdCents salen del último pago por created_at, sin filtrar estado", async () => {
    const list = await svc.getMyBookings(CUSTOMER_A, NOW);
    // último = pending aunque haya un succeeded más viejo
    expect(byCode(list, 1)).toMatchObject({ paymentStatus: "pending", refundableUsdCents: null });
    // último = succeeded sobre un pending más viejo
    expect(byCode(list, 2)).toMatchObject({ paymentStatus: "succeeded", refundableUsdCents: 40000 });
    expect(byCode(list, 4)).toMatchObject({ paymentStatus: "refunded", refundableUsdCents: null });
  }, TIMEOUT);

  it("AC15: sin pagos, paymentStatus es null", async () => {
    const list = await svc.getMyBookings(CUSTOMER_A, NOW);
    expect(byCode(list, 3)).toMatchObject({ status: "pending", paymentStatus: null, refundableUsdCents: null });
  }, TIMEOUT);

  it("AC15: dos consultas (reservas + pagos), sin N+1", async () => {
    const spy = vi.spyOn(dbModule.db, "select");
    try {
      await svc.getMyBookings(CUSTOMER_A, NOW);
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
    }
  }, TIMEOUT);

  it("AC15: el DTO no expone customerId, contacto ni documentos", async () => {
    const json = JSON.stringify(await svc.getMyBookings(CUSTOMER_A, NOW));
    for (const s of ["customerId", "contactEmail", "contactPhone", "dueno@example.com", "+51987654321", "docNumber"]) {
      expect(json).not.toContain(s);
    }
  }, TIMEOUT);

  it("AC15: solo lectura, no crea ni cambia filas", async () => {
    const { db, bookings, payments } = dbModule;
    const count = async () => ({
      b: (await db.select({ id: bookings.id }).from(bookings).where(inArray(bookings.id, ids(3)))).length,
      p: (await db.select({ id: payments.id }).from(payments).where(inArray(payments.bookingId, ids(3)))).length,
    });
    const before = await count();
    await svc.getMyBookings(CUSTOMER_A, NOW);
    expect(await count()).toEqual(before);
  }, TIMEOUT);
});

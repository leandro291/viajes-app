import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { refundPaymentIntent, expireCheckoutSession } = vi.hoisted(() => ({
  refundPaymentIntent: vi.fn(),
  expireCheckoutSession: vi.fn(),
}));
vi.mock("@/modules/payments", () => ({ refundPaymentIntent, expireCheckoutSession }));

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("cancellation-service (db)", () => {
  const id = (kind: number, n: number) =>
    `00000000-0000-4000-8000-00000017${kind}${String(n).padStart(3, "0")}`;
  const OTHER_USER = id(0, 1);
  const HOUR = 3600 * 1000;
  // Base remota (Neon): cada caso de un bucle hace varios viajes (seed + 2 snapshots), 5 s no alcanza.
  const LOOP_TIMEOUT = 30_000;
  const PAX = 2;
  const BOOKED = 4;
  const AMOUNT = 53333;

  type Service = typeof import("./cancellation-service");
  type DepStatus = "scheduled" | "en_route" | "completed" | "cancelled";
  type PayStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";

  let svc: Service;
  let dbModule: typeof import("@/lib/db");
  let ownerId: string;
  let n = 0;
  const used: number[] = [];
  const NOW = new Date("2030-01-01T00:00:00.000Z");
  const startsIn = (hours: number) => new Date(NOW.getTime() + hours * HOUR);

  const ids = (k: number) => ({
    pkg: id(1, k),
    dep: id(2, k),
    booking: id(3, k),
    code: `WY-87${String(k).padStart(2, "0")}`,
  });

  async function cleanup() {
    const { db, bookings, departures, packages, payments, users } = dbModule;
    // FKs: payments -> bookings -> departures -> packages -> users.
    const all = used.map(ids);
    if (all.length) {
      await db.delete(payments).where(inArray(payments.bookingId, all.map((x) => x.booking)));
      await db.delete(bookings).where(inArray(bookings.id, all.map((x) => x.booking)));
      await db.delete(departures).where(inArray(departures.id, all.map((x) => x.dep)));
      await db.delete(packages).where(inArray(packages.id, all.map((x) => x.pkg)));
    }
    await db.delete(users).where(eq(users.id, OTHER_USER));
  }

  type Opts = {
    hours?: number;
    bookingStatus?: "pending" | "confirmed" | "cancelled";
    depStatus?: DepStatus;
    payment?: { status: PayStatus; intent: string | null; session?: string } | null;
  };

  async function seed(opts: Opts = {}) {
    const { db, bookings, departures, packages, payments } = dbModule;
    const { seedId } = await import("@/lib/db/seed/helpers");
    const k = ++n;
    used.push(k);
    const x = ids(k);
    const { hours = 72, bookingStatus = "confirmed", depStatus = "scheduled" } = opts;
    const payment = opts.payment === undefined ? { status: "succeeded" as const, intent: `pi_test_${k}` } : opts.payment;

    await db.insert(packages).values({
      id: x.pkg,
      slug: `test-cancel-${k}`,
      title: "Paquete cancelación",
      organizerId: seedId("organizer:wayra"),
      destinationId: seedId("destination:cusco"),
      kind: "package",
      blurb: "Prueba",
      durationDays: 4,
      nights: 3,
      priceCents: 100000,
      maxGroupSize: 10,
      languages: ["es"],
      status: "published",
    });
    await db.insert(departures).values({
      id: x.dep,
      packageId: x.pkg,
      capacity: 10,
      bookedSeats: BOOKED,
      startsAt: startsIn(hours),
      status: depStatus,
    });
    await db.insert(bookings).values({
      id: x.booking,
      code: x.code,
      customerId: ownerId,
      packageId: x.pkg,
      departureId: x.dep,
      status: bookingStatus,
      paxCount: PAX,
      unitPriceCents: 100000,
      discountCents: 0,
      totalCents: 200000,
      exchangeRate: 3.75,
      contactEmail: "dueno@example.com",
      contactPhone: "+51987654321",
      termsAcceptedAt: new Date(),
    });
    if (payment) {
      await db.insert(payments).values({
        bookingId: x.booking,
        method: "card",
        status: payment.status,
        amountCents: AMOUNT,
        refundedCents: payment.status === "refunded" ? AMOUNT : 0,
        stripePaymentIntentId: payment.intent,
        stripeCheckoutSessionId: payment.session ?? null,
      });
    }
    return x;
  }

  async function snapshot(x: ReturnType<typeof ids>) {
    const { db, bookings, departures, payments } = dbModule;
    const [b] = await db.select().from(bookings).where(eq(bookings.id, x.booking));
    const [d] = await db.select().from(departures).where(eq(departures.id, x.dep));
    const [p] = await db.select().from(payments).where(eq(payments.bookingId, x.booking));
    return { b, d, p };
  }

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./cancellation-service");
    const { db, users } = dbModule;
    await db.delete(users).where(eq(users.id, OTHER_USER));
    const [owner] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, "seed_customer_01"));
    ownerId = owner.id;
    await db.insert(users).values({
      id: OTHER_USER,
      clerkId: "test_cancel_admin",
      email: "cancel-admin@example.com",
      role: "admin",
    });
  });

  beforeEach(() => {
    refundPaymentIntent.mockReset();
    refundPaymentIntent.mockResolvedValue({ alreadyRefunded: false });
    expireCheckoutSession.mockReset();
    expireCheckoutSession.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  it("AC6: cancela, libera cupo, marca el pago refunded y reembolsa una vez", async () => {
    const x = await seed();
    const res = await svc.cancelBooking(x.code, ownerId, NOW);
    expect(res).toEqual({ ok: true, alreadyCancelled: false, refundedUsdCents: AMOUNT });

    const { b, d, p } = await snapshot(x);
    expect(b.status).toBe("cancelled");
    expect(b.cancelledAt).not.toBeNull();
    expect(d.bookedSeats).toBe(BOOKED - PAX);
    expect(p.status).toBe("refunded");
    expect(p.refundedCents).toBe(p.amountCents);
    expect(refundPaymentIntent).toHaveBeenCalledTimes(1);
    expect(refundPaymentIntent).toHaveBeenCalledWith(p.stripePaymentIntentId, `refund-cancel:${p.id}`);
  });

  it("AC7: segunda llamada es idempotente, sin Stripe ni cambio de cupo", async () => {
    const x = await seed();
    await svc.cancelBooking(x.code, ownerId, NOW);
    refundPaymentIntent.mockClear();

    const res = await svc.cancelBooking(x.code, ownerId, NOW);
    expect(res).toEqual({ ok: true, alreadyCancelled: true, refundedUsdCents: 0 });
    expect(refundPaymentIntent).not.toHaveBeenCalled();
    expect((await snapshot(x)).d.bookedSeats).toBe(BOOKED - PAX);
  });

  it("AC7: dos llamadas en paralelo dan un solo reembolso y un solo descuento de cupo", async () => {
    const x = await seed();
    const results = await Promise.all([
      svc.cancelBooking(x.code, ownerId, NOW),
      svc.cancelBooking(x.code, ownerId, NOW),
    ]);
    expect(results.filter((r) => r.ok && !r.alreadyCancelled)).toHaveLength(1);
    expect(results.filter((r) => r.ok && r.alreadyCancelled)).toHaveLength(1);
    expect(refundPaymentIntent).toHaveBeenCalledTimes(1);
    expect((await snapshot(x)).d.bookedSeats).toBe(BOOKED - PAX);
  });

  it("AC8: a 47 h 59 min es too_late y no cambia nada", async () => {
    const x = await seed({ hours: 48 });
    const before = await snapshot(x);
    const res = await svc.cancelBooking(x.code, ownerId, new Date(NOW.getTime() + 60_000));
    expect(res).toEqual({ ok: false, code: "too_late" });
    expect(await snapshot(x)).toEqual(before);
    expect(refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("AC8: a 48 h exactas (now inyectado) se puede cancelar", async () => {
    const x = await seed({ hours: 48 });
    const res = await svc.cancelBooking(x.code, ownerId, NOW);
    expect(res).toMatchObject({ ok: true, alreadyCancelled: false });
  });

  it("AC9: reserva ajena (incluido admin), inexistente y código mal formado dan el mismo not_found", async () => {
    const x = await seed();
    const before = await snapshot(x);
    const foreign = await svc.cancelBooking(x.code, OTHER_USER, NOW);
    const missing = await svc.cancelBooking("WY-8799", ownerId, NOW);
    const malformed = await svc.cancelBooking("wy-8701 ", ownerId, NOW);
    expect(foreign).toEqual({ ok: false, code: "not_found" });
    expect(missing).toEqual(foreign);
    expect(malformed).toEqual(foreign);
    expect(await snapshot(x)).toEqual(before);
    expect(refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("AC10: pending o salida no scheduled dan not_cancellable, sin escrituras", async () => {
    const cases: Opts[] = [
      { bookingStatus: "pending" },
      { depStatus: "cancelled" },
      { depStatus: "completed" },
      { depStatus: "en_route" },
    ];
    for (const opts of cases) {
      const x = await seed(opts);
      const before = await snapshot(x);
      expect(await svc.cancelBooking(x.code, ownerId, NOW)).toEqual({ ok: false, code: "not_cancellable" });
      expect(await snapshot(x)).toEqual(before);
    }
    expect(refundPaymentIntent).not.toHaveBeenCalled();
  }, LOOP_TIMEOUT);

  it("AC10: sin pago refundable da no_refundable_payment, sin escrituras", async () => {
    const cases: Opts[] = [
      { payment: null },
      { payment: { status: "pending", intent: "pi_x" } },
      { payment: { status: "failed", intent: "pi_x" } },
      { payment: { status: "partially_refunded", intent: "pi_x" } },
      { payment: { status: "succeeded", intent: null } },
    ];
    for (const opts of cases) {
      const x = await seed(opts);
      const before = await snapshot(x);
      expect(await svc.cancelBooking(x.code, ownerId, NOW)).toEqual({
        ok: false,
        code: "no_refundable_payment",
      });
      expect(await snapshot(x)).toEqual(before);
    }
    expect(refundPaymentIntent).not.toHaveBeenCalled();
  }, LOOP_TIMEOUT);

  it("AC10: pago succeeded viejo + pago pending más nuevo con pi_… da no_refundable_payment, sin escrituras", async () => {
    const x = await seed();
    const { db, payments } = dbModule;
    await db.insert(payments).values({
      bookingId: x.booking,
      method: "card",
      status: "pending",
      amountCents: AMOUNT,
      stripePaymentIntentId: "pi_newer_pending",
      createdAt: new Date(Date.now() + 60_000),
    });
    const snap = async () => {
      const { b, d } = await snapshot(x);
      const rows = await db.select().from(payments).where(eq(payments.bookingId, x.booking));
      return { b, d, rows: rows.sort((a, c) => a.id.localeCompare(c.id)) };
    };
    const before = await snap();
    expect(await svc.cancelBooking(x.code, ownerId, NOW)).toEqual({
      ok: false,
      code: "no_refundable_payment",
    });
    expect(await snap()).toEqual(before);
    expect(refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("AC11: si Stripe lanza hace rollback total y un reintento cancela", async () => {
    const x = await seed();
    const before = await snapshot(x);
    refundPaymentIntent.mockRejectedValueOnce(new Error("stripe down"));

    expect(await svc.cancelBooking(x.code, ownerId, NOW)).toEqual({ ok: false, code: "refund_failed" });
    expect(await snapshot(x)).toEqual(before);

    const retry = await svc.cancelBooking(x.code, ownerId, NOW);
    expect(retry).toMatchObject({ ok: true, alreadyCancelled: false });
    expect((await snapshot(x)).b.status).toBe("cancelled");
  });

  it("AC12: pago ya refunded cancela y libera el cupo sin llamar a Stripe", async () => {
    const x = await seed({ payment: { status: "refunded", intent: "pi_done" } });
    const res = await svc.cancelBooking(x.code, ownerId, NOW);
    expect(res).toMatchObject({ ok: true, alreadyCancelled: false });
    const { b, d, p } = await snapshot(x);
    expect(b.status).toBe("cancelled");
    expect(d.bookedSeats).toBe(BOOKED - PAX);
    expect(p.status).toBe("refunded");
    expect(refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("AC12: alreadyRefunded de Stripe cancela normal", async () => {
    const x = await seed();
    refundPaymentIntent.mockResolvedValueOnce({ alreadyRefunded: true });
    const res = await svc.cancelBooking(x.code, ownerId, NOW);
    expect(res).toMatchObject({ ok: true, alreadyCancelled: false, refundedUsdCents: AMOUNT });
    expect((await snapshot(x)).b.status).toBe("cancelled");
  });

  describe("cancelBookingAsAdmin", () => {
    it("AC3: cancela reserva ajena a 1 h de la salida, libera cupo y reembolsa una vez", async () => {
      const x = await seed({ hours: 1 });
      const res = await svc.cancelBookingAsAdmin(x.code);
      expect(res).toEqual({ ok: true, alreadyCancelled: false, refundedUsdCents: AMOUNT });

      const { b, d, p } = await snapshot(x);
      expect(b.status).toBe("cancelled");
      expect(b.cancelledAt).not.toBeNull();
      expect(d.bookedSeats).toBe(BOOKED - PAX);
      expect(p.status).toBe("refunded");
      expect(p.refundedCents).toBe(p.amountCents);
      expect(refundPaymentIntent).toHaveBeenCalledTimes(1);
      expect(refundPaymentIntent).toHaveBeenCalledWith(p.stripePaymentIntentId, `refund-cancel:${p.id}`);
      expect(expireCheckoutSession).not.toHaveBeenCalled();
    });

    it("AC3: el cupo nunca baja de 0", async () => {
      const x = await seed();
      const { db, departures } = dbModule;
      await db.update(departures).set({ bookedSeats: 1 }).where(eq(departures.id, x.dep));
      await svc.cancelBookingAsAdmin(x.code);
      expect((await snapshot(x)).d.bookedSeats).toBe(0);
    });

    it("AC4: confirmed con salida cancelled cancela y reembolsa", async () => {
      const x = await seed({ depStatus: "cancelled" });
      expect(await svc.cancelBookingAsAdmin(x.code)).toMatchObject({ ok: true, alreadyCancelled: false });
      const { b, d } = await snapshot(x);
      expect(b.status).toBe("cancelled");
      expect(d.bookedSeats).toBe(BOOKED - PAX);
      expect(refundPaymentIntent).toHaveBeenCalledTimes(1);
    });

    it("AC4: salida en_route o completed da not_cancellable, sin escrituras ni Stripe", async () => {
      for (const depStatus of ["en_route", "completed"] as const) {
        const x = await seed({ depStatus });
        const before = await snapshot(x);
        expect(await svc.cancelBookingAsAdmin(x.code)).toEqual({ ok: false, code: "not_cancellable" });
        expect(await snapshot(x)).toEqual(before);
      }
      expect(refundPaymentIntent).not.toHaveBeenCalled();
      expect(expireCheckoutSession).not.toHaveBeenCalled();
    }, LOOP_TIMEOUT);

    it("AC5: pending cancela sin tocar cupo, pagos pending -> failed y expira la sesión post-commit", async () => {
      const x = await seed({
        bookingStatus: "pending",
        payment: { status: "pending", intent: null, session: "cs_test_pend_1" },
      });
      const res = await svc.cancelBookingAsAdmin(x.code);
      expect(res).toEqual({ ok: true, alreadyCancelled: false, refundedUsdCents: 0 });

      const { b, d, p } = await snapshot(x);
      expect(b.status).toBe("cancelled");
      expect(b.cancelledAt).not.toBeNull();
      expect(d.bookedSeats).toBe(BOOKED);
      expect(p.status).toBe("failed");
      expect(refundPaymentIntent).not.toHaveBeenCalled();
      expect(expireCheckoutSession).toHaveBeenCalledTimes(1);
      expect(expireCheckoutSession).toHaveBeenCalledWith("cs_test_pend_1");
    });

    it("AC5: pending sin pagos cancela igual y no llama a Stripe", async () => {
      const x = await seed({ bookingStatus: "pending", payment: null });
      expect(await svc.cancelBookingAsAdmin(x.code)).toMatchObject({ ok: true, alreadyCancelled: false });
      expect((await snapshot(x)).b.status).toBe("cancelled");
      expect(expireCheckoutSession).not.toHaveBeenCalled();
    });

    it("AC5: pending con salida completed (limpieza) también cancela", async () => {
      const x = await seed({ bookingStatus: "pending", depStatus: "completed", payment: null });
      expect(await svc.cancelBookingAsAdmin(x.code)).toMatchObject({ ok: true });
    });

    it("AC5: no se expira la sesión si el commit falla", async () => {
      const x = await seed({
        bookingStatus: "pending",
        payment: { status: "pending", intent: null, session: "cs_test_pend_fail" },
      });
      const { db } = dbModule;
      const spy = vi.spyOn(db, "transaction").mockRejectedValueOnce(new Error("commit failed"));
      await expect(svc.cancelBookingAsAdmin(x.code)).rejects.toThrow("commit failed");
      spy.mockRestore();
      expect(expireCheckoutSession).not.toHaveBeenCalled();
      expect((await snapshot(x)).b.status).toBe("pending");
    });

    it("AC6: segunda llamada es idempotente, sin Stripe ni cambio de cupo", async () => {
      const x = await seed();
      await svc.cancelBookingAsAdmin(x.code);
      refundPaymentIntent.mockClear();

      expect(await svc.cancelBookingAsAdmin(x.code)).toEqual({
        ok: true,
        alreadyCancelled: true,
        refundedUsdCents: 0,
      });
      expect(refundPaymentIntent).not.toHaveBeenCalled();
      expect((await snapshot(x)).d.bookedSeats).toBe(BOOKED - PAX);
    });

    it("AC6: admin + cliente en paralelo dan un solo reembolso y un solo descuento de cupo", async () => {
      const x = await seed();
      const results = await Promise.all([
        svc.cancelBookingAsAdmin(x.code),
        svc.cancelBooking(x.code, ownerId, NOW),
      ]);
      expect(results.filter((r) => r.ok && !r.alreadyCancelled)).toHaveLength(1);
      expect(results.filter((r) => r.ok && r.alreadyCancelled)).toHaveLength(1);
      expect(refundPaymentIntent).toHaveBeenCalledTimes(1);
      expect((await snapshot(x)).d.bookedSeats).toBe(BOOKED - PAX);
    });

    it("AC7: sin pago refundable da no_refundable_payment, sin escrituras", async () => {
      const cases: Opts[] = [
        { payment: null },
        { payment: { status: "pending", intent: "pi_x" } },
        { payment: { status: "failed", intent: "pi_x" } },
        { payment: { status: "partially_refunded", intent: "pi_x" } },
        { payment: { status: "succeeded", intent: null } },
      ];
      for (const opts of cases) {
        const x = await seed(opts);
        const before = await snapshot(x);
        expect(await svc.cancelBookingAsAdmin(x.code)).toEqual({ ok: false, code: "no_refundable_payment" });
        expect(await snapshot(x)).toEqual(before);
      }
      expect(refundPaymentIntent).not.toHaveBeenCalled();
    }, LOOP_TIMEOUT);

    it("AC7: si Stripe lanza hace rollback total y un reintento cancela", async () => {
      const x = await seed();
      const before = await snapshot(x);
      refundPaymentIntent.mockRejectedValueOnce(new Error("stripe down"));

      expect(await svc.cancelBookingAsAdmin(x.code)).toEqual({ ok: false, code: "refund_failed" });
      expect(await snapshot(x)).toEqual(before);

      expect(await svc.cancelBookingAsAdmin(x.code)).toMatchObject({ ok: true, alreadyCancelled: false });
      expect((await snapshot(x)).b.status).toBe("cancelled");
    });

    it("AC7: pago ya refunded cancela y libera el cupo sin llamar a Stripe", async () => {
      const x = await seed({ payment: { status: "refunded", intent: "pi_done" } });
      expect(await svc.cancelBookingAsAdmin(x.code)).toMatchObject({ ok: true, alreadyCancelled: false });
      const { b, d } = await snapshot(x);
      expect(b.status).toBe("cancelled");
      expect(d.bookedSeats).toBe(BOOKED - PAX);
      expect(refundPaymentIntent).not.toHaveBeenCalled();
    });

    it("AC8: código inexistente o mal formado da not_found", async () => {
      expect(await svc.cancelBookingAsAdmin("WY-8799")).toEqual({ ok: false, code: "not_found" });
      expect(await svc.cancelBookingAsAdmin("wy-8701 ")).toEqual({ ok: false, code: "not_found" });
      expect(refundPaymentIntent).not.toHaveBeenCalled();
    });
  });

  it("AC9: el cliente sigue sin poder cancelar una reserva pending", async () => {
    const x = await seed({
      bookingStatus: "pending",
      payment: { status: "pending", intent: null, session: "cs_test_client" },
    });
    const before = await snapshot(x);
    expect(await svc.cancelBooking(x.code, ownerId, NOW)).toEqual({ ok: false, code: "not_cancellable" });
    expect(await snapshot(x)).toEqual(before);
    expect(expireCheckoutSession).not.toHaveBeenCalled();
  });
});

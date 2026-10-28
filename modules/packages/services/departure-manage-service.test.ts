import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { OrganizerScope } from "../types/package-manage";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("departure-manage-service (db)", () => {
  const userIds = [
    "00000000-0000-4000-8000-000000220001",
    "00000000-0000-4000-8000-000000220002",
    "00000000-0000-4000-8000-000000220003",
  ];
  const orgIds = ["00000000-0000-4000-8000-000000220011", "00000000-0000-4000-8000-000000220012"];
  const CUSTOMER_ID = userIds[2];
  const PKG_PUBLISHED = "00000000-0000-4000-8000-000000220021";
  const PKG_DRAFT = "00000000-0000-4000-8000-000000220022";
  const PKG_OTHER = "00000000-0000-4000-8000-000000220023";
  const GUIDE_MINE = "00000000-0000-4000-8000-000000220031";
  const GUIDE_OTHER = "00000000-0000-4000-8000-000000220032";
  const MISSING_ID = "00000000-0000-4000-8000-0000002200ff";
  const mine: OrganizerScope = { id: orgIds[0], status: "active" };
  const other: OrganizerScope = { id: orgIds[1], status: "active" };
  const pending: OrganizerScope = { ...mine, status: "pending" };
  const suspended: OrganizerScope = { ...mine, status: "suspended" };

  const NOW = new Date("2026-10-27T12:00:00Z");
  const FUTURE = new Date("2099-01-01T12:00:00Z");
  let day = 0;
  // Instantes futuros distintos por llamada: evita choques con el unique (paquete, starts_at).
  const nextDate = () => new Date(Date.UTC(2099, 5, 1 + day++, 12));

  let svc: typeof import("./departure-manage-service");
  let dbModule: typeof import("@/lib/db");
  let seedId: typeof import("@/lib/db/seed/helpers").seedId;

  const cleanup = async () => {
    const { db, bookings, departures, guides, packages, organizers, users } = dbModule;
    const ownPackages = db
      .select({ id: packages.id })
      .from(packages)
      .where(inArray(packages.organizerId, orgIds));
    await db.delete(bookings).where(eq(bookings.customerId, CUSTOMER_ID));
    await db.delete(departures).where(inArray(departures.packageId, ownPackages));
    await db.delete(guides).where(inArray(guides.organizerId, orgIds));
    await db.delete(packages).where(inArray(packages.organizerId, orgIds));
    await db.delete(organizers).where(inArray(organizers.id, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
  };

  const makePackage = (
    id: string,
    organizerId: string,
    status: "draft" | "published",
    n: number,
  ) => ({
    id,
    organizerId,
    destinationId: seedId("destination:lima"),
    kind: "package" as const,
    slug: `zz-prueba-022-${n}`,
    title: `Paquete de prueba 022 ${n}`,
    blurb: "Paquete de prueba para salidas",
    durationDays: 2,
    nights: 1,
    priceCents: 10000,
    maxGroupSize: 10,
    languages: ["es"],
    status,
  });

  const rowOf = async (id: string) => {
    const { db, departures } = dbModule;
    const [row] = await db.select().from(departures).where(eq(departures.id, id));
    return row;
  };

  const addDeparture = async (
    over: Partial<typeof import("@/lib/db").departures.$inferInsert> = {},
  ) => {
    const { db, departures } = dbModule;
    const [row] = await db
      .insert(departures)
      .values({ packageId: PKG_PUBLISHED, startsAt: nextDate(), capacity: 10, ...over })
      .returning({ id: departures.id });
    return row.id;
  };

  const addBooking = async (packageId: string, departureId: string) => {
    const { db, bookings } = dbModule;
    await db.insert(bookings).values({
      customerId: CUSTOMER_ID,
      packageId,
      departureId,
      paxCount: 1,
      unitPriceCents: 1000,
      discountCents: 0,
      totalCents: 1000,
      exchangeRate: 3.75,
      contactEmail: "test-departure-manage@example.invalid",
      contactPhone: "+51900000000",
      termsAcceptedAt: new Date(),
    });
  };

  const updateInput = (over: Partial<Parameters<typeof svc.updateDeparture>[2]> = {}) => ({
    startsAt: FUTURE,
    capacity: 10,
    guideId: null,
    status: "scheduled" as const,
    ...over,
  });

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./departure-manage-service");
    seedId = (await import("@/lib/db/seed/helpers")).seedId;
    await cleanup();
    const { db, guides, packages, organizers, users } = dbModule;
    await db.insert(users).values(
      userIds.map((id, i) => ({
        id,
        clerkId: `test_departure_manage_${i}`,
        email: `test-departure-manage-${i}@example.invalid`,
        role: i < 2 ? ("organizer" as const) : ("customer" as const),
      })),
    );
    await db.insert(organizers).values(
      orgIds.map((id, i) => ({
        id,
        userId: userIds[i],
        businessName: `Operador de prueba salidas ${i}`,
        ruc: "20000000000",
        whatsapp: "+51900000000",
        status: "active" as const,
      })),
    );
    await db
      .insert(packages)
      .values([
        makePackage(PKG_PUBLISHED, orgIds[0], "published", 1),
        makePackage(PKG_DRAFT, orgIds[0], "draft", 2),
        makePackage(PKG_OTHER, orgIds[1], "published", 3),
      ]);
    await db.insert(guides).values([
      { id: GUIDE_MINE, organizerId: orgIds[0], name: "Guía propia", phone: "+51900000001" },
      { id: GUIDE_OTHER, organizerId: orgIds[1], name: "Guía ajena", phone: "+51900000002" },
    ]);
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  describe("createDeparture", () => {
    it("AC9: inserta scheduled con booked_seats 0 y la guía propia", async () => {
      const startsAt = nextDate();
      const r = await svc.createDeparture(
        mine,
        { packageId: PKG_PUBLISHED, startsAt, capacity: 12, guideId: GUIDE_MINE },
        NOW,
      );
      if (!r.ok) throw new Error(`create falló (${r.code})`);
      expect(await rowOf(r.id)).toMatchObject({
        packageId: PKG_PUBLISHED,
        guideId: GUIDE_MINE,
        capacity: 12,
        bookedSeats: 0,
        status: "scheduled",
      });
      expect((await rowOf(r.id)).startsAt.getTime()).toBe(startsAt.getTime());
    });

    it("AC9: paquete ajeno o inexistente -> INVALID_INPUT en packageId y no inserta", async () => {
      const { db, departures } = dbModule;
      const startsAt = nextDate();
      for (const packageId of [PKG_OTHER, MISSING_ID]) {
        expect(
          await svc.createDeparture(mine, { packageId, startsAt, capacity: 5, guideId: null }, NOW),
        ).toMatchObject({
          ok: false,
          code: "INVALID_INPUT",
          fieldErrors: { packageId: "Elige un paquete tuyo." },
        });
      }
      const rows = await db.select().from(departures).where(eq(departures.startsAt, startsAt));
      expect(rows).toHaveLength(0);
    });

    it("AC9: guía ajena o inexistente -> INVALID_INPUT en guideId", async () => {
      for (const guideId of [GUIDE_OTHER, MISSING_ID]) {
        expect(
          await svc.createDeparture(
            mine,
            { packageId: PKG_PUBLISHED, startsAt: nextDate(), capacity: 5, guideId },
            NOW,
          ),
        ).toMatchObject({
          ok: false,
          code: "INVALID_INPUT",
          fieldErrors: { guideId: "Elige una guía tuya." },
        });
      }
    });

    it("AC9: fecha no futura -> INVALID_INPUT en date", async () => {
      expect(
        await svc.createDeparture(
          mine,
          { packageId: PKG_PUBLISHED, startsAt: new Date("2026-10-27T11:00:00Z"), capacity: 5, guideId: null },
          NOW,
        ),
      ).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { date: "Elige una fecha futura." },
      });
    });

    it("AC9: mismo paquete y mismo instante -> error en date; otro paquete, permitido", async () => {
      const startsAt = nextDate();
      const base = { startsAt, capacity: 5, guideId: null };
      expect((await svc.createDeparture(mine, { ...base, packageId: PKG_PUBLISHED }, NOW)).ok).toBe(
        true,
      );
      expect(
        await svc.createDeparture(mine, { ...base, packageId: PKG_PUBLISHED }, NOW),
      ).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { date: "Ya tienes una salida de este paquete a esa hora." },
      });
      expect((await svc.createDeparture(mine, { ...base, packageId: PKG_DRAFT }, NOW)).ok).toBe(
        true,
      );
    });

    it("AC9: suspended no escribe; pending sí", async () => {
      const { db, departures } = dbModule;
      const blockedAt = nextDate();
      expect(
        await svc.createDeparture(
          suspended,
          { packageId: PKG_PUBLISHED, startsAt: blockedAt, capacity: 5, guideId: null },
          NOW,
        ),
      ).toMatchObject({ ok: false, code: "ORGANIZER_SUSPENDED" });
      expect(
        await db.select().from(departures).where(eq(departures.startsAt, blockedAt)),
      ).toHaveLength(0);
      expect(
        (
          await svc.createDeparture(
            pending,
            { packageId: PKG_PUBLISHED, startsAt: nextDate(), capacity: 5, guideId: null },
            NOW,
          )
        ).ok,
      ).toBe(true);
    });

    it("AC12: catalogChanged es true solo si el paquete está publicado", async () => {
      const pub = await svc.createDeparture(
        mine,
        { packageId: PKG_PUBLISHED, startsAt: nextDate(), capacity: 5, guideId: null },
        NOW,
      );
      const draft = await svc.createDeparture(
        mine,
        { packageId: PKG_DRAFT, startsAt: nextDate(), capacity: 5, guideId: null },
        NOW,
      );
      expect(pub).toMatchObject({ ok: true, catalogChanged: true });
      expect(draft).toMatchObject({ ok: true, catalogChanged: false });
    });
  });

  describe("updateDeparture", () => {
    it("AC10: actualiza capacidad, guía, estado y fecha sin tocar package_id", async () => {
      const id = await addDeparture();
      const startsAt = nextDate();
      const r = await svc.updateDeparture(
        mine,
        id,
        updateInput({ startsAt, capacity: 20, guideId: GUIDE_MINE, status: "en_route" }),
        NOW,
      );
      expect(r).toEqual({ ok: true, catalogChanged: true });
      const row = await rowOf(id);
      expect(row).toMatchObject({
        packageId: PKG_PUBLISHED,
        capacity: 20,
        guideId: GUIDE_MINE,
        status: "en_route",
      });
      expect(row.startsAt.getTime()).toBe(startsAt.getTime());
    });

    it("AC10: salida ajena o inexistente -> NOT_FOUND y la fila no cambia", async () => {
      const id = await addDeparture({ packageId: PKG_OTHER, capacity: 7 });
      expect(await svc.updateDeparture(mine, id, updateInput({ capacity: 99 }), NOW)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect(await svc.updateDeparture(mine, MISSING_ID, updateInput(), NOW)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect((await rowOf(id)).capacity).toBe(7);
    });

    it("AC10: aplica checkDepartureChange (terminal, transición, cupos vendidos, capacidad)", async () => {
      const closed = await addDeparture({ status: "completed" });
      expect(await svc.updateDeparture(mine, closed, updateInput(), NOW)).toMatchObject({
        ok: false,
        code: "DEPARTURE_CLOSED",
      });

      const scheduled = await addDeparture();
      expect(
        await svc.updateDeparture(mine, scheduled, updateInput({ status: "completed" }), NOW),
      ).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });

      const sold = await addDeparture({ bookedSeats: 4 });
      const soldAt = (await rowOf(sold)).startsAt;
      expect(
        await svc.updateDeparture(mine, sold, updateInput({ startsAt: soldAt, status: "cancelled" }), NOW),
      ).toMatchObject({ ok: false, code: "SEATS_SOLD" });
      expect(
        await svc.updateDeparture(mine, sold, updateInput({ startsAt: nextDate() }), NOW),
      ).toMatchObject({ ok: false, code: "SEATS_SOLD" });
      expect(
        await svc.updateDeparture(mine, sold, updateInput({ startsAt: soldAt, capacity: 3 }), NOW),
      ).toMatchObject({ ok: false, code: "INVALID_INPUT", fieldErrors: { capacity: expect.any(String) } });
      expect(await rowOf(sold)).toMatchObject({ capacity: 10, bookedSeats: 4, status: "scheduled" });
    });

    it("AC10: con cupos vendidos permite subir capacidad, cambiar guía y pasar a en_route", async () => {
      const id = await addDeparture({ bookedSeats: 4 });
      const startsAt = (await rowOf(id)).startsAt;
      expect(
        await svc.updateDeparture(
          mine,
          id,
          updateInput({ startsAt, capacity: 15, guideId: GUIDE_MINE, status: "en_route" }),
          NOW,
        ),
      ).toEqual({ ok: true, catalogChanged: true });
      expect(await rowOf(id)).toMatchObject({
        capacity: 15,
        bookedSeats: 4,
        guideId: GUIDE_MINE,
        status: "en_route",
      });
    });

    it("AC10: fecha cambiada no futura -> date; sin cambiar fecha no la exige", async () => {
      const id = await addDeparture({ startsAt: new Date("2026-10-27T10:00:00Z") });
      expect(
        await svc.updateDeparture(
          mine,
          id,
          updateInput({ startsAt: new Date("2026-10-27T09:00:00Z") }),
          NOW,
        ),
      ).toMatchObject({ ok: false, code: "INVALID_INPUT", fieldErrors: { date: expect.any(String) } });
      expect(
        await svc.updateDeparture(
          mine,
          id,
          updateInput({ startsAt: new Date("2026-10-27T10:00:00Z"), status: "en_route" }),
          NOW,
        ),
      ).toEqual({ ok: true, catalogChanged: true });
    });

    it("AC10: guía ajena -> guideId; fecha duplicada del mismo paquete -> date", async () => {
      const a = await addDeparture();
      const b = await addDeparture();
      expect(
        await svc.updateDeparture(mine, a, updateInput({ guideId: GUIDE_OTHER }), NOW),
      ).toMatchObject({ ok: false, code: "INVALID_INPUT", fieldErrors: { guideId: expect.any(String) } });
      const taken = (await rowOf(b)).startsAt;
      expect(
        await svc.updateDeparture(mine, a, updateInput({ startsAt: taken }), NOW),
      ).toMatchObject({
        ok: false,
        code: "INVALID_INPUT",
        fieldErrors: { date: "Ya tienes una salida de este paquete a esa hora." },
      });
    });

    it("AC10: si booked_seats cambia entre la lectura y el update -> STALE y no escribe", async () => {
      const { db, departures } = dbModule;
      const id = await addDeparture();
      const startsAt = (await rowOf(id)).startsAt;
      let pendingUpdate: ReturnType<typeof svc.updateDeparture> | undefined;
      // Otra transacción vende un cupo y retiene el lock de la fila: el UPDATE del service lee
      // booked_seats = 0 (snapshot), espera el lock y, al reevaluar el WHERE, no encuentra filas.
      await db.transaction(async (tx) => {
        await tx.update(departures).set({ bookedSeats: 3 }).where(eq(departures.id, id));
        pendingUpdate = svc.updateDeparture(mine, id, updateInput({ startsAt, capacity: 20 }), NOW);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      });
      expect(await pendingUpdate).toMatchObject({ ok: false, code: "STALE" });
      expect(await rowOf(id)).toMatchObject({ capacity: 10, bookedSeats: 3 });
    });

    it("AC10: suspended no escribe; pending sí", async () => {
      const id = await addDeparture();
      expect(
        await svc.updateDeparture(suspended, id, updateInput({ capacity: 11 }), NOW),
      ).toMatchObject({ ok: false, code: "ORGANIZER_SUSPENDED" });
      expect((await rowOf(id)).capacity).toBe(10);
      expect(
        (
          await svc.updateDeparture(
            pending,
            id,
            updateInput({ startsAt: (await rowOf(id)).startsAt, capacity: 11 }),
            NOW,
          )
        ).ok,
      ).toBe(true);
      expect((await rowOf(id)).capacity).toBe(11);
    });

    it("AC12: catalogChanged es false si el paquete es borrador", async () => {
      const id = await addDeparture({ packageId: PKG_DRAFT });
      expect(
        await svc.updateDeparture(
          mine,
          id,
          updateInput({ startsAt: (await rowOf(id)).startsAt, capacity: 12 }),
          NOW,
        ),
      ).toEqual({ ok: true, catalogChanged: false });
    });
  });

  describe("deleteDeparture", () => {
    it("AC11: borra una salida propia sin reservas", async () => {
      const id = await addDeparture();
      expect(await svc.deleteDeparture(mine, id)).toEqual({ ok: true, catalogChanged: true });
      expect(await rowOf(id)).toBeUndefined();
    });

    it("AC11: salida ajena o inexistente -> NOT_FOUND y no se borra", async () => {
      const id = await addDeparture({ packageId: PKG_OTHER });
      expect(await svc.deleteDeparture(mine, id)).toMatchObject({ ok: false, code: "NOT_FOUND" });
      expect(await svc.deleteDeparture(mine, MISSING_ID)).toMatchObject({
        ok: false,
        code: "NOT_FOUND",
      });
      expect(await rowOf(id)).toBeDefined();
    });

    it("AC11: con cupos vendidos -> DEPARTURE_HAS_BOOKINGS", async () => {
      const id = await addDeparture({ bookedSeats: 2 });
      expect(await svc.deleteDeparture(mine, id)).toMatchObject({
        ok: false,
        code: "DEPARTURE_HAS_BOOKINGS",
      });
      expect(await rowOf(id)).toBeDefined();
    });

    it("AC11: con reserva pendiente (booked_seats 0) la FK lo impide -> DEPARTURE_HAS_BOOKINGS", async () => {
      const id = await addDeparture();
      await addBooking(PKG_PUBLISHED, id);
      expect(await svc.deleteDeparture(mine, id)).toMatchObject({
        ok: false,
        code: "DEPARTURE_HAS_BOOKINGS",
      });
      expect(await rowOf(id)).toBeDefined();
    });

    it("AC11: suspended no borra; pending sí", async () => {
      const id = await addDeparture();
      expect(await svc.deleteDeparture(suspended, id)).toMatchObject({
        ok: false,
        code: "ORGANIZER_SUSPENDED",
      });
      expect(await rowOf(id)).toBeDefined();
      expect((await svc.deleteDeparture(pending, id)).ok).toBe(true);
    });

    it("AC12: catalogChanged es false si el paquete es borrador", async () => {
      const id = await addDeparture({ packageId: PKG_DRAFT });
      expect(await svc.deleteDeparture(mine, id)).toEqual({ ok: true, catalogChanged: false });
    });
  });

  it("AC10: el operador B no puede tocar las salidas del A", async () => {
    const id = await addDeparture();
    expect(await svc.deleteDeparture(other, id)).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(await svc.updateDeparture(other, id, updateInput(), NOW)).toMatchObject({
      ok: false,
      code: "NOT_FOUND",
    });
  });
});

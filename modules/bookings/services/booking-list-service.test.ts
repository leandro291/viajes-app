import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { BookingListQuery } from "../types/booking-list";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("booking-list-service (db)", () => {
  const id = (n: number) => `00000000-0000-4000-8000-00000023${String(n).padStart(4, "0")}`;
  const USER_A = id(1);
  const USER_B = id(2);
  const CUST_NAMED = id(3);
  const CUST_NONAME = id(4);
  const ORG_A = id(11);
  const ORG_B = id(12);
  const PKG_A = id(21);
  const PKG_DRAFT = id(22); // de A, en borrador
  const PKG_B = id(23);
  const DEPS_A = [id(31), id(32), id(33)];
  const DEP_CANCELLED = id(34); // de PKG_DRAFT
  const DEP_B = id(35);
  const A_COUNT = 23;
  const bookingA = (n: number) => id(100 + n); // n = 1..23
  const codeA = (n: number) => `WY-91${String(n).padStart(2, "0")}`;
  const B_BOOKINGS = [id(201), id(202)];
  const B_CODES = ["WY-9201", "WY-9202"];
  const B_TRAVELER_DOC = "99999999";
  const DAY = 24 * 3600 * 1000;
  const at = (days: number) => new Date(Date.now() + days * DAY);

  // fixtures de A: borrador+salida cancelada para n=1, el resto reparte salidas
  const fixturesA = Array.from({ length: A_COUNT }, (_, i) => {
    const n = i + 1;
    return {
      n,
      id: bookingA(n),
      code: codeA(n),
      status: (["confirmed", "pending", "cancelled"] as const)[n % 3],
      paxCount: 1 + (n % 2),
      departureId: n === 1 ? DEP_CANCELLED : DEPS_A[n % 3],
      startsAt: n === 1 ? at(399) : at(400 + (n % 3)),
    };
  });
  const allIds = [...fixturesA.map((f) => f.id), ...B_BOOKINGS];

  type Service = typeof import("./booking-list-service");
  let svc: Service;
  let dbModule: typeof import("@/lib/db");

  const q = (over: Partial<BookingListQuery> = {}): BookingListQuery => ({
    orden: "codigo",
    dir: "desc",
    pagina: 1,
    ...over,
  });
  const scopeA = { organizerId: ORG_A };
  const byKeyThenId = (key: "code" | "startsAt" | "total", dir: 1 | -1) =>
    [...fixturesA].sort((a, b) => {
      const va = key === "total" ? a.paxCount : key === "code" ? a.code : a.startsAt.getTime();
      const vb = key === "total" ? b.paxCount : key === "code" ? b.code : b.startsAt.getTime();
      if (va !== vb) return (va < vb ? -1 : 1) * dir;
      return (a.id < b.id ? -1 : 1) * dir;
    });

  async function cleanup() {
    const { db, bookings, departures, organizers, packages, payments, users } = dbModule;
    // FKs: payments -> bookings (travelers en cascade) -> departures -> packages -> organizers -> users.
    await db.delete(payments).where(inArray(payments.bookingId, allIds));
    await db.delete(bookings).where(inArray(bookings.id, allIds));
    await db
      .delete(departures)
      .where(inArray(departures.packageId, [PKG_A, PKG_DRAFT, PKG_B]));
    await db.delete(packages).where(inArray(packages.id, [PKG_A, PKG_DRAFT, PKG_B]));
    await db.delete(organizers).where(inArray(organizers.id, [ORG_A, ORG_B]));
    await db.delete(users).where(inArray(users.id, [USER_A, USER_B, CUST_NAMED, CUST_NONAME]));
  }

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    svc = await import("./booking-list-service");
    const { seedId } = await import("@/lib/db/seed/helpers");
    const { db, bookings, bookingTravelers, departures, organizers, packages, payments, users } =
      dbModule;
    await cleanup();

    await db.insert(users).values([
      { id: USER_A, clerkId: "test_blist_org_a", email: "blist-org-a@example.invalid", role: "organizer" },
      { id: USER_B, clerkId: "test_blist_org_b", email: "blist-org-b@example.invalid", role: "organizer" },
      { id: CUST_NAMED, clerkId: "test_blist_cust_1", email: "blist-cust-1@example.invalid", firstName: "Ana", lastName: "Pérez" },
      { id: CUST_NONAME, clerkId: "test_blist_cust_2", email: "blist-cust-2@example.invalid" },
    ]);
    await db.insert(organizers).values(
      [ORG_A, ORG_B].map((orgId, i) => ({
        id: orgId,
        userId: i === 0 ? USER_A : USER_B,
        businessName: `Operador de prueba reservas ${i}`,
        ruc: "20000000000",
        whatsapp: "+51900000000",
        status: "active" as const,
      })),
    );

    const pkg = {
      destinationId: seedId("destination:cusco"),
      kind: "package" as const,
      blurb: "Prueba",
      durationDays: 2,
      nights: 1,
      priceCents: 100000,
      maxGroupSize: 10,
      languages: ["es"],
    };
    await db.insert(packages).values([
      { ...pkg, id: PKG_A, organizerId: ORG_A, slug: "test-blist-a", title: "Paquete A", status: "published" },
      { ...pkg, id: PKG_DRAFT, organizerId: ORG_A, slug: "test-blist-draft", title: "Paquete borrador", status: "draft" },
      { ...pkg, id: PKG_B, organizerId: ORG_B, slug: "test-blist-b", title: "Paquete B", status: "published" },
    ]);
    await db.insert(departures).values([
      ...DEPS_A.map((depId, i) => ({ id: depId, packageId: PKG_A, capacity: 50, startsAt: at(400 + i) })),
      { id: DEP_CANCELLED, packageId: PKG_DRAFT, capacity: 50, startsAt: at(399), status: "cancelled" as const },
      { id: DEP_B, packageId: PKG_B, capacity: 50, startsAt: at(410) },
    ]);

    const base = {
      unitPriceCents: 100000,
      discountCents: 0,
      exchangeRate: 3.75,
      contactEmail: "contacto@example.invalid",
      contactPhone: "+51987654321",
      termsAcceptedAt: new Date(),
    };
    await db.insert(bookings).values([
      ...fixturesA.map((f) => ({
        ...base,
        id: f.id,
        code: f.code,
        customerId: f.n % 2 === 1 ? CUST_NAMED : CUST_NONAME,
        packageId: f.n === 1 ? PKG_DRAFT : PKG_A,
        departureId: f.departureId,
        status: f.status,
        paxCount: f.paxCount,
        totalCents: 100000 * f.paxCount,
      })),
      ...B_BOOKINGS.map((bId, i) => ({
        ...base,
        id: bId,
        code: B_CODES[i],
        customerId: CUST_NAMED,
        packageId: PKG_B,
        departureId: DEP_B,
        status: "confirmed" as const,
        paxCount: 1,
        totalCents: 100000,
      })),
    ]);
    await db.insert(bookingTravelers).values([
      // el no principal va primero: el servicio debe devolver al principal antes
      { bookingId: bookingA(1), firstName: "Luis", lastName: "Gómez", docType: "passport", docNumber: "AB1234567", isPrimary: false },
      { bookingId: bookingA(1), firstName: "Ana", lastName: "Pérez", docType: "dni", docNumber: "12345678", isPrimary: true },
      { bookingId: B_BOOKINGS[0], firstName: "Ajeno", lastName: "Operador", docType: "dni", docNumber: B_TRAVELER_DOC, isPrimary: true },
    ]);
    await db.insert(payments).values([
      // varios pagos: gana el más reciente (n=3 → fallido y luego pagado)
      { bookingId: bookingA(3), method: "card", status: "failed", amountCents: 1000, createdAt: at(-2) },
      { bookingId: bookingA(3), method: "card", status: "succeeded", amountCents: 2000, createdAt: at(-1) },
      { bookingId: bookingA(2), method: "card", status: "pending", amountCents: 3000, createdAt: at(-1) },
    ]);
  });

  afterAll(async () => {
    if (dbModule) await cleanup();
  });

  const walk = async (query: BookingListQuery) => {
    const first = await svc.listBookings(scopeA, query);
    const rows = [...first.rows];
    for (let p = 2; p <= first.pageCount; p++) {
      rows.push(...(await svc.listBookings(scopeA, { ...query, pagina: p })).rows);
    }
    return rows;
  };

  it("AC6: solo devuelve reservas del operador (incluye borrador y salida cancelada), sin viajeros ajenos", async () => {
    const rows = await walk(q());
    expect(rows.map((r) => r.id).sort()).toEqual(fixturesA.map((f) => f.id).sort());
    expect(rows.some((r) => B_CODES.includes(r.code))).toBe(false);
    expect(JSON.stringify(rows)).not.toContain(B_TRAVELER_DOC);
    expect(rows.find((r) => r.id === bookingA(1))?.packageTitle).toBe("Paquete borrador");

    const b = await svc.listBookings({ organizerId: ORG_B }, q());
    expect(b.rows.map((r) => r.code).sort()).toEqual(B_CODES);
    expect(b.rows.flatMap((r) => r.travelers).map((t) => t.docNumber)).toEqual([B_TRAVELER_DOC]);
  });

  it("AC6: un operador sin reservas obtiene lista vacía y pageCount 1", async () => {
    const res = await svc.listBookings({ organizerId: id(999) }, q());
    expect(res).toEqual({ rows: [], total: 0, page: 1, pageCount: 1 });
  });

  it("AC7: { all: true } incluye reservas de todos los operadores con la misma forma", async () => {
    const res = await svc.listBookings({ all: true }, q());
    // los códigos 9xxx son los más altos: desc los trae primero
    const mine = res.rows.filter((r) => allIds.includes(r.id));
    expect(mine.map((r) => r.code).slice(0, 2)).toEqual(["WY-9202", "WY-9201"]);
    expect(res.total).toBeGreaterThanOrEqual(A_COUNT + B_CODES.length);
    expect(Object.keys(mine[0]).sort()).toEqual(
      Object.keys((await svc.listBookings(scopeA, q())).rows[0]).sort(),
    );
  });

  it("AC8: la fila trae todos los campos, viajeros con principal primero y docNumber completo", async () => {
    const row = (await walk(q())).find((r) => r.id === bookingA(1));
    expect(row).toMatchObject({
      id: bookingA(1),
      code: codeA(1),
      packageTitle: "Paquete borrador",
      customerName: "Ana Pérez",
      contactEmail: "contacto@example.invalid",
      contactPhone: "+51987654321",
      paxCount: 2,
      totalCents: 200000,
      status: "pending",
      paymentStatus: null,
    });
    expect(row?.departureStartsAt).toBeInstanceOf(Date);
    expect(row?.travelers).toEqual([
      { id: expect.any(String), firstName: "Ana", lastName: "Pérez", docType: "dni", docNumber: "12345678", isPrimary: true },
      { id: expect.any(String), firstName: "Luis", lastName: "Gómez", docType: "passport", docNumber: "AB1234567", isPrimary: false },
    ]);
  });

  it("AC8: cliente sin nombre → customerName null; reserva sin viajeros → []", async () => {
    const rows = await walk(q());
    const row = rows.find((r) => r.id === bookingA(2));
    expect(row?.customerName).toBeNull();
    expect(row?.travelers).toEqual([]);
  });

  it("AC8: último pago por created_at desc; sin pagos → null", async () => {
    const rows = await walk(q());
    expect(rows.find((r) => r.id === bookingA(3))?.paymentStatus).toBe("succeeded");
    expect(rows.find((r) => r.id === bookingA(2))?.paymentStatus).toBe("pending");
    expect(rows.find((r) => r.id === bookingA(4))?.paymentStatus).toBeNull();
  });

  it("AC9: estado filtra y total/pageCount lo reflejan", async () => {
    const confirmed = fixturesA.filter((f) => f.status === "confirmed");
    const res = await svc.listBookings(scopeA, q({ estado: "confirmed" }));
    expect(res.total).toBe(confirmed.length);
    expect(res.pageCount).toBe(1);
    expect(res.rows.every((r) => r.status === "confirmed")).toBe(true);
    expect(res.rows).toHaveLength(confirmed.length);
  });

  it("AC10: ordena por código, salida y total, asc y desc, con desempate por id", async () => {
    const cases: [BookingListQuery["orden"], "code" | "startsAt" | "total"][] = [
      ["codigo", "code"],
      ["salida", "startsAt"],
      ["total", "total"],
    ];
    for (const [orden, key] of cases) {
      for (const [dir, sign] of [["asc", 1], ["desc", -1]] as const) {
        const rows = await walk(q({ orden, dir }));
        expect(rows.map((r) => r.id), `${orden} ${dir}`).toEqual(
          byKeyThenId(key, sign).map((f) => f.id),
        );
      }
    }
  });

  it("AC11: 20 por página, total, pageCount y recorrido completo sin repetir ni omitir", async () => {
    const p1 = await svc.listBookings(scopeA, q());
    expect(p1).toMatchObject({ total: A_COUNT, page: 1, pageCount: 2 });
    expect(p1.rows).toHaveLength(20);
    const p2 = await svc.listBookings(scopeA, q({ pagina: 2 }));
    expect(p2.rows).toHaveLength(A_COUNT - 20);
    // orden con muchos empates (total): ninguna fila repetida entre páginas
    const ids = (await walk(q({ orden: "total", dir: "asc" }))).map((r) => r.id);
    expect(new Set(ids).size).toBe(A_COUNT);
  });

  it("AC11: página fuera de rango se acota a la última y informa la page usada", async () => {
    const res = await svc.listBookings(scopeA, q({ pagina: 999 }));
    expect(res.page).toBe(2);
    expect(res.rows).toHaveLength(A_COUNT - 20);
    expect(res.rows.map((r) => r.id)).toEqual(
      (await svc.listBookings(scopeA, q({ pagina: 2 }))).rows.map((r) => r.id),
    );
  });

  it("AC12: los viajeros de reservas ajenas no aparecen ni en la página ni con filtro", async () => {
    for (const query of [q(), q({ estado: "confirmed" }), q({ pagina: 2 })]) {
      expect(JSON.stringify(await svc.listBookings(scopeA, query))).not.toContain(B_TRAVELER_DOC);
    }
  });

  it("AC12: organizerName es el business_name del operador, con { all: true } y { organizerId }", async () => {
    const name = (i: number) => `Operador de prueba reservas ${i}`;
    expect((await walk(q())).every((r) => r.organizerName === name(0))).toBe(true);
    const b = await svc.listBookings({ organizerId: ORG_B }, q());
    expect(b.rows.every((r) => r.organizerName === name(1))).toBe(true);

    const all = await svc.listBookings({ all: true }, q());
    const mine = all.rows.filter((r) => allIds.includes(r.id));
    expect(new Set(mine.map((r) => r.organizerName)).size).toBeGreaterThanOrEqual(2);
    expect(mine.filter((r) => B_CODES.includes(r.code)).every((r) => r.organizerName === name(1))).toBe(true);
    expect(mine.filter((r) => !B_CODES.includes(r.code)).every((r) => r.organizerName === name(0))).toBe(true);
  });

  it("AC12: solo lectura, no crea ni cambia filas", async () => {
    const { db, bookings } = dbModule;
    const count = async () =>
      (await db.select({ id: bookings.id }).from(bookings).where(inArray(bookings.id, allIds))).length;
    const before = await count();
    await svc.listBookings(scopeA, q());
    expect(await count()).toBe(before);
  });
});

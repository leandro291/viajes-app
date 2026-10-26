import { and, asc, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";

import { dayRange, limaToday } from "../utils/tour-filters";

const { cacheLife, cacheTag } = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

const HOUR = 3_600_000;

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("tour-service (db)", () => {
  // Salidas de prueba (ids fijos, se borran en beforeAll/afterAll).
  const dep = (n: number) => `00000000-0000-4000-8000-0000000010${String(n).padStart(2, "0")}`;
  const DEP_IDS = Array.from({ length: 12 }, (_, i) => dep(i + 1));
  const DRAFT_TOUR_ID = "00000000-0000-4000-8000-000000001102";
  const DRAFT_SLUG = "test-draft-tour-t4";

  let service: typeof import("./tour-service");
  let packageService: typeof import("./package-service");
  let dbModule: typeof import("@/lib/db");
  let cache: typeof import("next/cache");
  let seed: typeof import("@/lib/db/seed/data/packages");
  let seedHelpers: typeof import("@/lib/db/seed/helpers");

  const tourId = (slug: string) => seedHelpers.seedId(`package:${slug}`);

  // Un tour sin horas ni salidas, sin insertar tours published (008 los leería en paralelo):
  // se vacía temporalmente un tour del seed y se restaura en finally.
  // Riesgo conocido: mientras corre, otros archivos db en paralelo pueden ver el tour alterado, y
  // si el proceso muere antes del finally queda así hasta correr `npm run db:seed`.
  async function withBareTour<T>(slug: string, fn: (id: string) => Promise<T>): Promise<T> {
    const { db, departures, packages } = dbModule;
    const id = tourId(slug);
    const [{ durationHours }] = await db
      .select({ durationHours: packages.durationHours })
      .from(packages)
      .where(eq(packages.id, id));
    const open = await db
      .select({ id: departures.id })
      .from(departures)
      .where(and(eq(departures.packageId, id), eq(departures.status, "scheduled")));
    const openIds = open.map((o) => o.id);
    try {
      await db.update(packages).set({ durationHours: null }).where(eq(packages.id, id));
      if (openIds.length > 0) {
        await db.update(departures).set({ status: "cancelled" }).where(inArray(departures.id, openIds));
      }
      return await fn(id);
    } finally {
      await db.update(packages).set({ durationHours }).where(eq(packages.id, id));
      if (openIds.length > 0) {
        await db.update(departures).set({ status: "scheduled" }).where(inArray(departures.id, openIds));
      }
    }
  }

  async function cleanup() {
    const { db, departures, packages } = dbModule;
    await db.delete(departures).where(inArray(departures.id, DEP_IDS));
    await db.delete(packages).where(eq(packages.id, DRAFT_TOUR_ID));
  }

  // Salidas de AC9 (día lejano, sin salidas del seed) y de AC10 (próximas horas).
  const now = Date.now();
  const FAR_DAY = limaToday(new Date(now + 200 * 24 * HOUR));
  const farAt = (time: string) => new Date(`${FAR_DAY}T${time}-05:00`);
  const A = "montana-de-colores";
  const FULL = "machu-picchu-en-un-dia";
  const CANCELLED = "valle-sagrado-completo";
  const PAST = "city-tour-sacsayhuaman";
  const NEXT = "islas-ballestas";
  const BARE = "lima-colonial-miraflores";

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./tour-service");
    packageService = await import("./package-service");
    cache = await import("next/cache");
    seed = await import("@/lib/db/seed/data/packages");
    seedHelpers = await import("@/lib/db/seed/helpers");

    await cleanup();
    await dbModule.db.insert(dbModule.packages).values({
      id: DRAFT_TOUR_ID,
      organizerId: seedHelpers.seedId("organizer:wayra"),
      destinationId: seedHelpers.seedId("destination:cusco"),
      kind: "day_tour",
      slug: DRAFT_SLUG,
      title: "Borrador de prueba",
      blurb: "No debe verse",
      durationDays: 1,
      nights: 0,
      priceCents: 1,
      maxGroupSize: 10,
      languages: ["es"],
      status: "draft",
    });

    // Hoy (Lima), a mitad de camino entre 00:00 y ahora: ya pasó y sigue siendo hoy.
    const todayFrom = dayRange(limaToday(new Date(now))).from.getTime();
    const pastToday = new Date(todayFrom + Math.floor((now - todayFrom) / 2));

    const d = (n: number, slug: string, startsAt: Date, over: object = {}) => ({
      id: dep(n),
      packageId: tourId(slug),
      startsAt,
      capacity: 10,
      bookedSeats: 0,
      ...over,
    });
    await dbModule.db.insert(dbModule.departures).values([
      // AC9: día lejano.
      d(1, A, farAt("15:00:00"), { capacity: 12, bookedSeats: 5 }),
      d(2, A, farAt("09:00:00"), { capacity: 12, bookedSeats: 5 }),
      d(3, FULL, farAt("09:00:00"), { bookedSeats: 10 }),
      d(4, CANCELLED, farAt("09:00:00"), { status: "cancelled" }),
      d(5, PAST, pastToday),
      // AC10: orden de más próxima a más lejana; solo la última es válida.
      d(6, NEXT, new Date(now + 1 * HOUR), { bookedSeats: 10 }),
      d(7, NEXT, new Date(now + 2 * HOUR), { status: "cancelled" }),
      d(8, NEXT, new Date(now - 1 * HOUR)),
      d(9, NEXT, new Date(now + 3 * HOUR), { capacity: 20, bookedSeats: 4 }),
    ]);
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(() => {
    vi.mocked(cache.cacheLife).mockClear();
    vi.mocked(cache.cacheTag).mockClear();
  });

  const isDay = (p: { kind: string; durationDays: number }) =>
    p.kind === "day_tour" || p.durationDays === 1;
  const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);

  it("AC7: getTours({}) devuelve los tours published del seed, sin draft ni paquetes de varios días", async () => {
    const tours = await service.getTours({});
    const expected = seed.seedPackages.filter(isDay).map((p) => p.id!).sort();
    expect(seed.seedPackages.some((p) => !isDay(p))).toBe(true);
    expect(tours.map((t) => t.id).sort()).toEqual(expected);
    expect(tours.some((t) => t.slug === DRAFT_SLUG)).toBe(false);
  });

  it("AC7: cada ítem trae la forma de TourCardDto", async () => {
    const tours = await service.getTours({});
    expect(tours).toHaveLength(seed.seedPackages.filter(isDay).length);
    for (const t of tours) {
      expect(t.destination.slug).toBeTruthy();
      expect(t.destination.name).toBeTruthy();
      expect(t.destination.region).toBeTruthy();
      expect(typeof t.durationHours).toBe("number");
      expect(t.startTime).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(typeof t.priceCents).toBe("number");
    }
  });

  it("AC8: ciudad devuelve solo los tours de ese destino y sin coincidencias devuelve []", async () => {
    const cusco = await service.getTours({ ciudad: "cusco" });
    expect(cusco).toHaveLength(4);
    expect(cusco.every((t) => t.destination.slug === "cusco")).toBe(true);
    expect(await service.getTours({ ciudad: "no-existe" })).toEqual([]);
    expect(await service.getTours({ ciudad: "lima", fecha: FAR_DAY })).toEqual([]);
  });

  it("AC9: fecha incluye solo tours con salida programada y con cupo ese día", async () => {
    const tours = await service.getTours({ fecha: FAR_DAY });
    expect(tours.map((t) => t.slug)).toEqual([A]);
  });

  it("AC9: con fecha, nextDeparture es la primera salida de ese día", async () => {
    const [tour] = await service.getTours({ fecha: FAR_DAY });
    expect(tour.nextDeparture).toEqual({ startsAt: farAt("09:00:00"), seatsLeft: 7 });
  });

  it("AC9: fecha de hoy excluye la salida cuya hora ya pasó", async () => {
    const today = limaToday(new Date());
    const tours = await service.getTours({ fecha: today });
    expect(tours.some((t) => t.slug === PAST)).toBe(false);
  });

  it("AC10: nextDeparture omite salidas llenas, canceladas y pasadas", async () => {
    const tours = await service.getTours({});
    const tour = tours.find((t) => t.slug === NEXT)!;
    const invalid = [now + 1 * HOUR, now + 2 * HOUR, now - 1 * HOUR];
    expect(tour.nextDeparture).not.toBeNull();
    expect(invalid).not.toContain(tour.nextDeparture!.startsAt.getTime());
    expect(tour.nextDeparture!.startsAt.getTime()).toBeLessThanOrEqual(now + 3 * HOUR);

    const { db, departures } = dbModule;
    const [first] = await db
      .select()
      .from(departures)
      .where(
        and(
          eq(departures.packageId, tour.id),
          eq(departures.status, "scheduled"),
          gt(departures.startsAt, sql`now()`),
          lt(departures.bookedSeats, departures.capacity),
        ),
      )
      .orderBy(asc(departures.startsAt))
      .limit(1);
    expect(tour.nextDeparture).toEqual({
      startsAt: first.startsAt,
      seatsLeft: first.capacity - first.bookedSeats,
    });
  });

  it("AC10: sin salidas con cupo nextDeparture es null y el tour sigue en la lista", async () => {
    await withBareTour(BARE, async (id) => {
      const tour = (await service.getTours({})).find((t) => t.id === id);
      expect(tour).toBeDefined();
      expect(tour!.nextDeparture).toBeNull();
    });
  });

  it("AC11: sin orden sigue el ranking de más reservados de getPackages({ duracion: '1' })", async () => {
    const tours = await service.getTours({});
    const packagesDay = await packageService.getPackages({ duracion: "1" });
    expect(tours.map((t) => t.slug)).toEqual(packagesDay.map((p) => p.slug));
  });

  it("AC11: precio-asc ordena por priceCents con empate por id", async () => {
    const tours = await service.getTours({ orden: "precio-asc" });
    expect(tours.map((t) => t.id)).toEqual(
      [...tours].sort((a, b) => a.priceCents - b.priceCents || byId(a, b)).map((t) => t.id),
    );
  });

  it("AC11: mas-cortos ordena por durationHours asc y deja los NULL al final", async () => {
    await withBareTour(BARE, async (id) => {
      const tours = await service.getTours({ orden: "mas-cortos" });
      expect(tours.at(-1)!.id).toBe(id);
      const withHours = tours.slice(0, -1);
      expect(withHours.map((t) => t.id)).toEqual(
        [...withHours]
          .sort(
            (a, b) =>
              a.durationHours! - b.durationHours! || a.priceCents - b.priceCents || byId(a, b),
          )
          .map((t) => t.id),
      );
    });
  });

  it("AC12: getTours declara cacheLife('minutes') y cacheTag(packages, departures)", async () => {
    await service.getTours({});
    expect(cache.cacheLife).toHaveBeenCalledWith("minutes");
    expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.packages, CACHE_TAGS.departures);
  });
});

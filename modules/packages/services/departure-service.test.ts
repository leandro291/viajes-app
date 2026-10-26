import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("departure-service (db)", () => {
  const DRAFT_ID = "00000000-0000-4000-8000-0000000014ff";
  const DRAFT_SLUG = "test-draft-bookable-departure";
  const ids = {
    ok: "00000000-0000-4000-8000-000000140001",
    full: "00000000-0000-4000-8000-000000140002",
    past: "00000000-0000-4000-8000-000000140003",
    cancelled: "00000000-0000-4000-8000-000000140004",
    enRoute: "00000000-0000-4000-8000-000000140005",
    draft: "00000000-0000-4000-8000-000000140006",
  };
  const allIds = Object.values(ids);
  const DAY = 24 * 3600 * 1000;
  // Salidas relativas a now(): las del seed caducan.
  const at = (days: number) => new Date(Date.now() + days * DAY);

  let getBookableDeparture: typeof import("./departure-service").getBookableDeparture;
  let dbModule: typeof import("@/lib/db");
  let seedId: typeof import("@/lib/db/seed/helpers").seedId;

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    ({ getBookableDeparture } = await import("./departure-service"));
    seedId = (await import("@/lib/db/seed/helpers")).seedId;

    const { db, packages, departures } = dbModule;
    await db.delete(departures).where(inArray(departures.id, allIds));
    await db.delete(packages).where(eq(packages.id, DRAFT_ID));
    await db.insert(packages).values({
      id: DRAFT_ID,
      organizerId: seedId("organizer:wayra"),
      destinationId: seedId("destination:cusco"),
      kind: "package",
      slug: DRAFT_SLUG,
      title: "Borrador de prueba",
      blurb: "No debe verse",
      durationDays: 3,
      nights: 2,
      priceCents: 100,
      maxGroupSize: 10,
      languages: ["es"],
      status: "draft",
    });
    const published = { packageId: seedId("package:machu-picchu-magico"), capacity: 10 };
    await db.insert(departures).values([
      { ...published, id: ids.ok, startsAt: at(300), bookedSeats: 4 },
      { ...published, id: ids.full, startsAt: at(301), bookedSeats: 10 },
      { ...published, id: ids.past, startsAt: at(-300) },
      { ...published, id: ids.cancelled, startsAt: at(302), status: "cancelled" },
      { ...published, id: ids.enRoute, startsAt: at(303), status: "en_route" },
      { packageId: DRAFT_ID, capacity: 10, id: ids.draft, startsAt: at(304) },
    ]);
  });

  afterAll(async () => {
    const { db, packages, departures } = dbModule;
    await db.delete(departures).where(inArray(departures.id, allIds));
    await db.delete(packages).where(eq(packages.id, DRAFT_ID));
  });

  it("AC8: devuelve la salida con cupo y el resumen del paquete", async () => {
    const dep = await getBookableDeparture(ids.ok);
    expect(dep).toMatchObject({
      id: ids.ok,
      seatsLeft: 6,
      package: {
        id: seedId("package:machu-picchu-magico"),
        slug: "machu-picchu-magico",
        title: "Machu Picchu Mágico",
        region: expect.any(String),
        durationDays: 4,
        nights: 3,
      },
    });
    expect(dep?.startsAt).toBeInstanceOf(Date);
    expect(dep?.package).toHaveProperty("coverImageUrl");
  });

  it("AC8: salida llena -> seatsLeft 0", async () => {
    expect((await getBookableDeparture(ids.full))?.seatsLeft).toBe(0);
  });

  it("AC8: null para pasada, cancelled, en_route y paquete draft", async () => {
    for (const id of [ids.past, ids.cancelled, ids.enRoute, ids.draft]) {
      expect(await getBookableDeparture(id)).toBeNull();
    }
  });

  it("AC8: null para uuid inexistente y texto que no es uuid (sin lanzar)", async () => {
    expect(await getBookableDeparture("00000000-0000-4000-8000-00000014ffff")).toBeNull();
    expect(await getBookableDeparture("zzz")).toBeNull();
    expect(await getBookableDeparture("")).toBeNull();
  });
});

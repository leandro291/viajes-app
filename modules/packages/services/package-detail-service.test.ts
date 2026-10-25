import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";

const { cacheLife, cacheTag } = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("package-detail-service (db)", () => {
  const DRAFT_ID = "00000000-0000-4000-8000-0000000000e1";
  const DRAFT_SLUG = "test-draft-package-detail";
  const dep = (n: number) => `00000000-0000-4000-8000-0000000000f${n}`;
  const DAY = 24 * 3600 * 1000;

  let service: typeof import("./package-detail-service");
  let dbModule: typeof import("@/lib/db");
  let cache: typeof import("next/cache");
  let seedDetails: typeof import("@/lib/db/seed/data/package-details");
  let seedId: typeof import("@/lib/db/seed/helpers").seedId;

  const mpmId = () => seedId("package:machu-picchu-magico");

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./package-detail-service");
    cache = await import("next/cache");
    seedDetails = await import("@/lib/db/seed/data/package-details");
    seedId = (await import("@/lib/db/seed/helpers")).seedId;

    const { db, packages, departures } = dbModule;
    await db.delete(departures).where(inArray(departures.id, [1, 2, 3, 4, 5].map(dep)));
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
    // Salidas propias relativas a now(): las del seed caducan. Se cuelgan del borrador (FK).
    const base = { packageId: DRAFT_ID, capacity: 10 };
    await db.insert(departures).values([
      { ...base, id: dep(1), startsAt: new Date(Date.now() + 3 * DAY), bookedSeats: 4 },
      { ...base, id: dep(2), startsAt: new Date(Date.now() + 1 * DAY), bookedSeats: 10 }, // llena
      { ...base, id: dep(3), startsAt: new Date(Date.now() - 1 * DAY), bookedSeats: 0 }, // pasada
      { ...base, id: dep(4), startsAt: new Date(Date.now() + 5 * DAY), status: "cancelled" },
      { ...base, id: dep(5), startsAt: new Date(Date.now() + 7 * DAY), status: "en_route" },
    ]);
  });

  afterAll(async () => {
    const { db, packages, departures } = dbModule;
    await db.delete(departures).where(inArray(departures.id, [1, 2, 3, 4, 5].map(dep)));
    await db.delete(packages).where(eq(packages.id, DRAFT_ID));
  });

  beforeEach(() => {
    vi.mocked(cache.cacheLife).mockClear();
    vi.mocked(cache.cacheTag).mockClear();
  });

  it("AC6: devuelve el detalle completo de machu-picchu-magico", async () => {
    const mine = (r: { packageId: string }) => r.packageId === mpmId();
    const pkg = await service.getPackageBySlug("machu-picchu-magico");
    expect(pkg).not.toBeNull();
    expect(pkg!.destination.slug).toBe("cusco");

    const expectedImages = seedDetails.seedPackageImages.filter(mine).sort((a, b) => a.sortOrder - b.sortOrder);
    expect(pkg!.images.map((i) => i.url)).toEqual(expectedImages.map((i) => i.url));
    expect(pkg!.images.every((i) => i.credit)).toBe(true);

    const expectedDays = seedDetails.seedPackageItineraryDays.filter(mine).sort((a, b) => a.dayNumber - b.dayNumber);
    expect(pkg!.itinerary.map((d) => d.dayNumber)).toEqual(expectedDays.map((d) => d.dayNumber));

    const incl = (kind: "included" | "excluded") =>
      seedDetails.seedPackageInclusions
        .filter((i) => mine(i) && i.kind === kind)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((i) => i.text);
    expect(pkg!.inclusions.included).toEqual(incl("included"));
    expect(pkg!.inclusions.excluded).toEqual(incl("excluded"));
  });

  it("AC6: slug inexistente o draft → null", async () => {
    expect(await service.getPackageBySlug("no-existe")).toBeNull();
    expect(await service.getPackageBySlug(DRAFT_SLUG)).toBeNull();
  });

  it("AC7: paquete sin filas hijas devuelve listas vacías", async () => {
    const pkg = await service.getPackageBySlug("montana-de-colores");
    expect(pkg).not.toBeNull();
    expect(pkg!.images).toEqual([]);
    expect(pkg!.itinerary).toEqual([]);
    expect(pkg!.inclusions).toEqual({ included: [], excluded: [] });
  });

  it("AC8: solo scheduled y futuras, ordenadas, con cupo; la llena aparece con 0", async () => {
    const list = await service.getDepartures(DRAFT_ID);
    expect(list.map((d) => d.id)).toEqual([dep(2), dep(1)]);
    expect(list.map((d) => d.seatsLeft)).toEqual([0, 6]);
    expect(list.length).toBeLessThanOrEqual(8);
  });

  it("AC8: de machu-picchu-magico no devuelve salidas ajenas", async () => {
    const list = await service.getDepartures(mpmId());
    expect(list.every((d) => d.startsAt.getTime() > Date.now())).toBe(true);
  });

  it("AC9: cacheLife y cacheTag", async () => {
    await service.getPackageBySlug("machu-picchu-magico");
    expect(cache.cacheLife).toHaveBeenCalledWith("hours");
    expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.packages);

    vi.mocked(cache.cacheLife).mockClear();
    vi.mocked(cache.cacheTag).mockClear();
    await service.getDepartures(DRAFT_ID);
    expect(cache.cacheLife).toHaveBeenCalledWith("minutes");
    expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.departures);
  });
});

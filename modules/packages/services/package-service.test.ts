import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";

const { cacheLife, cacheTag } = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("package-service (db)", () => {
  const DRAFT_ID = "00000000-0000-4000-8000-0000000000d1";
  const DRAFT_SLUG = "test-draft-package-t4";

  let service: typeof import("./package-service");
  let dbModule: typeof import("@/lib/db");
  let cache: typeof import("next/cache");
  let seed: typeof import("@/lib/db/seed/data/packages");
  let seedBookings: typeof import("@/lib/db/seed/data/bookings");
  let seedHelpers: typeof import("@/lib/db/seed/helpers");

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./package-service");
    cache = await import("next/cache");
    seed = await import("@/lib/db/seed/data/packages");
    seedBookings = await import("@/lib/db/seed/data/bookings");
    seedHelpers = await import("@/lib/db/seed/helpers");

    const { db, packages } = dbModule;
    await db.delete(packages).where(eq(packages.id, DRAFT_ID));
    await db.insert(packages).values({
      id: DRAFT_ID,
      organizerId: seedHelpers.seedId("organizer:wayra"),
      destinationId: seedHelpers.seedId("destination:cusco"),
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
  });

  afterAll(async () => {
    const { db, packages } = dbModule;
    await db.delete(packages).where(eq(packages.id, DRAFT_ID));
  });

  beforeEach(() => {
    vi.mocked(cache.cacheLife).mockClear();
    vi.mocked(cache.cacheTag).mockClear();
  });

  it("AC5: respeta el limit y solo devuelve paquetes published (el draft no aparece)", async () => {
    const all = await service.getFeaturedPackages(100);
    expect(all.some((p) => p.slug === DRAFT_SLUG)).toBe(false);
    expect(all).toHaveLength(seed.seedPackages.length);

    const three = await service.getFeaturedPackages(3);
    expect(three).toHaveLength(3);
  });

  it("AC5: cada ítem trae destino y categorías ordenadas por nombre", async () => {
    const [first] = await service.getFeaturedPackages(1);
    expect(first.destination.slug).toBe("cusco");
    expect(first.destination.name).toBeTruthy();
    expect(first.destination.region).toBeTruthy();

    const all = await service.getFeaturedPackages(100);
    const catName = new Map(seed.seedCategories.map((c) => [c.id, c.name]));
    for (const p of all) {
      const expected = seed.seedPackageCategories
        .filter((pc) => pc.packageId === p.id)
        .map((pc) => catName.get(pc.categoryId)!)
        .sort((a, b) => a.localeCompare(b, "es"));
      const names = p.categories.map((c) => c.name);
      expect([...names].sort((a, b) => a.localeCompare(b, "es"))).toEqual(expected);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
    }
  });

  it("AC6: los 5 primeros son los más reservados del seed", async () => {
    const top = await service.getFeaturedPackages(5);
    // Conjunto: los 5 con más reservas confirmed.
    expect(top.map((p) => p.slug).sort()).toEqual(
      [
        "amazonia-tambopata",
        "canon-del-colca",
        "islas-ballestas",
        "machu-picchu-en-un-dia",
        "machu-picchu-magico",
      ].sort(),
    );
    // Orden interno: ORDER BY count DESC, created_at DESC, id ASC. El seed no fija
    // createdAt (comparten defaultNow()), así que desempata id ascendente.
    const confirmed = new Map<string, number>();
    for (const b of seedBookings.seedBookings) {
      if (b.status === "confirmed") {
        confirmed.set(b.packageId, (confirmed.get(b.packageId) ?? 0) + 1);
      }
    }
    const expected = [...top]
      .sort((a, b) => (confirmed.get(b.id) ?? 0) - (confirmed.get(a.id) ?? 0) || (a.id < b.id ? -1 : 1))
      .map((p) => p.slug);
    expect(top.map((p) => p.slug)).toEqual(expected);
  });

  it("AC6: reservas pending/cancelled no cuentan como más reservados", async () => {
    const all = await service.getFeaturedPackages(100);
    const idx = (slug: string) => all.findIndex((p) => p.slug === slug);
    for (const slug of ["montana-de-colores", "titicaca-islas-uros", "paracas-huacachina"]) {
      expect(idx(slug)).toBeGreaterThanOrEqual(5);
    }
  });

  it("AC6: limit inválido lanza", async () => {
    await expect(service.getFeaturedPackages(0)).rejects.toThrow();
    await expect(service.getFeaturedPackages(-1)).rejects.toThrow();
    await expect(service.getFeaturedPackages(1.5)).rejects.toThrow();
    await expect(service.getFeaturedPackages(Number.NaN)).rejects.toThrow();
  });

  it("AC6: el DTO es plano y serializable (sin Date)", async () => {
    const [first] = await service.getFeaturedPackages(1);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it("AC7: getCategories devuelve las 5 del seed ordenadas por nombre", async () => {
    const cats = await service.getCategories();
    expect(cats.map((c) => c.slug)).toEqual([
      "aventura",
      "cultura",
      "gastronomia",
      "naturaleza",
      "playas",
    ]);
    expect(cats.map((c) => c.name)).toEqual([
      "Aventura",
      "Cultura",
      "Gastronomía",
      "Naturaleza",
      "Playas",
    ]);
  });

  it("AC8: getFeaturedPackages declara cacheLife y cacheTag(packages)", async () => {
    await service.getFeaturedPackages(1);
    expect(cache.cacheLife).toHaveBeenCalledWith("hours");
    expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.packages);
  });

  it("AC8: getCategories declara cacheLife y cacheTag(categories)", async () => {
    await service.getCategories();
    expect(cache.cacheLife).toHaveBeenCalledWith("hours");
    expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.categories);
  });
});

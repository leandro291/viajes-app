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

  it("AC8/AC9: getSitemapPackages devuelve solo publicados, { slug, updatedAt } ordenado por slug", async () => {
    const list = await service.getSitemapPackages();
    expect(list.some((p) => p.slug === DRAFT_SLUG)).toBe(false);
    expect(list.map((p) => p.slug)).toEqual(seed.seedPackages.map((p) => p.slug).sort());
    for (const p of list) {
      expect(Object.keys(p).sort()).toEqual(["slug", "updatedAt"]);
      expect(p.updatedAt).toBeInstanceOf(Date);
    }
  });

  it("AC12: getSitemapPackages declara cacheLife y cacheTag(packages)", async () => {
    await service.getSitemapPackages();
    expect(cache.cacheLife).toHaveBeenCalledWith("hours");
    expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.packages);
  });

  describe("getPackages", () => {
    type Seeded = (typeof import("@/lib/db/seed/data/packages"))["seedPackages"][number];
    const isDay = (p: Seeded) => p.kind === "day_tour" || p.durationDays === 1;
    const sortedIds = (list: { id: string }[]) => list.map((p) => p.id).sort();
    const seedIds = (pred: (p: Seeded) => boolean) =>
      seed.seedPackages
        .filter(pred)
        .map((p) => p.id!)
        .sort();
    const inCategory = (slug: string) => {
      const categoryId = seedHelpers.seedId(`category:${slug}`);
      const withCat = new Set(
        seed.seedPackageCategories.filter((pc) => pc.categoryId === categoryId).map((pc) => pc.packageId),
      );
      return (p: Seeded) => withCat.has(p.id!);
    };
    const inDestination = (slug: string) => (p: Seeded) =>
      p.destinationId === seedHelpers.seedId(`destination:${slug}`);

    it("AC5: getPackages({}) devuelve todos los published y ningún draft", async () => {
      const all = await service.getPackages({});
      expect(all.some((p) => p.slug === DRAFT_SLUG)).toBe(false);
      expect(sortedIds(all)).toEqual(seedIds(() => true));
    });

    it("AC5: getPackages trae destino y categorías ordenadas por nombre", async () => {
      const all = await service.getPackages({});
      const catName = new Map(seed.seedCategories.map((c) => [c.id, c.name]));
      for (const p of all) {
        expect(p.destination.slug).toBeTruthy();
        expect(p.destination.name).toBeTruthy();
        expect(p.destination.region).toBeTruthy();
        const expected = seed.seedPackageCategories
          .filter((pc) => pc.packageId === p.id)
          .map((pc) => catName.get(pc.categoryId)!)
          .sort((a, b) => a.localeCompare(b, "es"));
        expect(p.categories.map((c) => c.name)).toEqual(expected);
      }
      expect(JSON.parse(JSON.stringify(all[0]))).toEqual(all[0]);
    });

    it("AC6: duracion devuelve los rangos 1 / 2-3 / 4-mas, disjuntos y completos", async () => {
      const one = await service.getPackages({ duracion: "1" });
      const mid = await service.getPackages({ duracion: "2-3" });
      const long = await service.getPackages({ duracion: "4-mas" });

      expect(sortedIds(one)).toEqual(seedIds(isDay));
      expect(sortedIds(mid)).toEqual(seedIds((p) => p.durationDays >= 2 && p.durationDays <= 3));
      expect(sortedIds(long)).toEqual(seedIds((p) => p.durationDays >= 4));

      const union = new Set([...one, ...mid, ...long].map((p) => p.id));
      expect(union.size).toBe(one.length + mid.length + long.length);
      expect(union.size).toBe(seed.seedPackages.length);
    });

    it("AC7: categoria devuelve solo los paquetes con esa categoría", async () => {
      for (const c of seed.seedCategories) {
        const res = await service.getPackages({ categoria: c.slug });
        expect(sortedIds(res)).toEqual(seedIds(inCategory(c.slug)));
        for (const p of res) expect(p.categories.map((x) => x.slug)).toContain(c.slug);
      }
    });

    it("AC7: destino devuelve solo los de ese destino", async () => {
      const cusco = await service.getPackages({ destino: "cusco" });
      expect(sortedIds(cusco)).toEqual(seedIds(inDestination("cusco")));
      const slugs = cusco.map((p) => p.slug);
      expect(slugs).toContain("machu-picchu-magico");
      expect(slugs).not.toContain("titicaca-islas-uros");
      expect(slugs).not.toContain(DRAFT_SLUG);
    });

    it("AC7: filtros combinados son AND y sin coincidencias devuelve []", async () => {
      const combo = await service.getPackages({
        destino: "cusco",
        categoria: "cultura",
        duracion: "2-3",
      });
      expect(sortedIds(combo)).toEqual(
        seedIds(
          (p) =>
            inDestination("cusco")(p) &&
            inCategory("cultura")(p) &&
            p.durationDays >= 2 &&
            p.durationDays <= 3,
        ),
      );
      expect(await service.getPackages({ destino: "no-existe" })).toEqual([]);
      expect(await service.getPackages({ categoria: "no-existe" })).toEqual([]);
      expect(await service.getPackages({ duracion: "1", categoria: "playas" })).toHaveLength(
        seedIds((p) => isDay(p) && inCategory("playas")(p)).length,
      );
    });

    it("AC8: sin orden sigue el ranking de más reservados de getFeaturedPackages", async () => {
      const all = await service.getPackages({});
      const featured = await service.getFeaturedPackages(100);
      expect(all.map((p) => p.slug)).toEqual(featured.map((p) => p.slug));
      const top5 = await service.getFeaturedPackages(5);
      expect(all.slice(0, 5).map((p) => p.slug).sort()).toEqual(top5.map((p) => p.slug).sort());
    });

    it("AC8: precio-asc / precio-desc ordenan por priceCents con empate por id asc", async () => {
      const asc = await service.getPackages({ orden: "precio-asc" });
      const desc = await service.getPackages({ orden: "precio-desc" });
      const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : 1);

      expect(asc.map((p) => p.id)).toEqual(
        [...asc].sort((a, b) => a.priceCents - b.priceCents || byId(a, b)).map((p) => p.id),
      );
      expect(desc.map((p) => p.id)).toEqual(
        [...desc].sort((a, b) => b.priceCents - a.priceCents || byId(a, b)).map((p) => p.id),
      );
      // El draft (S/ 1) lideraría precio-asc si se filtrara.
      expect(asc.some((p) => p.slug === DRAFT_SLUG)).toBe(false);
    });

    it("AC9: getPackages declara cacheLife y cacheTag(packages)", async () => {
      await service.getPackages({});
      expect(cache.cacheLife).toHaveBeenCalledWith("hours");
      expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.packages);
    });
  });
});

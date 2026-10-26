import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";
import {
  seedDestinationClimateMonths,
  seedDestinationFaqs,
  seedDestinations,
  seedDestinationSights,
} from "@/lib/db/seed/data/destinations";

const { cacheLife, cacheTag } = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

const EMPTY_ID = "00000000-0000-4000-8000-0000000d5e02";

describe.skipIf(!process.env.DATABASE_URL)("destination-detail-service (db)", () => {
  let getDestinationBySlug: typeof import("./destination-detail-service").getDestinationBySlug;
  let conn: typeof import("@/lib/db");

  beforeAll(async () => {
    conn = await import("@/lib/db");
    ({ getDestinationBySlug } = await import("./destination-detail-service"));
  });

  it("AC8: cada slug del seed devuelve destino, clima, lugares y preguntas ordenados", async () => {
    for (const seed of seedDestinations) {
      const result = await getDestinationBySlug(seed.slug);
      const sights = seedDestinationSights
        .filter((s) => s.destinationId === seed.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const faqs = seedDestinationFaqs
        .filter((f) => f.destinationId === seed.id)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const climate = seedDestinationClimateMonths
        .filter((c) => c.destinationId === seed.id)
        .sort((a, b) => a.month - b.month);

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        id: seed.id,
        slug: seed.slug,
        name: seed.name,
        region: seed.region,
        tagline: seed.tagline ?? null,
        description: seed.description ?? null,
        altitudeM: seed.altitudeM ?? null,
        bestSeasonText: seed.bestSeasonText ?? null,
        fromLimaText: seed.fromLimaText ?? null,
        howToGetText: seed.howToGetText ?? null,
        tipsText: seed.tipsText ?? null,
        heroImageUrl: seed.heroImageUrl ?? null,
      });
      expect(result!.climate).toEqual(climate.map((c) => ({ month: c.month, season: c.season })));
      expect(result!.sights).toEqual(
        sights.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          imageUrl: s.imageUrl,
          sortOrder: s.sortOrder,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
        })),
      );
      expect(result!.faqs).toEqual(
        faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
      );
    }
  });

  it("AC8: Cusco trae 12 meses, altitud y textos de detalle", async () => {
    const cusco = await getDestinationBySlug("cusco");
    expect(cusco!.climate.map((c) => c.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(cusco!.altitudeM).toBe(3399);
    expect(cusco!.howToGetText).toBeTruthy();
    expect(cusco!.tipsText).toBeTruthy();
  });

  it("AC8: slug inexistente devuelve null", async () => {
    expect(await getDestinationBySlug("no-existe")).toBeNull();
  });

  it("AC9: cacheLife hours y cacheTag destinations", async () => {
    cacheLife.mockClear();
    cacheTag.mockClear();
    await getDestinationBySlug("cusco");
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(CACHE_TAGS.destinations);
  });

  // Escribe en la BD (inserta y borra su fila): se identifica con [write].
  describe("[write] destino sin filas hijas", () => {
    beforeAll(async () => {
      await conn.db
        .insert(conn.destinations)
        .values({ id: EMPTY_ID, slug: "test-detalle-vacio", name: "Test vacío", region: "Test" })
        .onConflictDoNothing();
    });

    afterAll(async () => {
      await conn.db.delete(conn.destinations).where(eq(conn.destinations.id, EMPTY_ID));
    });

    it("AC8: devuelve climate, sights y faqs vacíos sin lanzar", async () => {
      const result = await getDestinationBySlug("test-detalle-vacio");
      expect(result).toMatchObject({ climate: [], sights: [], faqs: [], altitudeM: null });
    });
  });
});

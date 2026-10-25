import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";

const { cacheLife, cacheTag } = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("offer-service (db)", () => {
  const DRAFT_PKG_ID = "00000000-0000-4000-8000-0000000000d3";
  const DRAFT_PKG_SLUG = "test-draft-package-offers-t3";
  const EXPIRED_ID = "00000000-0000-4000-8000-0000000000e1";
  const NO_EXPIRY_ID = "00000000-0000-4000-8000-0000000000e2";
  const DRAFT_OFFER_ID = "00000000-0000-4000-8000-0000000000e3";
  const TEST_OFFER_IDS = [EXPIRED_ID, NO_EXPIRY_ID, DRAFT_OFFER_ID];

  let service: typeof import("./offer-service");
  let dbModule: typeof import("@/lib/db");
  let cache: typeof import("next/cache");
  let seedSchedule: typeof import("@/lib/db/seed/data/schedule");
  let seedPackages: typeof import("@/lib/db/seed/data/packages");
  let seedHelpers: typeof import("@/lib/db/seed/helpers");
  let pricing: typeof import("../utils/offer-pricing");

  // Primero las ofertas de prueba y luego el paquete (onDelete: restrict).
  async function cleanup() {
    const { db, offers, packages } = dbModule;
    await db.delete(offers).where(inArray(offers.id, TEST_OFFER_IDS));
    await db.delete(packages).where(eq(packages.id, DRAFT_PKG_ID));
  }

  beforeAll(async () => {
    dbModule = await import("@/lib/db");
    service = await import("./offer-service");
    cache = await import("next/cache");
    seedSchedule = await import("@/lib/db/seed/data/schedule");
    seedPackages = await import("@/lib/db/seed/data/packages");
    seedHelpers = await import("@/lib/db/seed/helpers");
    pricing = await import("../utils/offer-pricing");

    const { db, offers, packages } = dbModule;
    await cleanup();

    await db.insert(packages).values({
      id: DRAFT_PKG_ID,
      organizerId: seedHelpers.seedId("organizer:wayra"),
      destinationId: seedHelpers.seedId("destination:cusco"),
      kind: "package",
      slug: DRAFT_PKG_SLUG,
      title: "Borrador de prueba",
      blurb: "No debe verse",
      durationDays: 3,
      nights: 2,
      priceCents: 100,
      maxGroupSize: 10,
      languages: ["es"],
      status: "draft",
    });

    const base = {
      kind: "last_minute",
      discountType: "percent",
      discountValue: 10,
      isActive: true,
    } as const;
    const publishedPackageId = seedHelpers.seedId("package:machu-picchu-magico");
    await db.insert(offers).values([
      // Vencida sobre paquete publicado: excluida.
      {
        ...base,
        id: EXPIRED_ID,
        packageId: publishedPackageId,
        validUntil: new Date(Date.now() - 86_400_000),
      },
      // Activa sin vencimiento: incluida.
      { ...base, id: NO_EXPIRY_ID, packageId: publishedPackageId, validUntil: null },
      // Activa y vigente sobre paquete draft: excluida.
      { ...base, id: DRAFT_OFFER_ID, packageId: DRAFT_PKG_ID, validUntil: null },
    ]);
  });

  afterAll(async () => {
    await cleanup();
  });

  beforeEach(() => {
    vi.mocked(cache.cacheLife).mockClear();
    vi.mocked(cache.cacheTag).mockClear();
  });

  it("AC7: devuelve exactamente las activas, vigentes y de paquetes published", async () => {
    const now = Date.now();
    const publishedIds = new Set(
      seedPackages.seedPackages.filter((p) => p.status === "published").map((p) => p.id),
    );
    // Se calcula contra "ahora": el seed trae fechas fijas que pueden haber vencido.
    const expected = seedSchedule.seedOffers
      .filter(
        (o) =>
          o.isActive &&
          (o.validUntil == null || o.validUntil.getTime() > now) &&
          publishedIds.has(o.packageId),
      )
      .map((o) => o.id!)
      .sort();

    const result = await service.getActiveOffers();
    const ids = result.map((o) => o.id);

    expect(ids.filter((id) => !TEST_OFFER_IDS.includes(id)).sort()).toEqual(expected);
    expect(ids).toContain(NO_EXPIRY_ID);
    expect(ids).not.toContain(EXPIRED_ID);
    expect(ids).not.toContain(DRAFT_OFFER_ID);
    expect(result.some((o) => o.package.slug === DRAFT_PKG_SLUG)).toBe(false);
  });

  it("AC8: viene ordenado por compareOffers", async () => {
    const result = await service.getActiveOffers();
    expect(result.map((o) => o.id)).toEqual(
      [...result].sort(pricing.compareOffers).map((o) => o.id),
    );
  });

  it("AC8: cada ítem tiene la forma de OfferDto (validUntil ISO o null)", async () => {
    const result = await service.getActiveOffers();
    expect(result.length).toBeGreaterThan(0);

    for (const o of result) {
      expect(["last_minute", "rainy_season", "groups"]).toContain(o.kind);
      expect(["percent", "two_for_one"]).toContain(o.discountType);
      expect(Object.keys(o.package).sort()).toEqual([
        "coverImageUrl",
        "durationDays",
        "priceCents",
        "region",
        "slug",
        "title",
      ]);
      expect(o.package.region).toBeTruthy();
      if (o.validUntil !== null) {
        expect(new Date(o.validUntil).toISOString()).toBe(o.validUntil);
      }
    }

    expect(result.find((o) => o.id === NO_EXPIRY_ID)?.validUntil).toBeNull();
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it("AC9: declara cacheLife y cacheTag(offers, packages)", async () => {
    await service.getActiveOffers();
    expect(cache.cacheLife).toHaveBeenCalledWith("hours");
    expect(cache.cacheTag).toHaveBeenCalledWith(CACHE_TAGS.offers, CACHE_TAGS.packages);
  });
});

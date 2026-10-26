import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { seedDestinations } from "@/lib/db/seed/data/destinations";
import { seedPackages } from "@/lib/db/seed/data/packages";

const { cacheLife, cacheTag, detailSpy } = vi.hoisted(() => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  detailSpy: vi.fn(),
}));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));
vi.mock("./destination-detail-service", async (importOriginal) => {
  const original = await importOriginal<typeof import("./destination-detail-service")>();
  detailSpy.mockImplementation(original.getDestinationBySlug);
  return { getDestinationBySlug: detailSpy };
});

const NO_PACKAGES_ID = "00000000-0000-4000-8000-0000000d5e03";
const DRAFT_ONLY_ID = "00000000-0000-4000-8000-0000000d5e04";
const DRAFT_PACKAGE_ID = "00000000-0000-4000-8000-0000000d5e05";

describe.skipIf(!process.env.DATABASE_URL)("destination-page-service (db)", () => {
  let getDestinationPage: typeof import("./destination-page-service").getDestinationPage;
  let getPackages: typeof import("@/modules/packages").getPackages;
  let conn: typeof import("@/lib/db");

  beforeAll(async () => {
    conn = await import("@/lib/db");
    ({ getDestinationPage } = await import("./destination-page-service"));
    ({ getPackages } = await import("@/modules/packages"));
  });

  it("AC10: slug inválido devuelve null sin consultar la BD", async () => {
    detailSpy.mockClear();
    for (const slug of ["Cusco X", "", "a".repeat(101)]) {
      expect(await getDestinationPage(slug)).toBeNull();
    }
    expect(detailSpy).not.toHaveBeenCalled();
  });

  it("AC10: slug inexistente devuelve null", async () => {
    expect(await getDestinationPage("no-existe")).toBeNull();
  });

  it("AC10: cusco devuelve solo paquetes published y minPriceCents del seed", async () => {
    const cuscoId = seedDestinations.find((d) => d.slug === "cusco")!.id;
    const published = seedPackages.filter(
      (p) => p.destinationId === cuscoId && p.status === "published",
    );

    const page = await getDestinationPage("cusco");

    expect(page).not.toBeNull();
    expect(page!.destination.slug).toBe("cusco");
    expect(page!.packages).toEqual(await getPackages({ destino: "cusco" }));
    expect(page!.packages.map((p) => p.id).sort()).toEqual(published.map((p) => p.id).sort());
    expect(page!.minPriceCents).toBe(Math.min(...published.map((p) => p.priceCents)));
  });

  // Escriben en la BD (insertan y borran sus filas): se identifican con [write].
  describe("[write] destinos sin paquetes publicados", () => {
    beforeAll(async () => {
      await conn.db
        .insert(conn.destinations)
        .values([
          { id: NO_PACKAGES_ID, slug: "test-sin-paquetes-pg", name: "Test sin paquetes", region: "Test" },
          { id: DRAFT_ONLY_ID, slug: "test-solo-draft", name: "Test solo draft", region: "Test" },
        ])
        .onConflictDoNothing();
      await conn.db
        .insert(conn.packages)
        .values({
          id: DRAFT_PACKAGE_ID,
          organizerId: seedPackages[0].organizerId,
          destinationId: DRAFT_ONLY_ID,
          kind: "package",
          slug: "test-paquete-draft",
          title: "Test draft",
          blurb: "Test",
          durationDays: 1,
          nights: 0,
          priceCents: 1000,
          maxGroupSize: 2,
          languages: ["es"],
          status: "draft",
        })
        .onConflictDoNothing();
    });

    afterAll(async () => {
      await conn.db.delete(conn.packages).where(eq(conn.packages.id, DRAFT_PACKAGE_ID));
      await conn.db.delete(conn.destinations).where(eq(conn.destinations.id, DRAFT_ONLY_ID));
      await conn.db.delete(conn.destinations).where(eq(conn.destinations.id, NO_PACKAGES_ID));
    });

    it("AC10: destino sin paquetes devuelve null", async () => {
      expect(await getDestinationPage("test-sin-paquetes-pg")).toBeNull();
    });

    it("AC10: destino cuyo único paquete es draft devuelve null", async () => {
      expect(await getDestinationPage("test-solo-draft")).toBeNull();
    });
  });
});

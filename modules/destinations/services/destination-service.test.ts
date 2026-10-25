import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { CACHE_TAGS } from "@/lib/cache-tags";
import { seedPackages } from "@/lib/db/seed/data/packages";

const { cacheLife, cacheTag } = vi.hoisted(() => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("next/cache", () => ({ cacheLife, cacheTag }));

const EMPTY_ID = "00000000-0000-4000-8000-0000000d5e01";

describe.skipIf(!process.env.DATABASE_URL)("destination-service (db)", () => {
  let getDestinations: typeof import("./destination-service").getDestinations;
  let conn: typeof import("@/lib/db");

  beforeAll(async () => {
    conn = await import("@/lib/db");
    ({ getDestinations } = await import("./destination-service"));
    await conn.db
      .insert(conn.destinations)
      .values({ id: EMPTY_ID, slug: "test-sin-paquetes", name: "AAA Sin paquetes", region: "Test" })
      .onConflictDoNothing();
  });

  afterAll(async () => {
    await conn.db.delete(conn.destinations).where(eq(conn.destinations.id, EMPTY_ID));
  });

  it("AC7: minPriceCents y packageCount salen de los paquetes publicados del seed", async () => {
    const result = await getDestinations();
    const published = seedPackages.filter((p) => p.status === "published");

    for (const d of result) {
      const own = published.filter((p) => p.destinationId === d.id);
      expect(own.length).toBeGreaterThan(0);
      expect(d.packageCount).toBe(own.length);
      expect(d.minPriceCents).toBe(Math.min(...own.map((p) => p.priceCents)));
    }
    expect(result.length).toBe(new Set(published.map((p) => p.destinationId)).size);
  });

  it("AC7: orden packageCount desc, name asc", async () => {
    const result = await getDestinations();
    const sorted = [...result].sort(
      (a, b) => b.packageCount - a.packageCount || a.name.localeCompare(b.name, "es"),
    );
    expect(result.map((d) => d.id)).toEqual(sorted.map((d) => d.id));
  });

  it("AC7: excluye destinos sin paquetes publicados", async () => {
    const result = await getDestinations();
    expect(result.some((d) => d.id === EMPTY_ID)).toBe(false);
  });

  it("AC8: cacheLife y cacheTag con destinations y packages", async () => {
    cacheLife.mockClear();
    cacheTag.mockClear();
    await getDestinations();
    expect(cacheLife).toHaveBeenCalledWith("hours");
    expect(cacheTag).toHaveBeenCalledWith(CACHE_TAGS.destinations, CACHE_TAGS.packages);
  });
});

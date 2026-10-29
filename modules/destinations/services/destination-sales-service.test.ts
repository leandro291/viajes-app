import { and, eq, gte, lt } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";

const EMPTY = { from: new Date("1990-01-01T00:00:00Z"), to: new Date("1990-02-01T00:00:00Z") };
const WIDE = { from: new Date("2000-01-01T00:00:00Z"), to: new Date("2100-01-01T00:00:00Z") };

describe.skipIf(!process.env.DATABASE_URL)("destination-sales-service (db)", () => {
  let getTopDestinations: typeof import("./destination-sales-service").getTopDestinations;
  let conn: typeof import("@/lib/db");

  beforeAll(async () => {
    conn = await import("@/lib/db");
    ({ getTopDestinations } = await import("./destination-sales-service"));
  });

  it("AC7: rango vacío devuelve []", async () => {
    expect(await getTopDestinations(EMPTY)).toEqual([]);
  });

  it("AC7: rango amplio, máx. 5 filas, orden no creciente por reservas y solo confirmed", async () => {
    const result = await getTopDestinations(WIDE);
    expect(result.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].bookingsCount).toBeGreaterThanOrEqual(result[i].bookingsCount);
    }

    const { bookings, packages, db } = conn;
    const confirmed = await db
      .select({ destinationId: packages.destinationId })
      .from(bookings)
      .innerJoin(packages, eq(packages.id, bookings.packageId))
      .where(
        and(eq(bookings.status, "confirmed"), gte(bookings.createdAt, WIDE.from), lt(bookings.createdAt, WIDE.to)),
      );
    const byDest = new Map<string, number>();
    for (const c of confirmed) byDest.set(c.destinationId, (byDest.get(c.destinationId) ?? 0) + 1);
    for (const r of result) expect(r.bookingsCount).toBe(byDest.get(r.id));
  });
});

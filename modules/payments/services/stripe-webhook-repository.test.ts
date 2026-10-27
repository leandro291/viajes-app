import { describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("stripe-webhook-repository (db)", () => {
  it("AC16: claimEvent devuelve true la primera vez y false la segunda", async () => {
    const { eq } = await import("drizzle-orm");
    const { db, stripeEvents } = await import("@/lib/db");
    const { claimEvent } = await import("./stripe-webhook-repository");

    const id = `evt_test_${crypto.randomUUID()}`;
    try {
      const results = await db.transaction(async (tx) => [
        await claimEvent(tx, id, "charge.refunded"),
        await claimEvent(tx, id, "charge.refunded"),
      ]);
      expect(results).toEqual([true, false]);
    } finally {
      await db.delete(stripeEvents).where(eq(stripeEvents.id, id));
    }
  });

  it("AC16: reserveSeats suma pax si entra y no cambia nada si no", async () => {
    const { eq } = await import("drizzle-orm");
    const { db, departures, packages } = await import("@/lib/db");
    const { reserveSeats } = await import("./stripe-webhook-repository");

    const [pkg] = await db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.slug, "machu-picchu-magico"));
    const [departure] = await db
      .insert(departures)
      .values({ packageId: pkg.id, startsAt: new Date(Date.now() + 40 * 864e5), capacity: 5 })
      .returning({ id: departures.id });

    const seats = async () =>
      (await db.select({ n: departures.bookedSeats }).from(departures).where(eq(departures.id, departure.id)))[0].n;

    try {
      expect(await db.transaction((tx) => reserveSeats(tx, departure.id, 3))).toBe(true);
      expect(await seats()).toBe(3);
      expect(await db.transaction((tx) => reserveSeats(tx, departure.id, 3))).toBe(false);
      expect(await seats()).toBe(3);
      expect(await db.transaction((tx) => reserveSeats(tx, departure.id, 2))).toBe(true);
      expect(await seats()).toBe(5);
      expect(await db.transaction((tx) => reserveSeats(tx, departure.id, 1))).toBe(false);
      expect(await seats()).toBe(5);
    } finally {
      await db.delete(departures).where(eq(departures.id, departure.id));
    }
  });
});

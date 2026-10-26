import { describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("payment-service (db)", () => {
  it("AC13: inserta el payment pending y rechaza repetir el session id", async () => {
    const { eq } = await import("drizzle-orm");
    const { db, bookings, departures, packages, payments, users } = await import("@/lib/db");
    const { createPendingPayment } = await import("./payment-service");

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.clerkId, "seed_customer_01"));
    const [pkg] = await db
      .select({ id: packages.id, priceCents: packages.priceCents })
      .from(packages)
      .where(eq(packages.slug, "machu-picchu-magico"));

    const [departure] = await db
      .insert(departures)
      .values({ packageId: pkg.id, startsAt: new Date(Date.now() + 30 * 864e5), capacity: 10 })
      .returning({ id: departures.id });
    const [booking] = await db
      .insert(bookings)
      .values({
        customerId: user.id,
        packageId: pkg.id,
        departureId: departure.id,
        paxCount: 1,
        unitPriceCents: pkg.priceCents,
        discountCents: 0,
        totalCents: pkg.priceCents,
        exchangeRate: 3.75,
        contactEmail: "test@example.com",
        contactPhone: "+51987654321",
        termsAcceptedAt: new Date(),
      })
      .returning({ id: bookings.id });

    const sessionId = `cs_test_${booking.id}`;
    try {
      await createPendingPayment({
        bookingId: booking.id,
        amountUsdCents: 34400,
        stripeCheckoutSessionId: sessionId,
      });

      const rows = await db.select().from(payments).where(eq(payments.bookingId, booking.id));
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        provider: "stripe",
        method: "card",
        status: "pending",
        amountCents: 34400,
        currency: "USD",
        stripeCheckoutSessionId: sessionId,
        refundedCents: 0,
      });

      await expect(
        createPendingPayment({
          bookingId: booking.id,
          amountUsdCents: 34400,
          stripeCheckoutSessionId: sessionId,
        }),
      ).rejects.toThrow();
    } finally {
      await db.delete(payments).where(eq(payments.bookingId, booking.id));
      await db.delete(bookings).where(eq(bookings.id, booking.id));
      await db.delete(departures).where(eq(departures.id, departure.id));
    }
  });
});

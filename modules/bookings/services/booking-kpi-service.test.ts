import { and, gte, lt } from "drizzle-orm";
import { describe, expect, it } from "vitest";

// lib/db lanza al importarse sin DATABASE_URL: import dinámico dentro del bloque.
describe.skipIf(!process.env.DATABASE_URL)("booking-kpi-service (db)", () => {
  it("AC4-AC6: un rango en el pasado lejano da ceros y null", async () => {
    const { getBookingKpis } = await import("./booking-kpi-service");
    const kpis = await getBookingKpis({
      from: new Date("1990-01-01T00:00:00Z"),
      to: new Date("1990-02-01T00:00:00Z"),
    });
    expect(kpis).toEqual({
      confirmedCount: 0,
      revenueCents: 0,
      cancelledCount: 0,
      totalCount: 0,
      averageTicketCents: null,
      cancellationRate: null,
    });
  });

  it("AC4-AC6, AC10: un rango amplio coincide con una consulta independiente", async () => {
    const { getBookingKpis } = await import("./booking-kpi-service");
    const { bookings, db } = await import("@/lib/db");
    const range = { from: new Date("2000-01-01T00:00:00Z"), to: new Date("2100-01-01T00:00:00Z") };

    const rows = await db
      .select({ status: bookings.status, totalCents: bookings.totalCents })
      .from(bookings)
      .where(and(gte(bookings.createdAt, range.from), lt(bookings.createdAt, range.to)));
    const confirmed = rows.filter((r) => r.status === "confirmed");
    const revenue = confirmed.reduce((sum, r) => sum + r.totalCents, 0);

    const kpis = await getBookingKpis(range);
    expect(kpis.totalCount).toBe(rows.length);
    expect(kpis.confirmedCount).toBe(confirmed.length);
    expect(kpis.cancelledCount).toBe(rows.filter((r) => r.status === "cancelled").length);
    expect(kpis.revenueCents).toBe(revenue);
    expect(kpis.averageTicketCents).toBe(
      confirmed.length > 0 ? Math.round(revenue / confirmed.length) : null,
    );
  });

  it("AC4: respeta [from, to): to es exclusivo", async () => {
    const { getBookingKpis } = await import("./booking-kpi-service");
    const { bookings, db } = await import("@/lib/db");
    const [first] = await db.select({ at: bookings.createdAt }).from(bookings).limit(1);
    if (!first) return;

    const excluded = await getBookingKpis({ from: new Date(0), to: first.at });
    const included = await getBookingKpis({ from: new Date(0), to: new Date(first.at.getTime() + 1) });
    expect(included.totalCount).toBeGreaterThan(excluded.totalCount);
  });
});

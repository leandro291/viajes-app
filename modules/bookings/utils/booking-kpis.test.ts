import { describe, expect, it } from "vitest";
import { toBookingKpis } from "./booking-kpis";

const totals = (over: Partial<Parameters<typeof toBookingKpis>[0]> = {}) => ({
  confirmedCount: 0,
  revenueCents: 0,
  cancelledCount: 0,
  totalCount: 0,
  ...over,
});

describe("toBookingKpis", () => {
  it("AC5: ticket promedio redondeado a céntimos enteros", () => {
    expect(toBookingKpis(totals({ confirmedCount: 3, revenueCents: 10, totalCount: 3 })).averageTicketCents).toBe(3);
    expect(toBookingKpis(totals({ confirmedCount: 2, revenueCents: 258000, totalCount: 2 })).averageTicketCents).toBe(129000);
  });

  it("AC5, AC11: sin confirmadas el ticket promedio es null", () => {
    expect(toBookingKpis(totals({ cancelledCount: 1, totalCount: 2 })).averageTicketCents).toBeNull();
  });

  it("AC6: tasa de cancelación con 1 decimal", () => {
    expect(toBookingKpis(totals({ cancelledCount: 1, totalCount: 3 })).cancellationRate).toBe(33.3);
    expect(toBookingKpis(totals({ cancelledCount: 2, totalCount: 3 })).cancellationRate).toBe(66.7);
    expect(toBookingKpis(totals({ confirmedCount: 5, cancelledCount: 0, totalCount: 5 })).cancellationRate).toBe(0);
    expect(toBookingKpis(totals({ cancelledCount: 4, totalCount: 4 })).cancellationRate).toBe(100);
  });

  it("AC6, AC11: sin reservas la tasa es null", () => {
    expect(toBookingKpis(totals()).cancellationRate).toBeNull();
  });

  it("AC4, AC11: mes vacío conserva ingresos 0 sin NaN", () => {
    const kpis = toBookingKpis(totals());
    expect(kpis.revenueCents).toBe(0);
    expect(kpis.averageTicketCents).toBeNull();
    expect(kpis.cancellationRate).toBeNull();
  });

  it("AC4: conserva los totales de entrada", () => {
    const input = totals({ confirmedCount: 2, revenueCents: 5000, cancelledCount: 1, totalCount: 4 });
    expect(toBookingKpis(input)).toMatchObject(input);
  });
});

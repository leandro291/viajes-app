import type { BookingKpis, BookingKpiTotals } from "../types/booking-kpis";

export function toBookingKpis(totals: BookingKpiTotals): BookingKpis {
  const { confirmedCount, revenueCents, cancelledCount, totalCount } = totals;
  return {
    ...totals,
    averageTicketCents: confirmedCount > 0 ? Math.round(revenueCents / confirmedCount) : null,
    cancellationRate: totalCount > 0 ? Math.round((cancelledCount / totalCount) * 1000) / 10 : null,
  };
}

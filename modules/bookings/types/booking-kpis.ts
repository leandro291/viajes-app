export type BookingKpiTotals = {
  confirmedCount: number;
  /** sum(total_cents) de las reservas confirmed. */
  revenueCents: number;
  cancelledCount: number;
  /** pending + confirmed + cancelled. */
  totalCount: number;
};

export type BookingKpis = BookingKpiTotals & {
  /** Math.round(revenue / confirmed); null si confirmed = 0. */
  averageTicketCents: number | null;
  /** 0-100 con 1 decimal; null si total = 0. */
  cancellationRate: number | null;
};

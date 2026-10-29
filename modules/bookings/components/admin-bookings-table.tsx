"use client";

import type { BookingListQuery, BookingRowDto } from "../types/booking-list";
import { AdminCancelBookingButton } from "./admin-cancel-booking-button";
import { BookingsTable } from "./bookings-table";

// Referencia estable: entra en las deps del useMemo de columnas de BookingsTable.
function renderActions(row: BookingRowDto) {
  if (row.status !== "pending" && row.status !== "confirmed") return null;
  return <AdminCancelBookingButton code={row.code} status={row.status} />;
}

export function AdminBookingsTable({
  rows,
  query,
  basePath,
}: {
  rows: BookingRowDto[];
  query: BookingListQuery;
  basePath: string;
}) {
  return (
    <BookingsTable
      rows={rows}
      query={query}
      basePath={basePath}
      showOrganizer
      renderActions={renderActions}
    />
  );
}

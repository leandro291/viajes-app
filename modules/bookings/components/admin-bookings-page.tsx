import { requireRole } from "@/lib/auth/require-role";

import { listBookings } from "../services/booking-list-service";
import { parseBookingListParams } from "../utils/booking-list-params";
import { AdminBookingsTable } from "./admin-bookings-table";
import { BookingsListView } from "./bookings-list-view";

const BASE_PATH = "/admin/reservas";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function AdminBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  // El layout no bloquea: la guardia va aquí, antes de leer datos.
  await requireRole("admin");
  const query = parseBookingListParams(await searchParams);
  // Alcance literal: nunca derivado de la URL (parseBookingListParams descarta claves ajenas).
  const result = await listBookings({ all: true }, query);

  return (
    <BookingsListView
      result={result}
      query={query}
      basePath={BASE_PATH}
      emptyTitle="Aún no hay reservas"
      emptyText="Cuando un cliente reserve un paquete, aparecerá aquí."
      table={<AdminBookingsTable rows={result.rows} query={query} basePath={BASE_PATH} />}
    />
  );
}

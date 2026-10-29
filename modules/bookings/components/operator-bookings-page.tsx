import { getCurrentOrganizer } from "@/modules/organizers";

import { listBookings } from "../services/booking-list-service";
import { parseBookingListParams } from "../utils/booking-list-params";
import { BookingsListView, EmptyCard } from "./bookings-list-view";
import { BookingsTable } from "./bookings-table";

const BASE_PATH = "/operador/reservas";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function OperatorBookingsPage({ searchParams }: { searchParams: SearchParams }) {
  const query = parseBookingListParams(await searchParams);
  // El alcance sale de la sesión, nunca de la URL (D7).
  const organizer = await getCurrentOrganizer();

  if (!organizer) {
    return (
      <EmptyCard id="bookings-no-organizer" title="Aún no tienes un perfil de operador">
        <p className="mt-2 text-ink-muted">
          Cuando tu cuenta de operador esté creada, aquí verás las reservas de tus paquetes.
        </p>
      </EmptyCard>
    );
  }

  const result = await listBookings({ organizerId: organizer.id }, query);

  return (
    <BookingsListView
      result={result}
      query={query}
      basePath={BASE_PATH}
      emptyTitle="Aún no tienes reservas"
      emptyText="Cuando un cliente reserve uno de tus paquetes, aparecerá aquí."
      table={<BookingsTable rows={result.rows} query={query} basePath={BASE_PATH} />}
    />
  );
}

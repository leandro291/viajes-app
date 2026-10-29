import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { getCurrentOrganizer } from "@/modules/organizers";

import { listBookings } from "../services/booking-list-service";
import { buildBookingsHref, parseBookingListParams } from "../utils/booking-list-params";
import { BookingsPagination } from "./bookings-pagination";
import { BookingsStatusFilter } from "./bookings-status-filter";
import { BookingsTable } from "./bookings-table";

const BASE_PATH = "/operador/reservas";
const CARD = "rounded-card bg-surface p-6 shadow-card md:p-8";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function EmptyCard({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className={CARD}>
      <h2 id={id} className="text-lg font-bold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

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

  const { rows, total, page, pageCount } = await listBookings({ organizerId: organizer.id }, query);

  if (total === 0 && !query.estado) {
    return (
      <EmptyCard id="bookings-none" title="Aún no tienes reservas">
        <p className="mt-2 text-ink-muted">
          Cuando un cliente reserve uno de tus paquetes, aparecerá aquí.
        </p>
      </EmptyCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BookingsStatusFilter query={query} basePath={BASE_PATH} />
      {total === 0 ? (
        <EmptyCard id="bookings-filter-empty" title="No hay reservas con este estado">
          <Link
            href={buildBookingsHref(BASE_PATH, { ...query, estado: undefined, pagina: 1 })}
            className={buttonVariants({ variant: "outline", className: "mt-4" })}
          >
            Ver todas
          </Link>
        </EmptyCard>
      ) : (
        <>
          <BookingsTable rows={rows} query={query} basePath={BASE_PATH} />
          <BookingsPagination query={query} basePath={BASE_PATH} page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  );
}

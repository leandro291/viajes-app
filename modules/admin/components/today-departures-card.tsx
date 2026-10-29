import { useId } from "react";

import { formatDepartureTime } from "@/modules/packages";
import type { TodayDeparturesDto } from "@/modules/packages";

export function TodayDeparturesCard({ data }: { data: TodayDeparturesDto }) {
  const headingId = useId();
  const { departuresCount, travelersCount, items } = data;

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-card bg-surface p-6 shadow-card"
    >
      <h2
        id={headingId}
        className="font-display text-lg font-extrabold text-ink"
      >
        Salidas de hoy
      </h2>
      {departuresCount === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">No hay salidas hoy</p>
      ) : (
        <>
          <p className="mt-1 text-sm text-ink-muted">
            {departuresCount === 1 ? "1 salida" : `${departuresCount} salidas`}
            {" · "}
            {travelersCount === 1
              ? "1 viajero"
              : `${travelersCount} viajeros`}
          </p>
          <ul className="mt-4 divide-y divide-row-divider">
            {items.map((d) => (
              <li
                key={d.id}
                className="flex min-h-11 items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 items-baseline gap-3">
                  <span className="shrink-0 font-extrabold text-ink tabular-nums">
                    {formatDepartureTime(d.startsAt)}
                  </span>
                  <span className="line-clamp-2 min-w-0 break-words text-ink">
                    {d.packageTitle}
                  </span>
                </div>
                <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                  <span className="sr-only">Plazas ocupadas: </span>
                  {d.bookedSeats}/{d.capacity}
                </span>
              </li>
            ))}
          </ul>
          {items.length < departuresCount ? (
            <p className="mt-4 text-sm text-ink-muted">
              Mostrando {items.length} de {departuresCount} salidas
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}

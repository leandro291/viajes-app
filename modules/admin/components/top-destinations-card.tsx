import { useId } from "react";

import { formatPen } from "@/lib/money";
import type { TopDestinationDto } from "@/modules/destinations";

export function TopDestinationsCard({
  destinations,
}: {
  destinations: TopDestinationDto[];
}) {
  const headingId = useId();
  const max = Math.max(1, ...destinations.map((d) => d.bookingsCount));

  return (
    <section
      aria-labelledby={headingId}
      className="min-w-0 rounded-card bg-surface p-6 shadow-card"
    >
      <h2
        id={headingId}
        className="font-display text-lg font-extrabold text-ink"
      >
        Destinos más vendidos
      </h2>
      {destinations.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">Aún no hay ventas este mes</p>
      ) : (
        <ol className="mt-4 space-y-4">
          {destinations.map((d) => (
            <li key={d.id} className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="min-w-0 break-words font-bold text-ink">
                  {d.name}
                </span>
                <span className="text-sm text-ink-muted">
                  {d.bookingsCount === 1
                    ? "1 reserva"
                    : `${d.bookingsCount} reservas`}
                  {" · "}
                  <span className="font-bold text-ink">
                    {formatPen(d.revenueCents)}
                  </span>
                </span>
              </div>
              {/* Decorativa: la lista de texto es la vista equivalente. */}
              <div
                aria-hidden
                className="mt-2 h-2 rounded-full bg-sand-deep"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(d.bookingsCount / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

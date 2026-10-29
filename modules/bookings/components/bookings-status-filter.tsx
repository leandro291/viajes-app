import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BookingListQuery } from "../types/booking-list";
import { buildBookingsHref } from "../utils/booking-list-params";
import { BOOKING_STATUS_FILTERS } from "../utils/booking-list-view";

type BookingsStatusFilterProps = { query: BookingListQuery; basePath: string };

export function BookingsStatusFilter({ query, basePath }: BookingsStatusFilterProps) {
  return (
    <nav aria-label="Filtrar reservas por estado" className="flex flex-wrap gap-2">
      {BOOKING_STATUS_FILTERS.map(({ value, label }) => {
        const active = value === query.estado;
        // Conserva orden/dir; el filtro nuevo vuelve a la página 1.
        const href = buildBookingsHref(basePath, { ...query, estado: value, pagina: 1 });
        return (
          <Link
            key={label}
            href={href}
            aria-current={active ? "true" : undefined}
            className={cn(buttonVariants({ variant: active ? "default" : "outline" }))}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

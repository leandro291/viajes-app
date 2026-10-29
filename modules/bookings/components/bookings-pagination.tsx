import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { BookingListQuery } from "../types/booking-list";
import { buildBookingsHref } from "../utils/booking-list-params";

type BookingsPaginationProps = {
  query: BookingListQuery;
  basePath: string;
  page: number;
  pageCount: number;
};

export function BookingsPagination({ query, basePath, page, pageCount }: BookingsPaginationProps) {
  if (pageCount <= 1) return null;

  const control = (label: string, target: number, disabled: boolean) =>
    disabled ? (
      <span
        aria-disabled="true"
        className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none opacity-50")}
      >
        {label}
      </span>
    ) : (
      <Link
        href={buildBookingsHref(basePath, { ...query, pagina: target })}
        className={buttonVariants({ variant: "outline" })}
      >
        {label}
      </Link>
    );

  return (
    <nav aria-label="Paginación de reservas" className="flex items-center justify-between gap-3">
      {control("Anterior", page - 1, page <= 1)}
      <p className="text-sm text-muted-foreground">
        Página {page} de {pageCount}
      </p>
      {control("Siguiente", page + 1, page >= pageCount)}
    </nav>
  );
}

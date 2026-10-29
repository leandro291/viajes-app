import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";

import type { BookingListQuery, BookingListResult } from "../types/booking-list";
import { buildBookingsHref } from "../utils/booking-list-params";
import { BookingsPagination } from "./bookings-pagination";
import { BookingsStatusFilter } from "./bookings-status-filter";

const CARD = "rounded-card bg-surface p-6 shadow-card md:p-8";

export function EmptyCard({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <section aria-labelledby={id} className={CARD}>
      <h2 id={id} className="text-lg font-bold text-ink">
        {title}
      </h2>
      {children}
    </section>
  );
}

type BookingsListViewProps = {
  result: BookingListResult;
  query: BookingListQuery;
  basePath: string;
  emptyTitle: string;
  emptyText: string;
  table: ReactNode;
};

export function BookingsListView({ result, query, basePath, emptyTitle, emptyText, table }: BookingsListViewProps) {
  const { total, page, pageCount } = result;

  if (total === 0 && !query.estado) {
    return (
      <EmptyCard id="bookings-none" title={emptyTitle}>
        <p className="mt-2 text-ink-muted">{emptyText}</p>
      </EmptyCard>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BookingsStatusFilter query={query} basePath={basePath} />
      {total === 0 ? (
        <EmptyCard id="bookings-filter-empty" title="No hay reservas con este estado">
          <Link
            href={buildBookingsHref(basePath, { ...query, estado: undefined, pagina: 1 })}
            className={buttonVariants({ variant: "outline", className: "mt-4" })}
          >
            Ver todas
          </Link>
        </EmptyCard>
      ) : (
        <>
          {table}
          <BookingsPagination query={query} basePath={basePath} page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  );
}

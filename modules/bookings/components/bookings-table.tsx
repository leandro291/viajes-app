"use client";

import { Fragment, useMemo } from "react";
import Link from "next/link";
import {
  createColumnHelper,
  rowExpandingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDepartureShortDate, formatDepartureTime } from "@/lib/lima-date";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BookingListQuery, BookingRowDto, BookingSortKey } from "../types/booking-list";
import { buildBookingsHref, nextSortQuery } from "../utils/booking-list-params";
import { DOC_TYPE_LABELS, NO_PAYMENT_LABEL, PAYMENT_BADGE } from "../utils/booking-list-view";

type BookingsTableProps = { rows: BookingRowDto[]; query: BookingListQuery; basePath: string };

const features = tableFeatures({ rowExpandingFeature });
const helper = createColumnHelper<typeof features, BookingRowDto>();

function SortLink({
  label,
  sortKey,
  query,
  basePath,
}: {
  label: string;
  sortKey: BookingSortKey;
  query: BookingListQuery;
  basePath: string;
}) {
  const Icon = query.orden !== sortKey ? ArrowUpDown : query.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Link
      href={buildBookingsHref(basePath, nextSortQuery(query, sortKey))}
      className={cn(buttonVariants({ variant: "ghost" }), "-mx-2 font-medium")}
    >
      {label}
      <Icon aria-hidden />
    </Link>
  );
}

export function BookingsTable({ rows, query, basePath }: BookingsTableProps) {
  const columns = useMemo(
    () =>
      helper.columns([
        helper.display({
          id: "expandir",
          header: () => <span className="sr-only">Viajeros</span>,
          cell: ({ row }) => {
            const open = row.getIsExpanded();
            return (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-expanded={open}
                aria-controls={`travelers-${row.id}`}
                aria-label={`Ver viajeros de ${row.original.code}`}
                onClick={() => row.toggleExpanded()}
              >
                <ChevronRight aria-hidden className={cn(open && "rotate-90")} />
              </Button>
            );
          },
        }),
        helper.display({
          id: "codigo",
          header: () => <SortLink label="Código" sortKey="codigo" query={query} basePath={basePath} />,
          cell: ({ row }) => <span className="font-mono">{row.original.code}</span>,
        }),
        helper.display({
          id: "paquete",
          header: "Paquete",
          cell: ({ row }) => row.original.packageTitle,
        }),
        helper.display({
          id: "salida",
          header: () => <SortLink label="Salida" sortKey="salida" query={query} basePath={basePath} />,
          cell: ({ row }) => (
            <>
              {formatDepartureShortDate(row.original.departureStartsAt)} ·{" "}
              {formatDepartureTime(row.original.departureStartsAt)}
            </>
          ),
        }),
        helper.display({
          id: "cliente",
          header: "Cliente",
          cell: ({ row }) => (
            <>
              <span className="block font-medium">{row.original.customerName ?? "Sin nombre"}</span>
              <span className="block text-muted-foreground">{row.original.contactEmail}</span>
              <span className="block text-muted-foreground">{row.original.contactPhone}</span>
            </>
          ),
        }),
        helper.display({
          id: "viajeros",
          header: "Viajeros",
          cell: ({ row }) => row.original.paxCount,
        }),
        helper.display({
          id: "total",
          header: () => <SortLink label="Total" sortKey="total" query={query} basePath={basePath} />,
          cell: ({ row }) => formatPen(row.original.totalCents),
        }),
        helper.display({
          id: "reserva",
          header: "Reserva",
          cell: ({ row }) => <StatusBadge status={row.original.status} />,
        }),
        helper.display({
          id: "pago",
          header: "Pago",
          cell: ({ row }) => {
            const payment = row.original.paymentStatus;
            if (!payment) return NO_PAYMENT_LABEL;
            const { badge, label } = PAYMENT_BADGE[payment];
            return <StatusBadge status={badge} label={label} />;
          },
        }),
      ]),
    [query, basePath],
  );

  const table = useTable({
    features,
    columns,
    data: rows,
    getRowId: (row) => row.id,
    getRowCanExpand: () => true,
  });

  return (
    <Table>
      <TableCaption className="sr-only">Reservas de los paquetes</TableCaption>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                scope="col"
                aria-sort={
                  header.column.id === query.orden
                    ? query.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                <table.FlexRender header={header} />
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <Fragment key={row.id}>
            <TableRow>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
            {row.getIsExpanded() && (
              <TableRow id={`travelers-${row.id}`}>
                <TableCell colSpan={columns.length} className="whitespace-normal bg-muted/30">
                  {row.original.travelers.length === 0 ? (
                    <p className="text-muted-foreground">Sin viajeros registrados</p>
                  ) : (
                    <ul className="space-y-2">
                      {row.original.travelers.map((t) => (
                        <li key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-medium">
                            {t.firstName} {t.lastName}
                          </span>
                          {t.isPrimary && <span className="text-muted-foreground">Principal</span>}
                          <span className="text-muted-foreground">
                            {DOC_TYPE_LABELS[t.docType]} <span className="font-mono">{t.docNumber}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

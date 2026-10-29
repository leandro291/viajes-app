import { and, asc, count, desc, eq, inArray } from "drizzle-orm";

import {
  bookings,
  bookingTravelers,
  db,
  departures,
  organizers,
  packages,
  payments,
  users,
} from "@/lib/db";

import type {
  BookingListQuery,
  BookingListResult,
  BookingScope,
  BookingTravelerDto,
  PaymentStatus,
} from "../types/booking-list";
import { BOOKINGS_PAGE_SIZE } from "../utils/booking-list-params";
import { toBookingRowDto } from "../utils/booking-list-view";

const SORT_COLUMNS = {
  codigo: bookings.code,
  salida: departures.startsAt,
  total: bookings.totalCents,
} as const;

// Solo lectura, sin caché: datos personales y estado que cambia por webhook (D13).
// El organizerId viene de la sesión (getCurrentOrganizer), nunca del cliente (D7).
// No loguear los viajeros: traen doc_number completo.
// ponytail: offset + count por consulta; paginar por cursor si un operador acumula decenas de miles de reservas.
export async function listBookings(
  scope: BookingScope,
  query: BookingListQuery,
): Promise<BookingListResult> {
  const where = and(
    "organizerId" in scope ? eq(packages.organizerId, scope.organizerId) : undefined,
    query.estado ? eq(bookings.status, query.estado) : undefined,
  );

  const [{ total }] = await db
    .select({ total: count() })
    .from(bookings)
    .innerJoin(packages, eq(packages.id, bookings.packageId))
    .where(where);

  const pageCount = Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE));
  const page = Math.min(query.pagina, pageCount);
  const dir = query.dir === "asc" ? asc : desc;

  const rows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      packageTitle: packages.title,
      organizerName: organizers.businessName,
      departureStartsAt: departures.startsAt,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      contactEmail: bookings.contactEmail,
      contactPhone: bookings.contactPhone,
      paxCount: bookings.paxCount,
      totalCents: bookings.totalCents,
      status: bookings.status,
    })
    .from(bookings)
    .innerJoin(packages, eq(packages.id, bookings.packageId))
    .innerJoin(organizers, eq(organizers.id, packages.organizerId))
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .innerJoin(users, eq(users.id, bookings.customerId))
    .where(where)
    .orderBy(dir(SORT_COLUMNS[query.orden]), dir(bookings.id))
    .limit(BOOKINGS_PAGE_SIZE)
    .offset((page - 1) * BOOKINGS_PAGE_SIZE);

  if (rows.length === 0) return { rows: [], total, page, pageCount };

  // Solo los ids de la página ya filtrada por alcance (AC12).
  const ids = rows.map((r) => r.id);
  const [travelerRows, paymentRows] = await Promise.all([
    db
      .select({
        id: bookingTravelers.id,
        bookingId: bookingTravelers.bookingId,
        firstName: bookingTravelers.firstName,
        lastName: bookingTravelers.lastName,
        docType: bookingTravelers.docType,
        docNumber: bookingTravelers.docNumber,
        isPrimary: bookingTravelers.isPrimary,
      })
      .from(bookingTravelers)
      .where(inArray(bookingTravelers.bookingId, ids))
      // ponytail: la tabla no tiene created_at; `id` solo da un orden estable, no cronológico.
      .orderBy(desc(bookingTravelers.isPrimary), bookingTravelers.id),
    db
      .select({ bookingId: payments.bookingId, status: payments.status })
      .from(payments)
      .where(inArray(payments.bookingId, ids))
      .orderBy(desc(payments.createdAt)),
  ]);

  const travelersByBooking = new Map<string, BookingTravelerDto[]>();
  for (const { bookingId, ...traveler } of travelerRows) {
    const list = travelersByBooking.get(bookingId) ?? [];
    list.push(traveler);
    travelersByBooking.set(bookingId, list);
  }

  // ordenados por created_at desc: el primero de cada reserva es el último pago (D9).
  const latestPayment = new Map<string, PaymentStatus>();
  for (const p of paymentRows) {
    if (!latestPayment.has(p.bookingId)) latestPayment.set(p.bookingId, p.status);
  }

  return {
    rows: rows.map((r) =>
      toBookingRowDto(r, travelersByBooking.get(r.id) ?? [], latestPayment.get(r.id) ?? null),
    ),
    total,
    page,
    pageCount,
  };
}

import { desc, eq, inArray } from "drizzle-orm";

import { bookings, db, departures, destinations, packages, payments } from "@/lib/db";

import type { MyBookingDto, MyBookingPayment } from "../types/my-bookings";
import { toMyBookingDto } from "../utils/my-bookings";

// Solo lectura, sin caché: estado y cobro cambian por webhook y por cancelación.
// Dos consultas (reservas + pagos de esos ids), sin N+1.
// ponytail: sin paginación; paginar si un cliente pasa de unas decenas de reservas.
export async function getMyBookings(
  customerId: string,
  now: Date = new Date(),
): Promise<MyBookingDto[]> {
  const rows = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      status: bookings.status,
      paxCount: bookings.paxCount,
      totalCents: bookings.totalCents,
      startsAt: departures.startsAt,
      departureStatus: departures.status,
      slug: packages.slug,
      title: packages.title,
      coverImageUrl: packages.coverImageUrl,
      destinationName: destinations.name,
    })
    .from(bookings)
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .innerJoin(packages, eq(packages.id, bookings.packageId))
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(eq(bookings.customerId, customerId));
  if (rows.length === 0) return [];

  const paymentRows = await db
    .select({
      bookingId: payments.bookingId,
      status: payments.status,
      amountCents: payments.amountCents,
    })
    .from(payments)
    .where(
      inArray(
        payments.bookingId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(desc(payments.createdAt));

  // Ordenados por created_at DESC: el primero por reserva es el último pago.
  const latest = new Map<string, MyBookingPayment>();
  for (const p of paymentRows) {
    if (!latest.has(p.bookingId)) latest.set(p.bookingId, p);
  }

  return rows.map((r) => toMyBookingDto(r, latest.get(r.id) ?? null, now));
}

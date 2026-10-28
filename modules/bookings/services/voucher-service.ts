import { and, desc, eq } from "drizzle-orm";

import {
  bookings,
  bookingTravelers,
  db,
  departures,
  destinations,
  packages,
  payments,
} from "@/lib/db";

import type { BookingVoucherDto } from "../types/voucher";
import { isBookingCode, toVoucherDto } from "../utils/voucher";

// Solo lectura, sin caché: estado y cobro cambian por webhook (D8).
// Un único WHERE code AND customer_id: reserva ajena e inexistente dan lo mismo (D1).
export async function getBookingVoucher(
  code: string,
  customerId: string,
): Promise<BookingVoucherDto | null> {
  if (!isBookingCode(code)) return null;

  const [row] = await db
    .select({
      id: bookings.id,
      code: bookings.code,
      status: bookings.status,
      paxCount: bookings.paxCount,
      totalCents: bookings.totalCents,
      startsAt: departures.startsAt,
      slug: packages.slug,
      title: packages.title,
      coverImageUrl: packages.coverImageUrl,
      durationDays: packages.durationDays,
      nights: packages.nights,
      meetingPoint: packages.meetingPoint,
      meetingLat: packages.meetingLat,
      meetingLng: packages.meetingLng,
      destinationName: destinations.name,
    })
    .from(bookings)
    .innerJoin(departures, eq(departures.id, bookings.departureId))
    .innerJoin(packages, eq(packages.id, bookings.packageId))
    .innerJoin(destinations, eq(destinations.id, packages.destinationId))
    .where(and(eq(bookings.code, code), eq(bookings.customerId, customerId)))
    .limit(1);
  if (!row) return null;

  const [travelers, [payment]] = await Promise.all([
    db
      .select({
        firstName: bookingTravelers.firstName,
        lastName: bookingTravelers.lastName,
        docType: bookingTravelers.docType,
        docNumber: bookingTravelers.docNumber,
        isPrimary: bookingTravelers.isPrimary,
      })
      .from(bookingTravelers)
      .where(eq(bookingTravelers.bookingId, row.id))
      .orderBy(desc(bookingTravelers.isPrimary)),
    db
      .select({ status: payments.status, amountCents: payments.amountCents })
      .from(payments)
      .where(eq(payments.bookingId, row.id))
      .orderBy(desc(payments.createdAt))
      .limit(1),
  ]);

  // toVoucherDto enmascara el documento (D9): las filas crudas no salen de aquí.
  return toVoucherDto(row, travelers, payment ?? null);
}

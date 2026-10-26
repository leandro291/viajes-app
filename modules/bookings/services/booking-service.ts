import { and, eq, sql } from "drizzle-orm";

import { bookings, bookingTravelers, db } from "@/lib/db";
import { getBookableDeparture } from "@/modules/packages";

import { BookingError } from "../types/booking";
import type { CreatedBooking, NewBookingInput } from "../types/booking";

// Verifica cupo (no lo descuenta: lo hace el webhook, D6) y escribe booking + viajero principal
// en una sola transacción. Pueden coexistir varios `pending` por la misma plaza.
export async function createPendingBooking(input: NewBookingInput): Promise<CreatedBooking> {
  const { customerId, departureId, paxCount, amount, contact, traveler } = input;

  const departure = await getBookableDeparture(departureId);
  if (!departure) throw new BookingError("departure_unavailable");
  if (departure.seatsLeft < paxCount) {
    throw new BookingError("insufficient_seats", departure.seatsLeft);
  }

  return db.transaction(async (tx) => {
    const [booking] = await tx
      .insert(bookings)
      .values({
        customerId,
        packageId: departure.package.id,
        departureId,
        offerId: amount.offerId,
        status: "pending",
        paxCount,
        unitPriceCents: amount.unitPriceCents,
        discountCents: amount.discountCents,
        totalCents: amount.totalCents,
        currency: "PEN",
        exchangeRate: amount.exchangeRate,
        contactEmail: contact.email,
        contactPhone: contact.phone,
        termsAcceptedAt: sql`now()`,
      })
      .returning({ id: bookings.id, code: bookings.code });

    await tx.insert(bookingTravelers).values({
      bookingId: booking.id,
      firstName: traveler.firstName,
      lastName: traveler.lastName,
      docType: traveler.docType,
      docNumber: traveler.docNumber,
      isPrimary: true,
    });

    return booking;
  });
}

// Compensación (D4): solo pasa `pending` -> `cancelled`. true si actualizó.
export async function cancelPendingBooking(bookingId: string): Promise<boolean> {
  const rows = await db
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: sql`now()` })
    .where(and(eq(bookings.id, bookingId), eq(bookings.status, "pending")))
    .returning({ id: bookings.id });
  return rows.length > 0;
}

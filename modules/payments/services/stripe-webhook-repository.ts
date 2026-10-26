import { and, eq, sql } from "drizzle-orm";

import { bookings, db, departures, payments, stripeEvents } from "@/lib/db";

// Consultas de la transacción del webhook de Stripe: todas reciben el `tx` de `db.transaction`.
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PaymentRow = {
  id: string;
  bookingId: string;
  status: (typeof payments.$inferSelect)["status"];
  amountCents: number;
  refundedCents: number;
};

export type LockedBooking = {
  id: string;
  status: (typeof bookings.$inferSelect)["status"];
  departureId: string;
  paxCount: number;
};

const paymentColumns = {
  id: payments.id,
  bookingId: payments.bookingId,
  status: payments.status,
  amountCents: payments.amountCents,
  refundedCents: payments.refundedCents,
};

// true = primera vez que se ve el evento; false = ya estaba registrado.
export async function claimEvent(tx: Tx, id: string, type: string): Promise<boolean> {
  const rows = await tx
    .insert(stripeEvents)
    .values({ id, type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  return rows.length > 0;
}

export async function lockBooking(tx: Tx, bookingId: string): Promise<LockedBooking | undefined> {
  const [row] = await tx
    .select({
      id: bookings.id,
      status: bookings.status,
      departureId: bookings.departureId,
      paxCount: bookings.paxCount,
    })
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .for("update");
  return row;
}

export async function findPaymentBySession(tx: Tx, sessionId: string): Promise<PaymentRow | undefined> {
  const [row] = await tx
    .select(paymentColumns)
    .from(payments)
    .where(eq(payments.stripeCheckoutSessionId, sessionId));
  return row;
}

export async function findPaymentByIntent(tx: Tx, paymentIntentId: string): Promise<PaymentRow | undefined> {
  const [row] = await tx
    .select(paymentColumns)
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, paymentIntentId));
  return row;
}

// Único con guarda de cupo: false si la salida no tiene plazas para `pax`.
export async function reserveSeats(tx: Tx, departureId: string, pax: number): Promise<boolean> {
  const rows = await tx
    .update(departures)
    .set({ bookedSeats: sql`${departures.bookedSeats} + ${pax}` })
    .where(
      and(
        eq(departures.id, departureId),
        sql`${departures.bookedSeats} + ${pax} <= ${departures.capacity}`,
      ),
    )
    .returning({ id: departures.id });
  return rows.length > 0;
}

export async function confirmBooking(tx: Tx, bookingId: string): Promise<void> {
  await tx.update(bookings).set({ status: "confirmed" }).where(eq(bookings.id, bookingId));
}

export async function cancelBooking(tx: Tx, bookingId: string): Promise<void> {
  await tx
    .update(bookings)
    .set({ status: "cancelled", cancelledAt: sql`now()` })
    .where(eq(bookings.id, bookingId));
}

export async function markPaymentSucceeded(tx: Tx, paymentId: string, paymentIntentId: string): Promise<void> {
  await tx
    .update(payments)
    .set({ status: "succeeded", stripePaymentIntentId: paymentIntentId, paidAt: sql`now()` })
    .where(eq(payments.id, paymentId));
}

export async function markPaymentRefundedInFull(
  tx: Tx,
  paymentId: string,
  paymentIntentId: string,
): Promise<void> {
  await tx
    .update(payments)
    .set({
      status: "refunded",
      refundedCents: sql`${payments.amountCents}`,
      stripePaymentIntentId: paymentIntentId,
      paidAt: sql`now()`,
    })
    .where(eq(payments.id, paymentId));
}

export async function markPaymentFailed(tx: Tx, paymentId: string): Promise<void> {
  await tx.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
}

export async function setPaymentRefunded(
  tx: Tx,
  paymentId: string,
  refundedCents: number,
  status: "refunded" | "partially_refunded",
): Promise<void> {
  await tx.update(payments).set({ status, refundedCents }).where(eq(payments.id, paymentId));
}

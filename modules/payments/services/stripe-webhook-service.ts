import { db } from "@/lib/db";
import {
  getStripe,
  type StripeCharge,
  type StripeCheckoutSession,
  type StripeEvent,
} from "@/lib/stripe";

import {
  cancelBooking,
  claimEvent,
  confirmBooking,
  findPaymentByIntent,
  findPaymentBySession,
  lockBooking,
  markPaymentFailed,
  markPaymentRefundedInFull,
  markPaymentSucceeded,
  reserveSeats,
  setPaymentRefunded,
  type Tx,
} from "./stripe-webhook-repository";

const HANDLED = ["checkout.session.completed", "checkout.session.expired", "charge.refunded"];

const idOf = (ref: string | { id: string } | null | undefined) =>
  typeof ref === "string" ? ref : (ref?.id ?? null);

// Un evento = una transacción: claimEvent -> lógica del tipo -> (reembolso) -> commit. Lanzar = rollback.
export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  if (!HANDLED.includes(event.type)) return;

  await db.transaction(async (tx) => {
    if (!(await claimEvent(tx, event.id, event.type))) return;

    switch (event.type) {
      case "checkout.session.completed":
        return onCompleted(tx, event.id, event.data.object as StripeCheckoutSession);
      case "checkout.session.expired":
        return onExpired(tx, event.data.object as StripeCheckoutSession);
      case "charge.refunded":
        return onChargeRefunded(tx, event.id, event.data.object as StripeCharge);
    }
  });
}

function bookingIdOf(session: StripeCheckoutSession): string | null {
  return session.metadata?.booking_id || session.client_reference_id || null;
}

async function onCompleted(tx: Tx, eventId: string, session: StripeCheckoutSession): Promise<void> {
  if (session.payment_status !== "paid") return;

  const bookingId = bookingIdOf(session);
  if (!bookingId) {
    console.error(`[stripe-webhook] ${eventId} session ${session.id}: sin booking_id, se ignora`);
    return;
  }

  const booking = await lockBooking(tx, bookingId);
  if (!booking) throw new Error(`[stripe-webhook] ${eventId}: booking ${bookingId} inexistente`);

  const payment = await findPaymentBySession(tx, session.id);
  if (!payment) throw new Error(`[stripe-webhook] ${eventId}: sin payment para la session ${session.id}`);
  if (["succeeded", "refunded", "partially_refunded"].includes(payment.status)) return;

  const paymentIntentId = idOf(session.payment_intent);
  if (!paymentIntentId) {
    throw new Error(`[stripe-webhook] ${eventId}: session ${session.id} pagada sin payment_intent`);
  }

  if (booking.status === "pending" && (await reserveSeats(tx, booking.departureId, booking.paxCount))) {
    await markPaymentSucceeded(tx, payment.id, paymentIntentId);
    await confirmBooking(tx, booking.id);
    return;
  }
  if (booking.status === "confirmed") return;

  // Sin cupo o booking ya cancelado: reembolso total (D2, D3).
  await markPaymentRefundedInFull(tx, payment.id, paymentIntentId);
  if (booking.status === "pending") await cancelBooking(tx, booking.id);
  await getStripe().refunds.create(
    { payment_intent: paymentIntentId },
    { idempotencyKey: `refund-no-seat:${payment.id}` },
  );
}

async function onExpired(tx: Tx, session: StripeCheckoutSession): Promise<void> {
  const bookingId = bookingIdOf(session);
  if (!bookingId) return;

  const booking = await lockBooking(tx, bookingId);
  if (booking?.status !== "pending") return;

  await cancelBooking(tx, booking.id);
  const payment = await findPaymentBySession(tx, session.id);
  if (payment?.status === "pending") await markPaymentFailed(tx, payment.id);
}

async function onChargeRefunded(tx: Tx, eventId: string, charge: StripeCharge): Promise<void> {
  const paymentIntentId = idOf(charge.payment_intent);
  if (!paymentIntentId) {
    console.error(`[stripe-webhook] ${eventId} charge ${charge.id}: sin payment_intent, se ignora`);
    return;
  }

  const payment = await findPaymentByIntent(tx, paymentIntentId);
  if (!payment) throw new Error(`[stripe-webhook] ${eventId}: sin payment para ${paymentIntentId}`);

  const refundedCents = Math.max(payment.refundedCents, Math.min(charge.amount_refunded, payment.amountCents));
  if (refundedCents <= 0 || refundedCents === payment.refundedCents) return;

  await setPaymentRefunded(
    tx,
    payment.id,
    refundedCents,
    refundedCents >= payment.amountCents ? "refunded" : "partially_refunded",
  );
}

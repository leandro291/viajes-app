import { and, desc, eq, isNotNull, sql, type SQL } from "drizzle-orm";

import { bookings, db, departures, payments } from "@/lib/db";
import { expireCheckoutSession, refundPaymentIntent } from "@/modules/payments";

import type { CancelErrorCode, CancelResult } from "../types/cancellation";
import { adminCancelBlock, cancelBlock } from "../utils/cancellation";
import { isBookingCode } from "../utils/voucher";

// Rollback de la transacción cuando Stripe falla (D3): se captura fuera de ella.
// Conserva la causa original (`cause`) para diagnóstico.
class RefundFailed extends Error {}

type CancelPolicy = {
  block: (i: {
    status: "pending" | "confirmed";
    departureStatus: "scheduled" | "en_route" | "completed" | "cancelled";
    startsAt: Date;
  }) => CancelErrorCode | null;
};

// Núcleo compartido (D4): una transacción con candado de fila (D3); Stripe va al final.
// `filter` identifica la reserva; la política decide qué se puede cancelar.
// ponytail: llamada de red con la fila bloqueada; aceptable al volumen de v1.
async function cancelWhere(filter: SQL, policy: CancelPolicy): Promise<CancelResult> {
  // Sesiones de Checkout de pagos pending cancelados: se expiran tras el commit.
  const sessionsToExpire: string[] = [];

  let result: CancelResult;
  try {
    result = await db.transaction(async (tx): Promise<CancelResult> => {
      const [booking] = await tx
        .select({
          id: bookings.id,
          status: bookings.status,
          paxCount: bookings.paxCount,
          departureId: bookings.departureId,
        })
        .from(bookings)
        .where(filter)
        .for("update");
      if (!booking) return { ok: false, code: "not_found" };

      // D7: doble clic / reintento = éxito idempotente, sin Stripe.
      if (booking.status === "cancelled") {
        return { ok: true, alreadyCancelled: true, refundedUsdCents: 0 };
      }

      const [departure] = await tx
        .select({ status: departures.status, startsAt: departures.startsAt })
        .from(departures)
        .where(eq(departures.id, booking.departureId));
      if (!departure) return { ok: false, code: "not_found" };

      const block = policy.block({
        status: booking.status,
        departureStatus: departure.status,
        startsAt: departure.startsAt,
      });
      if (block) return { ok: false, code: block };

      // Pending: sin cobro ni cupo (se descuenta al confirmar). Pagos pending -> failed.
      if (booking.status === "pending") {
        await tx
          .update(bookings)
          .set({ status: "cancelled", cancelledAt: sql`now()` })
          .where(eq(bookings.id, booking.id));
        const failed = await tx
          .update(payments)
          .set({ status: "failed" })
          .where(and(eq(payments.bookingId, booking.id), eq(payments.status, "pending")))
          .returning({ session: payments.stripeCheckoutSessionId });
        for (const { session } of failed) if (session) sessionsToExpire.push(session);
        return { ok: true, alreadyCancelled: false, refundedUsdCents: 0 };
      }

      // D6: primero el último pago con pi_…, después se valida su estado.
      const [payment] = await tx
        .select({
          id: payments.id,
          status: payments.status,
          amountCents: payments.amountCents,
          intentId: payments.stripePaymentIntentId,
        })
        .from(payments)
        .where(
          and(
            eq(payments.bookingId, booking.id),
            isNotNull(payments.stripePaymentIntentId),
          ),
        )
        .orderBy(desc(payments.createdAt))
        .limit(1);
      if (!payment?.intentId || (payment.status !== "succeeded" && payment.status !== "refunded")) {
        return { ok: false, code: "no_refundable_payment" };
      }

      // D8: absoluto, no incremental. GREATEST evita violar el check ante datos inconsistentes.
      await tx
        .update(departures)
        .set({ bookedSeats: sql`greatest(${departures.bookedSeats} - ${booking.paxCount}, 0)` })
        .where(eq(departures.id, booking.departureId));
      await tx
        .update(bookings)
        .set({ status: "cancelled", cancelledAt: sql`now()` })
        .where(eq(bookings.id, booking.id));
      await tx
        .update(payments)
        .set({ status: "refunded", refundedCents: payment.amountCents })
        .where(eq(payments.id, payment.id));

      // Último paso (D3/D4). `refunded` = el webhook ganó la carrera: sin Stripe.
      if (payment.status === "succeeded") {
        try {
          await refundPaymentIntent(payment.intentId, `refund-cancel:${payment.id}`);
        } catch (error) {
          // Solo tipo/código de Stripe e id del pago: nunca datos personales.
          const { type, code } = error as { type?: string; code?: string };
          console.error("refund failed", { paymentId: payment.id, type, code });
          throw new RefundFailed("refund failed", { cause: error });
        }
      }

      return { ok: true, alreadyCancelled: false, refundedUsdCents: payment.amountCents };
    });
  } catch (error) {
    if (error instanceof RefundFailed) return { ok: false, code: "refund_failed" };
    throw error;
  }

  // Post-commit, mejor esfuerzo (no lanza): el cliente ya no puede pagar la reserva cancelada.
  await Promise.all(sessionsToExpire.map((session) => expireCheckoutSession(session)));
  return result;
}

// Cliente: un único WHERE code AND customer_id (ajena e inexistente dan lo mismo),
// ventana de 48 h y solo confirmed + scheduled.
export async function cancelBooking(
  code: string,
  customerId: string,
  now: Date = new Date(),
): Promise<CancelResult> {
  if (!isBookingCode(code)) return { ok: false, code: "not_found" };
  return cancelWhere(and(eq(bookings.code, code), eq(bookings.customerId, customerId))!, {
    block: (i) =>
      cancelBlock(
        { status: i.status, departureStatus: i.departureStatus, startsAt: i.startsAt },
        now,
      ),
  });
}

// Admin (D2): cualquier cliente, pending o confirmed, sin ventana.
export async function cancelBookingAsAdmin(code: string): Promise<CancelResult> {
  if (!isBookingCode(code)) return { ok: false, code: "not_found" };
  return cancelWhere(eq(bookings.code, code), {
    block: (i) => adminCancelBlock({ status: i.status, departureStatus: i.departureStatus }),
  });
}

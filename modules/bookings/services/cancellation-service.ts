import { and, desc, eq, isNotNull, sql } from "drizzle-orm";

import { bookings, db, departures, payments } from "@/lib/db";
import { refundPaymentIntent } from "@/modules/payments";

import type { CancelResult } from "../types/cancellation";
import { cancelBlock } from "../utils/cancellation";
import { isBookingCode } from "../utils/voucher";

// Rollback de la transacción cuando Stripe falla (D3): se captura fuera de ella.
// Conserva la causa original (`cause`) para diagnóstico.
class RefundFailed extends Error {}

// Escritura, sin caché. Una transacción con candado de fila (D3); Stripe va al final.
// Un único WHERE code AND customer_id: reserva ajena e inexistente dan lo mismo.
// ponytail: llamada de red con la fila bloqueada; aceptable al volumen de v1.
export async function cancelBooking(
  code: string,
  customerId: string,
  now: Date = new Date(),
): Promise<CancelResult> {
  if (!isBookingCode(code)) return { ok: false, code: "not_found" };

  try {
    return await db.transaction(async (tx): Promise<CancelResult> => {
      const [booking] = await tx
        .select({
          id: bookings.id,
          status: bookings.status,
          paxCount: bookings.paxCount,
          departureId: bookings.departureId,
        })
        .from(bookings)
        .where(and(eq(bookings.code, code), eq(bookings.customerId, customerId)))
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

      const block = cancelBlock(
        { status: booking.status, departureStatus: departure.status, startsAt: departure.startsAt },
        now,
      );
      if (block) return { ok: false, code: block };

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
}

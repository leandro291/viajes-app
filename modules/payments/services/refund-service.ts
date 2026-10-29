import { getStripe } from "@/lib/stripe";

// Reembolso total del cobro (sin `amount`: Stripe devuelve el restante).
// Idempotente por `idempotencyKey`; `charge_already_refunded` (clave vencida) = éxito.
export async function refundPaymentIntent(
  paymentIntentId: string,
  idempotencyKey: string,
): Promise<{ alreadyRefunded: boolean }> {
  try {
    await getStripe().refunds.create({ payment_intent: paymentIntentId }, { idempotencyKey });
    return { alreadyRefunded: false };
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code === "charge_already_refunded") {
      return { alreadyRefunded: true };
    }
    throw error;
  }
}

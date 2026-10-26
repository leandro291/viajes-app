import { getStripe } from "@/lib/stripe";

import { buildCheckoutSessionParams } from "../utils/checkout-session";

export type CreateCheckoutSessionInput = Omit<
  Parameters<typeof buildCheckoutSessionParams>[0],
  "nowSeconds"
>;

// D8: una sola Session por booking; la idempotencyKey solo protege reintentos de red del SDK.
export async function createCheckoutSession(
  input: CreateCheckoutSessionInput,
): Promise<{ id: string; url: string }> {
  const params = buildCheckoutSessionParams({
    ...input,
    nowSeconds: Math.floor(Date.now() / 1000),
  });
  const session = await getStripe().checkout.sessions.create(params, {
    idempotencyKey: `checkout-session:${input.bookingId}`,
  });
  if (!session.url) throw new Error("Stripe no devolvió la URL de la sesión de pago.");
  return { id: session.id, url: session.url };
}

// Compensación best-effort: nunca lanza. Solo se loguea el id de la Session (sin datos personales).
export async function expireCheckoutSession(sessionId: string): Promise<void> {
  try {
    await getStripe().checkout.sessions.expire(sessionId);
  } catch (error) {
    console.error(
      `No se pudo expirar la sesión de Stripe ${sessionId}:`,
      error instanceof Error ? error.message : "error desconocido",
    );
  }
}

import type { CheckoutSessionParams } from "@/lib/stripe";

// Stripe exige que `expires_at` caiga entre 30 min y 24 h desde la creación; 31 min deja margen por latencia.
export const CHECKOUT_SESSION_TTL_SECONDS = 31 * 60;

export function buildCheckoutSessionParams(input: {
  bookingId: string;
  bookingCode: string;
  amountUsdCents: number;
  productName: string;
  productDescription?: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
  nowSeconds: number;
}): CheckoutSessionParams {
  return {
    mode: "payment",
    // SDK v23 ya no tipa `payment_method_types` en create; `allowed_payment_method_types` es su filtro equivalente.
    allowed_payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountUsdCents,
          product_data: {
            name: input.productName,
            ...(input.productDescription
              ? { description: input.productDescription }
              : {}),
          },
        },
      },
    ],
    customer_email: input.customerEmail,
    client_reference_id: input.bookingId,
    metadata: { booking_id: input.bookingId, booking_code: input.bookingCode },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    locale: "es",
    expires_at: input.nowSeconds + CHECKOUT_SESSION_TTL_SECONDS,
  };
}

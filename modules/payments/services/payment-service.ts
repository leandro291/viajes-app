import { db, payments } from "@/lib/db";

// Lo cobrado es la Session de Stripe en USD (D8); provider por defecto `stripe`.
export async function createPendingPayment(input: {
  bookingId: string;
  amountUsdCents: number;
  stripeCheckoutSessionId: string;
}): Promise<void> {
  await db.insert(payments).values({
    bookingId: input.bookingId,
    method: "card",
    status: "pending",
    amountCents: input.amountUsdCents,
    currency: "USD",
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
  });
}

import Stripe from "stripe";

// Solo el tipo: nadie más importa "stripe" (ARCHITECTURE §5).
export type CheckoutSessionParams = Stripe.Checkout.SessionCreateParams;

let client: Stripe | undefined;

// Singleton perezoso: no lee el entorno al importar, así `next build` no se rompe sin la clave.
// Sin `apiVersion`: el SDK fija la de su versión mayor.
export function getStripe(): Stripe {
  if (client) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new Error(
      "Falta la variable de entorno STRIPE_SECRET_KEY. Definila en .env.local (ver .env.example).",
    );
  }

  client = new Stripe(secretKey);
  return client;
}

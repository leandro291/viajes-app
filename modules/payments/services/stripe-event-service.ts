import { getStripe, type StripeEvent } from "@/lib/stripe";

// Firma ausente o inválida: culpa del llamador (400). Todo otro error es de configuración (500).
export class StripeSignatureError extends Error {
  constructor(message = "Firma de Stripe inválida o ausente.") {
    super(message);
    this.name = "StripeSignatureError";
  }
}

// Lee el entorno en cada llamada (no al importar) para que `next build` no dependa del secreto.
export function parseStripeEvent(rawBody: string, signature: string | null): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "Falta la variable de entorno STRIPE_WEBHOOK_SECRET. Definila en .env.local (ver .env.example).",
    );
  }

  const stripe = getStripe(); // lanza Error plano si falta STRIPE_SECRET_KEY

  if (!signature) throw new StripeSignatureError();

  try {
    return stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    throw new StripeSignatureError();
  }
}

import type { NextRequest } from "next/server";

import { handleStripeEvent, parseStripeEvent, StripeSignatureError } from "@/modules/payments";

export async function POST(req: NextRequest) {
  // Cuerpo crudo: la firma de Stripe se calcula sobre los bytes exactos.
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = parseStripeEvent(body, signature);
  } catch (error) {
    if (error instanceof StripeSignatureError) {
      console.error("[stripe-webhook] firma inválida");
      return new Response("Invalid signature", { status: 400 });
    }
    // Configuración (falta secreto/clave): 500 para que Stripe reintente.
    console.error("[stripe-webhook] error de configuración", error);
    return new Response("Error", { status: 500 });
  }

  try {
    await handleStripeEvent(event);
  } catch (error) {
    // 500: Stripe reintenta con backoff.
    console.error(`[stripe-webhook] fallo en ${event.id} (${event.type})`, error);
    return new Response("Error", { status: 500 });
  }
  return new Response("ok");
}

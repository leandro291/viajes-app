import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";

import { handleClerkEvent } from "@/modules/users";

export async function POST(req: NextRequest) {
  let event;
  try {
    // Verifica la firma Svix con el cuerpo crudo (CLERK_WEBHOOK_SIGNING_SECRET).
    event = await verifyWebhook(req);
  } catch (error) {
    console.error("[clerk-webhook] firma inválida", error);
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    await handleClerkEvent(event);
  } catch (error) {
    // 500: Clerk reintenta con backoff.
    console.error(`[clerk-webhook] fallo en ${event.type}`, error);
    return new Response("Error", { status: 500 });
  }
  return new Response("ok");
}

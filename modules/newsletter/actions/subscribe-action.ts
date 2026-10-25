"use server";

import { subscribeSchema } from "../schemas/newsletter-schema";
import { subscribeEmail } from "../services/newsletter-service";
import type { SubscribeState } from "../types/newsletter";

const SUCCESS_MESSAGE = "¡Listo! Te avisaremos cuando haya nuevas ofertas.";
const ERROR_MESSAGE = "No pudimos suscribirte. Inténtalo de nuevo en unos minutos.";

// Público: sin sesión ni rol (ERM da `C` al público en newsletter_subscribers).
// Mismo éxito para correo nuevo, repetido o reactivado: no revela si existía (D12).
export async function subscribeToNewsletter(
  _prev: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const raw = formData.get("email");
  const parsed = subscribeSchema.safeParse({ email: raw });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0].message,
      email: typeof raw === "string" ? raw : undefined,
    };
  }

  try {
    await subscribeEmail(parsed.data.email);
    return { status: "success", message: SUCCESS_MESSAGE };
  } catch {
    // Sin detalles ni el correo en logs.
    console.error("subscribeToNewsletter: fallo al guardar la suscripción");
    return { status: "error", message: ERROR_MESSAGE };
  }
}

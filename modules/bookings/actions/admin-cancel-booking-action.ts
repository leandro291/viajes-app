"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";

import { cancelBookingAsAdmin } from "../services/cancellation-service";
import { adminCancelErrorMessage } from "../utils/cancellation";
import { BOOKING_CODE_PATTERN } from "../utils/voucher";

type ActionResult = { ok: true } | { ok: false; message: string };

const codeSchema = z.string().regex(BOOKING_CODE_PATTERN);

const UNAUTHENTICATED = "Tu sesión venció. Recarga la página.";
const FORBIDDEN = "No tienes permiso para esta acción.";
const UNEXPECTED = "Algo salió mal. Intenta de nuevo.";

export async function cancelBookingAsAdminAction(code: string): Promise<ActionResult> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, message: adminCancelErrorMessage("not_found") };

  try {
    await requireRole("admin");

    const result = await cancelBookingAsAdmin(parsed.data);
    if (!result.ok) {
      // `too_late` no aplica al admin (sin ventana); el tipo compartido lo incluye.
      const errorCode = result.code === "too_late" ? "not_cancellable" : result.code;
      return { ok: false, message: adminCancelErrorMessage(errorCode) };
    }

    revalidatePath("/admin/reservas");
    revalidatePath("/mis-reservas");
    revalidatePath(`/confirmacion/${parsed.data}`);
    updateTag(CACHE_TAGS.departures);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) {
      return { ok: false, message: e.code === "FORBIDDEN" ? FORBIDDEN : UNAUTHENTICATED };
    }
    // Solo el código de reserva: sin error completo ni datos personales.
    console.error(`cancelBookingAsAdminAction: fallo inesperado (${parsed.data})`);
    return { ok: false, message: UNEXPECTED };
  }
}

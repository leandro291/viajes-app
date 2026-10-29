"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";

import { AuthError, requireRole } from "@/lib/auth/require-role";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { getUserByClerkId } from "@/modules/users";

import { cancelBooking } from "../services/cancellation-service";
import { cancelErrorMessage } from "../utils/cancellation";
import { BOOKING_CODE_PATTERN } from "../utils/voucher";

type ActionResult = { ok: true } | { ok: false; message: string };

const codeSchema = z.string().regex(BOOKING_CODE_PATTERN);

const UNAUTHENTICATED = "Tu sesión venció. Recarga la página.";
const UNEXPECTED = "Algo salió mal. Intenta de nuevo.";

export async function cancelBookingAction(code: string): Promise<ActionResult> {
  const parsed = codeSchema.safeParse(code);
  if (!parsed.success) return { ok: false, message: cancelErrorMessage("not_found") };

  try {
    const { userId } = await requireRole("customer");
    const user = await getUserByClerkId(userId);
    if (!user) return { ok: false, message: UNAUTHENTICATED };

    const result = await cancelBooking(parsed.data, user.id);
    if (!result.ok) return { ok: false, message: cancelErrorMessage(result.code) };

    revalidatePath("/mis-reservas");
    revalidatePath(`/confirmacion/${parsed.data}`);
    updateTag(CACHE_TAGS.departures);
    return { ok: true };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: UNAUTHENTICATED };
    // Solo el código de reserva: sin error completo ni datos personales.
    console.error(`cancelBookingAction: fallo inesperado (${parsed.data})`);
    return { ok: false, message: UNEXPECTED };
  }
}

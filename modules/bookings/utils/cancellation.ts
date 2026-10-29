import type { bookingStatus, departureStatus } from "@/lib/db/schema/enums";
import type { CancelErrorCode } from "../types/cancellation";

type BookingStatus = (typeof bookingStatus.enumValues)[number];
type DepartureStatus = (typeof departureStatus.enumValues)[number];

export const FREE_CANCELLATION_HOURS = 48;

const HOUR_MS = 60 * 60 * 1000;

export function freeCancelDeadline(startsAt: Date): Date {
  return new Date(startsAt.getTime() - FREE_CANCELLATION_HOURS * HOUR_MS);
}

export type CancelBlock = "not_cancellable" | "too_late";

/** D2 (ventana inclusiva) y D7 (solo confirmed + scheduled). `null` = se puede cancelar. */
export function cancelBlock(
  i: { status: BookingStatus; departureStatus: DepartureStatus; startsAt: Date },
  now: Date,
): CancelBlock | null {
  if (i.status !== "confirmed" || i.departureStatus !== "scheduled") return "not_cancellable";
  return now.getTime() <= freeCancelDeadline(i.startsAt).getTime() ? null : "too_late";
}

const CANCEL_ERROR_MESSAGES: Record<CancelErrorCode, string> = {
  not_found: "No encontramos esta reserva.",
  not_cancellable: "Esta reserva no se puede cancelar.",
  too_late: "Ya no se puede cancelar gratis esta reserva.",
  no_refundable_payment: "No pudimos encontrar el pago para reembolsarlo. Escríbenos y lo resolvemos.",
  refund_failed: "No pudimos procesar el reembolso. No se canceló nada; intenta de nuevo en unos minutos.",
};

export function cancelErrorMessage(code: CancelErrorCode): string {
  return CANCEL_ERROR_MESSAGES[code];
}

export type AdminCancelBlock = "not_cancellable";

/** D2. `null` = se puede cancelar. Sin reloj: el admin no tiene ventana de 48 h. */
export function adminCancelBlock(i: {
  status: BookingStatus;
  departureStatus: DepartureStatus;
}): AdminCancelBlock | null {
  if (i.status === "pending") return null;
  if (i.status === "confirmed" && (i.departureStatus === "scheduled" || i.departureStatus === "cancelled")) {
    return null;
  }
  return "not_cancellable";
}

const ADMIN_CANCEL_ERROR_MESSAGES: Record<Exclude<CancelErrorCode, "too_late">, string> = {
  not_found: "No encontramos esta reserva.",
  not_cancellable: "Esta reserva no se puede cancelar (la salida ya está en curso o finalizó).",
  no_refundable_payment: "La reserva no tiene un pago de Stripe que reembolsar. Revísala en el panel de Stripe.",
  refund_failed: "Stripe no pudo procesar el reembolso. No se canceló nada; intenta de nuevo en unos minutos.",
};

/** D12. Copy para el admin; no incluye "too_late" (sin ventana). */
export function adminCancelErrorMessage(code: Exclude<CancelErrorCode, "too_late">): string {
  return ADMIN_CANCEL_ERROR_MESSAGES[code];
}

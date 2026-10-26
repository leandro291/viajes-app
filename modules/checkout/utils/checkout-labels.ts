import { formatPen, formatUsd } from "@/lib/money";
import type { BookingAmount } from "@/modules/payments";

import type { CheckoutErrorCode } from "../types/checkout";

const NBSP = "\u00a0";
const MINUS = "\u2212";

export function formatTravelers(n: number): string {
  return n === 1 ? "1 viajero" : `${n} viajeros`;
}

export function describeAmount(amount: BookingAmount, pax: number) {
  return {
    unitLine: `${formatPen(amount.unitPriceCents)} × ${pax}`,
    subtotal: formatPen(amount.unitPriceCents * pax),
    discount:
      amount.discountCents > 0
        ? `${MINUS}${formatPen(amount.discountCents)}`
        : null,
    total: formatPen(amount.totalCents),
    charge: formatUsd(amount.amountUsdCents),
    rate: `1 US$ = S/${NBSP}${amount.exchangeRate.toFixed(2)}`,
  };
}

const MESSAGES: Record<Exclude<CheckoutErrorCode, "insufficient_seats">, string> = {
  invalid_input: "Revisá los datos marcados e intentá de nuevo.",
  invalid_link: "Este enlace de reserva no es válido.",
  unauthenticated: "Tu sesión venció. Recargá la página para volver a ingresar.",
  profile_missing:
    "Todavía estamos preparando tu perfil. Probá de nuevo en unos segundos.",
  departure_unavailable: "Esta salida ya no está disponible.",
  offer_invalid: "La oferta ya no está vigente.",
  below_minimum:
    "El total es menor al mínimo que se puede cobrar con tarjeta (US$ 0.50).",
  payments_unavailable:
    "No pudimos iniciar el pago. Intentá de nuevo en unos minutos.",
  unexpected: "Algo salió mal. Intentá de nuevo.",
};

export function checkoutErrorMessage(
  code: CheckoutErrorCode,
  extra?: { seatsLeft?: number },
): string {
  if (code !== "insufficient_seats") return MESSAGES[code];
  const left = extra?.seatsLeft ?? 0;
  if (left <= 0) return "Esta salida se agotó.";
  return left === 1 ? "Solo queda 1 cupo." : `Solo quedan ${left} cupos.`;
}

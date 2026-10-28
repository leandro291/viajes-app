import { getStripe } from "@/lib/stripe";
import { BookingError, cancelPendingBooking, createPendingBooking } from "@/modules/bookings";
import { buildCheckoutHref, getBookableDeparture } from "@/modules/packages";
import {
  createCheckoutSession,
  createPendingPayment,
  expireCheckoutSession,
  getBookingAmount,
  PaymentAmountError,
  STRIPE_MIN_AMOUNT_USD_CENTS,
  type BookingAmount,
} from "@/modules/payments";
import { getUserByClerkId } from "@/modules/users";

import type { CheckoutInput } from "../schemas/checkout-schema";
import type { CheckoutErrorCode, QuoteResult } from "../types/checkout";
import { getAppUrl } from "../utils/app-url";
import { formatTravelers } from "../utils/checkout-labels";

type QuoteInput = { departureId: string; pax: number; offerId?: string };

// Calcula con la oferta pedida; si ya no es válida, recalcula sin ella (D3, decisión 3).
async function resolveAmount(
  packageId: string,
  pax: number,
  offerId?: string,
): Promise<{ amount: BookingAmount; offerExpired: boolean }> {
  try {
    return { amount: await getBookingAmount({ packageId, pax, offerId }), offerExpired: false };
  } catch (error) {
    if (!(error instanceof PaymentAmountError) || error.code !== "offer_invalid" || !offerId) {
      throw error;
    }
    return { amount: await getBookingAmount({ packageId, pax }), offerExpired: true };
  }
}

// Fuente única de cupo y monto para la página y la acción (D3). Sin caché (D14).
export async function getCheckoutQuote({ departureId, pax, offerId }: QuoteInput): Promise<QuoteResult> {
  const departure = await getBookableDeparture(departureId);
  if (!departure) return { ok: false, code: "departure_unavailable" };

  const { package: pkg, seatsLeft } = departure;
  if (seatsLeft < pax) {
    return { ok: false, code: "insufficient_seats", seatsLeft, packageSlug: pkg.slug };
  }

  let resolved: Awaited<ReturnType<typeof resolveAmount>>;
  try {
    resolved = await resolveAmount(pkg.id, pax, offerId);
  } catch (error) {
    if (error instanceof PaymentAmountError) {
      if (error.code === "invalid_exchange_rate") {
        console.error("[checkout] PEN_PER_USD inválido o ausente.");
        return { ok: false, code: "payments_unavailable" };
      }
      if (error.code === "package_not_found") return { ok: false, code: "departure_unavailable" };
    }
    throw error;
  }

  const { amount, offerExpired } = resolved;
  return {
    ok: true,
    quote: {
      departure: { id: departure.id, startsAt: departure.startsAt, seatsLeft },
      package: pkg,
      pax,
      amount,
      offerExpired,
      belowMinimum: amount.amountUsdCents < STRIPE_MIN_AMOUNT_USD_CENTS,
    },
  };
}

type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; code: CheckoutErrorCode; seatsLeft?: number };

// Compensación best-effort: no lanza; si falla, deja el código de reserva en el log (Q5, sin PII).
async function compensate(booking: { id: string; code: string }, sessionId?: string): Promise<void> {
  let failed = false;
  if (sessionId) {
    try {
      await expireCheckoutSession(sessionId);
    } catch {
      failed = true;
    }
  }
  try {
    await cancelPendingBooking(booking.id);
  } catch {
    failed = true;
  }
  if (failed) console.error(`[checkout] No se pudo compensar la reserva pendiente ${booking.code}.`);
}

// Orden de D4 (pasos 3 a 8). Los pasos previos al booking no escriben nada.
export async function createCheckout({
  clerkUserId,
  data,
}: {
  clerkUserId: string;
  data: CheckoutInput;
}): Promise<CheckoutResult> {
  // D5: config antes de escribir.
  let appUrl: string;
  try {
    getStripe();
    appUrl = getAppUrl();
  } catch (error) {
    console.error(
      "[checkout] Configuración de pagos incompleta:",
      error instanceof Error ? error.message : "error desconocido",
    );
    return { ok: false, code: "payments_unavailable" };
  }

  const user = await getUserByClerkId(clerkUserId);
  if (!user) return { ok: false, code: "profile_missing" };

  const result = await getCheckoutQuote({
    departureId: data.salida,
    pax: data.viajeros,
    offerId: data.oferta,
  });
  if (!result.ok) {
    return {
      ok: false,
      code: result.code,
      ...(result.code === "insufficient_seats" ? { seatsLeft: result.seatsLeft } : {}),
    };
  }
  const { quote } = result;
  if (quote.offerExpired) return { ok: false, code: "offer_invalid" };
  if (quote.belowMinimum) return { ok: false, code: "below_minimum" };

  let booking: { id: string; code: string };
  try {
    booking = await createPendingBooking({
      customerId: user.id,
      departureId: quote.departure.id,
      paxCount: quote.pax,
      amount: quote.amount,
      contact: { email: data.email, phone: data.phone },
      traveler: {
        firstName: data.firstName,
        lastName: data.lastName,
        docType: data.docType,
        docNumber: data.docNumber,
      },
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return {
        ok: false,
        code: error.code,
        ...(error.code === "insufficient_seats" ? { seatsLeft: error.seatsLeft } : {}),
      };
    }
    throw error;
  }

  let session: { id: string; url: string };
  try {
    session = await createCheckoutSession({
      bookingId: booking.id,
      bookingCode: booking.code,
      amountUsdCents: quote.amount.amountUsdCents,
      productName: `${quote.package.title} · ${formatTravelers(quote.pax)}`,
      customerEmail: data.email,
      successUrl: `${appUrl}/confirmacion/${booking.code}`,
      cancelUrl: `${appUrl}${buildCheckoutHref(quote.departure.id, quote.pax, data.oferta)}`,
    });
  } catch (error) {
    console.error(
      `[checkout] Falló la sesión de Stripe de la reserva ${booking.code}:`,
      error instanceof Error ? error.name : "error desconocido",
    );
    await compensate(booking);
    return { ok: false, code: "payments_unavailable" };
  }

  try {
    await createPendingPayment({
      bookingId: booking.id,
      amountUsdCents: quote.amount.amountUsdCents,
      stripeCheckoutSessionId: session.id,
    });
  } catch (error) {
    console.error(
      `[checkout] Falló el registro del pago de la reserva ${booking.code}:`,
      error instanceof Error ? error.name : "error desconocido",
    );
    await compensate(booking, session.id);
    return { ok: false, code: "payments_unavailable" };
  }

  return { ok: true, url: session.url };
}

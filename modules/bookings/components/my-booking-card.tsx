import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatPen } from "@/lib/money";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatDepartureShortDate, formatDepartureTime } from "@/modules/packages";

import type { MyBookingDto } from "../types/my-bookings";
import { CancelBookingButton } from "./cancel-booking-button";

const DT = "text-xs font-bold tracking-[0.08em] text-ink-muted uppercase";
const DD = "mt-1 text-[17px] font-bold text-ink";
const LINK =
  "inline-flex min-h-11 items-center text-base font-bold text-primary underline-offset-4 hover:underline";

// Presentacional (D10, D11, D14). Sin datos personales de viajeros.
export function MyBookingCard({ booking }: { booking: MyBookingDto }) {
  const { package: pkg, status } = booking;
  const done = status === "confirmed" && (booking.startsAt < new Date() || booking.departureStatus === "completed");
  const refunded = status === "cancelled" && booking.paymentStatus === "refunded";
  const tooLate =
    status === "confirmed" && !booking.canCancel && !done && booking.departureStatus === "scheduled";
  const whatsAppHref = tooLate
    ? buildWhatsAppUrl(
        process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
        `Hola Wayra, necesito ayuda con mi reserva ${booking.code}.`,
      )
    : null;

  return (
    <article className="flex flex-wrap overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_1px_2px_rgba(11,21,19,.05),0_12px_32px_rgba(11,21,19,.05)]">
      <div className="relative min-h-[180px] flex-[1_1_200px] bg-sand">
        {pkg.coverImageUrl && (
          <Image
            src={pkg.coverImageUrl}
            alt={`Foto de ${pkg.title}`}
            fill
            sizes="(min-width: 860px) 260px, 100vw"
            className="object-cover"
          />
        )}
      </div>

      <div className="flex min-w-0 flex-[3_1_300px] flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {done ? (
            <StatusBadge status="neutral" label="Realizada" />
          ) : (
            <StatusBadge status={status} />
          )}
          {refunded && <span className="text-sm font-bold text-ink-muted">Reembolsado</span>}
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[13px] font-bold tracking-[0.06em] text-primary uppercase">
            {pkg.destinationName}
          </p>
          <h3 className="font-display text-2xl leading-[1.15] font-bold tracking-[-0.015em] text-ink">
            <Link
              href={`/paquetes/${pkg.slug}`}
              className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
            >
              {pkg.title}
            </Link>
          </h3>
        </div>

        <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(130px,100%),1fr))] gap-4">
          <div>
            <dt className={DT}>Código</dt>
            <dd className={DD}>{booking.code}</dd>
          </div>
          <div>
            <dt className={DT}>Salida</dt>
            <dd className={DD}>
              {formatDepartureShortDate(booking.startsAt)}
              <span className="block text-[15px] font-normal text-ink-muted">
                {formatDepartureTime(booking.startsAt)}
              </span>
            </dd>
          </div>
          <div>
            <dt className={DT}>Viajeros</dt>
            <dd className={DD}>{booking.paxCount}</dd>
          </div>
          <div>
            <dt className={DT}>Total</dt>
            <dd className={DD}>{formatPen(booking.totalCents)}</dd>
          </div>
        </dl>

        {status !== "cancelled" && (
          <Link href={`/confirmacion/${booking.code}`} className={`${LINK} self-start`}>
            {status === "confirmed" ? "Ver voucher" : "Ver estado"}
          </Link>
        )}

        {booking.canCancel && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-row-divider pt-4">
            <p className="text-[15px] text-ink-muted">
              Cancelación gratis hasta el {formatDepartureShortDate(booking.freeCancelUntil)} a las{" "}
              {formatDepartureTime(booking.freeCancelUntil)}
            </p>
            <CancelBookingButton code={booking.code} refundableUsdCents={booking.refundableUsdCents} />
          </div>
        )}

        {tooLate && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-row-divider pt-4">
            <p className="text-[15px] text-ink-muted">
              Ya no se puede cancelar gratis: faltan menos de 48 horas para la salida.
            </p>
            {whatsAppHref && (
              <a href={whatsAppHref} target="_blank" rel="noopener noreferrer" className={LINK}>
                <MessageCircle aria-hidden className="mr-2 size-[18px]" strokeWidth={2.2} />
                Escríbenos por WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

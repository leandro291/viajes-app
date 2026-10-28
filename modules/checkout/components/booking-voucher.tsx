import Image from "next/image";
import Link from "next/link";

import { formatPen, formatUsd } from "@/lib/money";
import type { BookingVoucherDto } from "@/modules/bookings";
import {
  formatDepartureShortDate,
  formatDuration,
} from "@/modules/packages";

import { formatTravelers } from "../utils/checkout-labels";
import { PrintVoucherButton } from "./print-voucher-button";

const DOC_LABEL: Record<BookingVoucherDto["travelers"][number]["docType"], string> = {
  dni: "DNI",
  passport: "Pasaporte",
  foreign_id: "Carné de extranjería",
};

const DT = "text-xs font-bold tracking-[0.08em] text-ink-muted uppercase";
const CARD = "rounded-[22px] bg-white sm:rounded-[30px]";
const NOTCH =
  "absolute left-[-15px] hidden size-7 rounded-full bg-background min-[860px]:block";

// Ticket (foto, detalle, talón con código) + sección "Viajeros". El documento llega
// ya enmascarado desde el servidor. Impresión (AC16): sin sombra y sin los dos botones.
export function BookingVoucher({ booking }: { booking: BookingVoucherDto }) {
  const { package: pkg } = booking;
  const eyebrow = [
    pkg.destinationName,
    formatDuration(pkg.durationDays),
    pkg.nights > 0 && (pkg.nights === 1 ? "1 noche" : `${pkg.nights} noches`),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <section
        aria-labelledby="h-ticket"
        className={`relative flex flex-wrap shadow-[0_30px_70px_rgba(11,21,19,.18),0_2px_6px_rgba(11,21,19,.06)] [print-color-adjust:exact] motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_.35s_both] print:shadow-none ${CARD}`}
      >
        <div className="relative min-h-[220px] flex-[1_1_200px] overflow-hidden rounded-t-[22px] bg-sand sm:rounded-t-[30px] min-[860px]:rounded-l-[30px] min-[860px]:rounded-tr-none">
          {pkg.coverImageUrl && (
            <Image
              src={pkg.coverImageUrl}
              alt=""
              fill
              sizes="(min-width: 860px) 250px, 100vw"
              className="object-cover"
            />
          )}
        </div>

        <div className="flex flex-[2_1_280px] flex-col gap-5 p-7">
          <span className="text-[13px] font-bold tracking-[0.06em] text-primary uppercase">
            {eyebrow}
          </span>
          <h2 id="h-ticket" className="text-[30px] leading-[1.05] font-extrabold tracking-[-0.025em] text-ink">
            {pkg.title}
          </h2>
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(min(120px,100%),1fr))] gap-4">
            <div>
              <dt className={DT}>Salida</dt>
              <dd className="mt-1 text-[17px] font-bold text-ink">
                {formatDepartureShortDate(booking.startsAt)}
              </dd>
            </div>
            <div>
              <dt className={DT}>Viajeros</dt>
              <dd className="mt-1 text-[17px] font-bold text-ink">
                {formatTravelers(booking.paxCount)}
              </dd>
            </div>
            <div>
              <dt className={DT}>Total pagado</dt>
              <dd className="mt-1 text-[17px] font-bold text-accent">
                {formatPen(booking.totalCents)}
                {booking.chargedUsdCents != null && (
                  <span className="block text-[13px] font-normal text-ink-muted">
                    {formatUsd(booking.chargedUsdCents)}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative flex flex-[1_1_220px] flex-col justify-center gap-4 border-t-2 border-dashed border-[#E4DED2] p-7 min-[860px]:border-t-0 min-[860px]:border-l-2">
          <span aria-hidden="true" className={`${NOTCH} -top-3.5`} />
          <span aria-hidden="true" className={`${NOTCH} -bottom-3.5`} />
          <div>
            <p className={DT}>Código de reserva</p>
            <p className="mt-1 font-display text-[30px] font-extrabold tracking-[0.04em] text-ink sm:text-[26px] sm:tracking-[0.02em]">
              {booking.code}
            </p>
          </div>
          <PrintVoucherButton />
          <Link
            href={`/paquetes/${pkg.slug}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-ink px-5 py-3 text-base font-bold text-ink transition-colors hover:bg-ink hover:text-white print:hidden"
          >
            Ver detalles
          </Link>
        </div>
      </section>

      <section aria-labelledby="h-travelers" className={`border border-[#EAE4D9] p-6 sm:p-8 ${CARD}`}>
        <h2 id="h-travelers" className="text-[22px] leading-tight text-ink sm:text-[26px]">
          Viajeros
        </h2>
        <ul className="mt-4 flex flex-col divide-y divide-[#EAE4D9]">
          {booking.travelers.map((t) => (
            <li
              key={`${t.docType}-${t.docNumberMasked}-${t.firstName}`}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-[17px] font-bold text-ink">
                  {t.firstName} {t.lastName}
                </p>
                <p className="text-[15px] text-ink-muted">
                  {DOC_LABEL[t.docType]} {t.docNumberMasked}
                </p>
              </div>
              {t.isPrimary && (
                <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
                  Principal
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

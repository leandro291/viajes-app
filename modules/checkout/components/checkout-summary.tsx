import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { formatDepartureDate, formatDepartureTime, formatDuration } from "@/modules/packages";

import type { CheckoutQuote } from "../types/checkout";
import { describeAmount, formatTravelers } from "../utils/checkout-labels";

const termClass = "text-xs font-bold uppercase tracking-[0.06em] text-ink-muted";

export function CheckoutSummary({
  quote,
  backHref,
  children,
}: {
  quote: CheckoutQuote;
  backHref: string;
  /** Botón de pagar: vive en el formulario (cliente) y se coloca aquí. */
  children?: ReactNode;
}) {
  const { package: pkg, departure, pax, amount } = quote;
  const a = describeAmount(amount, pax);

  return (
    <aside
      aria-label="Resumen del pedido"
      className="flex flex-col overflow-hidden rounded-card bg-surface shadow-raised lg:sticky lg:top-6"
    >
      <div className="relative flex h-[190px] items-end bg-dark text-white">
        {pkg.coverImageUrl && (
          <Image
            src={pkg.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 420px, 100vw"
            className="object-cover"
          />
        )}
        <span
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,14,13,.88),rgba(8,14,13,.05)_75%)]"
        />
        <div className="relative flex flex-col gap-1 px-6 py-5">
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-white/85">
            {[
              pkg.region,
              formatDuration(pkg.durationDays),
              pkg.nights > 0 && (pkg.nights === 1 ? "1 noche" : `${pkg.nights} noches`),
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          <h2 className="font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em]">
            {pkg.title}
          </h2>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-6">
        <dl className="grid grid-cols-2 gap-3">
          <div className="rounded-field bg-sand px-3.5 py-3">
            <dt className={termClass}>Salida</dt>
            <dd className="mt-1 font-bold">
              {formatDepartureDate(departure.startsAt)}
              <span className="block text-sm font-medium text-ink-muted">
                {formatDepartureTime(departure.startsAt)}
              </span>
            </dd>
          </div>
          <div className="rounded-field bg-sand px-3.5 py-3">
            <dt className={termClass}>Viajeros</dt>
            <dd className="mt-1 font-bold">{formatTravelers(pax)}</dd>
          </div>
        </dl>

        <dl className="flex flex-col gap-2.5 text-[15px]">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{a.unitLine}</dt>
            <dd>{a.subtotal}</dd>
          </div>
          {a.discount && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Descuento de la oferta</dt>
              <dd className="font-bold text-primary">{a.discount}</dd>
            </div>
          )}
        </dl>

        <dl className="flex flex-col gap-2.5 border-t border-dashed border-border-strong pt-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-lg font-bold">Total</dt>
            <dd className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em]">
              {a.total}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <dt className="text-ink-muted">A cobrar</dt>
            <dd className="font-bold">{a.charge}</dd>
          </div>
          <p className="text-right text-[13px] text-ink-muted">{a.rate}</p>
        </dl>

        {children}

        <p className="flex items-center gap-2.5 text-sm text-ink">
          <Check aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={2.8} />
          Cancelación gratis hasta 48 h antes
        </p>
        <Link
          href={backHref}
          className="-mb-2 flex min-h-11 items-center justify-center rounded-full p-2 text-center font-bold text-primary hover:underline"
        >
          Cambiar salida o viajeros
        </Link>
      </div>
    </aside>
  );
}

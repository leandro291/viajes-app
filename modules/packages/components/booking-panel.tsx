import Link from "next/link";
import { ArrowRight, Minus, Plus, type LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";

import type { DepartureDto, DetailParams, PackageDetailDto } from "../types/package";
import {
  buildCheckoutHref,
  buildDetailHref,
  clampTravelers,
  formatDepartureChip,
  formatDepartureDate,
  formatDepartureTime,
  resolveBooking,
  seatsLabel,
} from "../utils/package-detail";

const stepClass =
  "inline-flex size-12 items-center justify-center rounded-xl bg-surface text-ink shadow-[0_1px_2px_rgba(11,21,19,0.08)]";

function StepButton({
  label,
  href,
  Icon,
}: {
  label: string;
  href: string | null;
  Icon: LucideIcon;
}) {
  return href ? (
    <Link href={href} scroll={false} aria-label={label} className={stepClass}>
      <Icon aria-hidden className="size-5" />
    </Link>
  ) : (
    <span aria-disabled="true" aria-label={label} className={cn(stepClass, "opacity-40")}>
      <Icon aria-hidden className="size-5" />
    </span>
  );
}

export function BookingPanel({
  pkg,
  departures,
  params,
}: {
  pkg: PackageDetailDto;
  departures: DepartureDto[];
  params: DetailParams;
}) {
  const { selected, travelers } = resolveBooking(pkg.maxGroupSize, departures, params);
  const maxTravelers = clampTravelers(Infinity, pkg.maxGroupSize, selected?.seatsLeft ?? pkg.maxGroupSize);
  const current = { salida: selected?.id, viajeros: params.viajeros };
  const stepHref = (n: number) =>
    n < 1 || n > maxTravelers ? null : buildDetailHref(pkg.slug, current, { viajeros: n });
  const total = formatPen(pkg.priceCents * travelers);

  return (
    <aside
      id="reserva"
      aria-label="Reserva"
      className="flex flex-col gap-[22px] rounded-card bg-surface p-6 shadow-raised lg:p-7"
    >
      <div className="flex items-end justify-between gap-3 max-sm:flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm text-ink-muted">Desde</span>
          <span className="font-display text-[42px] font-extrabold leading-none tracking-[-0.03em]">
            {formatPen(pkg.priceCents)}
          </span>
          <span className="text-sm text-ink-muted">por persona, habitación doble</span>
        </div>
        <span className="rounded-full bg-primary-soft px-3 py-2 text-[13px] font-bold text-primary">
          Confirmación inmediata
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink-muted">
          Fecha de salida
        </h2>
        {departures.length === 0 ? (
          <p className="rounded-2xl bg-sand p-4 text-sm text-ink-muted">
            Aún no hay salidas programadas.
          </p>
        ) : (
          <ul className="grid grid-cols-4 gap-2">
            {departures.map((d) => {
              const chip = formatDepartureChip(d.startsAt);
              const full = d.seatsLeft === 0;
              const active = d.id === selected?.id;
              const box = cn(
                "flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-2xl border-[1.5px] p-1.5 text-center",
                active ? "border-ink bg-ink text-white" : "border-border-strong bg-surface text-ink",
                full && "bg-sand text-ink-muted opacity-70",
              );
              const content = (
                <>
                  <span className="text-xs font-bold uppercase tracking-[0.06em]">{chip.dow}</span>
                  <span className="font-display text-[22px] font-extrabold leading-none">
                    {chip.day}
                  </span>
                  <span className="text-[11px] uppercase">{full ? "Agotado" : chip.month}</span>
                </>
              );
              return (
                <li key={d.id}>
                  {full ? (
                    <span aria-disabled="true" aria-label={`${formatDepartureDate(d.startsAt)}, agotado`} className={box}>
                      {content}
                    </span>
                  ) : (
                    <Link
                      href={buildDetailHref(pkg.slug, { viajeros: params.viajeros }, { salida: d.id })}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={cn(box, !active && "hover:bg-sand")}
                    >
                      {content}
                      {/* Sin aria-label: el nombre sale del texto visible (WCAG 2.5.3) y suma la fecha completa. */}
                      <span className="sr-only">{formatDepartureDate(d.startsAt)}</span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {selected && (
          <p aria-live="polite" className="text-sm font-bold text-primary">
            {seatsLabel(selected.seatsLeft)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink-muted">
          Viajeros
        </span>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-sand p-1.5">
          <StepButton label="Quitar un viajero" href={stepHref(travelers - 1)} Icon={Minus} />
          <span aria-live="polite" className="text-[17px] font-bold">
            {travelers === 1 ? "1 viajero" : `${travelers} viajeros`}
          </span>
          <StepButton label="Agregar un viajero" href={stepHref(travelers + 1)} Icon={Plus} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-dashed border-border-strong pt-[18px] text-ink-muted">
        <div className="flex justify-between gap-3">
          <span>
            {formatPen(pkg.priceCents)} × {travelers}
          </span>
          <span>{total}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span>Impuestos y tasas</span>
          <span>Incluidos</span>
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3 text-ink">
          <span className="text-lg font-bold">Total</span>
          <span className="font-display text-3xl font-extrabold tracking-[-0.02em]">{total}</span>
        </div>
      </div>

      {selected ? (
        <Link
          href={buildCheckoutHref(selected.id, travelers)}
          className={cn(buttonVariants({ variant: "cta" }), "h-auto w-full gap-2.5 px-6 py-[18px]")}
        >
          Reservar ahora
          <ArrowRight aria-hidden className="size-[18px]" strokeWidth={2.4} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={cn(buttonVariants({ variant: "cta" }), "h-auto w-full px-6 py-[18px] opacity-50")}
        >
          Reservar ahora
        </span>
      )}
      <p className="text-center text-[13px] leading-snug text-ink-muted">
        {selected
          ? `Salida el ${formatDepartureDate(selected.startsAt)} a las ${formatDepartureTime(selected.startsAt)}. Puedes cancelar gratis hasta 48 h antes.`
          : "No hay salidas con cupo por ahora. Vuelve pronto."}
      </p>
    </aside>
  );
}

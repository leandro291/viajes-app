import Image from "next/image";
import Link from "next/link";

import { formatPen } from "@/lib/money";

import type { TourCardDto } from "../types/package";
import {
  formatNextDeparture,
  formatTourDuration,
  formatTourStart,
} from "../utils/tour-view";

// 1 columna (tarjetas horizontales) a 390, 2 a 768, 4 a 1280.
export const TOURS_GRID_CLASS =
  "grid grid-cols-1 gap-x-6 gap-y-3.5 md:grid-cols-2 md:gap-y-8 lg:grid-cols-4";

const CHIP_CLASS =
  "rounded-full bg-sand px-2.5 py-1 text-[13px] font-bold text-ink";

// Horizontal en móvil (foto a la izquierda), vertical desde `md`. Un solo link.
export function TourCard({ tour }: { tour: TourCardDto }) {
  return (
    <Link
      href={`/paquetes/${tour.slug}`}
      className="group flex h-full gap-3.5 text-ink max-md:rounded-[20px] max-md:bg-surface max-md:p-2.5 max-md:shadow-[0_1px_0_var(--color-border)] md:flex-col"
    >
      <div className="relative h-[136px] w-28 shrink-0 self-start overflow-hidden rounded-[22px] bg-sand max-md:rounded-[14px] md:aspect-[4/3.4] md:h-auto md:w-full md:self-auto">
        {tour.coverImageUrl && (
          <Image
            src={tour.coverImageUrl}
            alt={tour.title}
            fill
            sizes="(min-width: 1024px) 280px, (min-width: 768px) 45vw, 132px"
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]"
          />
        )}
        <span className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate rounded-full bg-white px-3 py-[7px] text-[13px] font-bold text-ink max-md:hidden">
          {tour.destination.name}
        </span>
        <span className="absolute bottom-1.5 left-1.5 rounded-full bg-dark/80 px-2 py-1 text-xs font-bold text-white md:hidden">
          {formatTourDuration(tour)}
        </span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 max-md:gap-1 max-md:py-1 max-md:pr-1 md:px-1">
        <p className="text-xs font-bold text-primary md:hidden">
          {[tour.destination.name, tour.startTime && formatTourStart(tour.startTime).toLowerCase()]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="flex flex-wrap gap-1.5 max-md:hidden">
          <span className={CHIP_CLASS}>{formatTourDuration(tour)}</span>
          {tour.startTime && (
            <span className={CHIP_CLASS}>{formatTourStart(tour.startTime)}</span>
          )}
        </div>
        <h3 className="line-clamp-2 font-display text-[20px] leading-[1.15] font-bold tracking-[-0.015em] max-md:text-lg max-md:leading-[1.15] md:text-[22px]">
          {tour.title}
        </h3>
        <p className="line-clamp-2 text-[15px] leading-normal text-ink-muted max-md:text-sm max-md:leading-[1.4]">
          {tour.blurb}
        </p>
        <div className="mt-auto flex flex-col gap-1 pt-1">
          <p className="text-[15px] text-ink-muted max-md:text-[13px]">
            Desde{" "}
            <strong className="text-[19px] text-ink max-md:text-[17px]">
              {formatPen(tour.priceCents)}
            </strong>
          </p>
          <p className="text-[13px] font-semibold text-ink-muted max-md:hidden">
            {tour.nextDeparture
              ? formatNextDeparture(tour.nextDeparture)
              : "Sin salidas próximas"}
          </p>
        </div>
      </div>
    </Link>
  );
}

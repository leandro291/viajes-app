import Link from "next/link";

import { cn } from "@/lib/utils";

import type { TourCityDto, TourFilters } from "../types/package";
import { buildTourHref, maxFecha } from "../utils/tour-filters";
import { TourFilterFields } from "./tour-filter-fields";

const chipClass = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center rounded-full border-[1.5px] px-5 py-[11px] text-[15px] font-bold whitespace-nowrap transition-colors max-md:h-11 max-md:px-4 max-md:py-0 max-md:text-sm",
    active
      ? "border-ink bg-ink text-white"
      : "border-border-strong bg-surface text-ink hover:bg-sand",
  );

// Escritorio: tarjeta blanca con las ciudades a la izquierda y fecha/orden a la derecha.
// Móvil: barra pegada arriba, de borde a borde, con las ciudades en un riel que se desliza.
export function TourFilterBar({
  filters,
  cities,
  today,
}: {
  filters: TourFilters;
  cities: TourCityDto[];
  today: string;
}) {
  return (
    <nav
      aria-label="Filtros"
      className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-surface p-4 shadow-card max-md:sticky max-md:top-0 max-md:z-10 max-md:-mx-6 max-md:flex-col max-md:flex-nowrap max-md:items-stretch max-md:gap-0 max-md:rounded-none max-md:border-b max-md:border-border max-md:bg-bg max-md:p-0 max-md:shadow-none"
    >
      <ul
        aria-label="Ciudad"
        className="flex flex-wrap gap-2 max-md:flex-nowrap max-md:overflow-x-auto max-md:px-4 max-md:pt-3.5 max-md:pb-2.5 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden"
      >
        {[{ slug: undefined, name: "Todas" }, ...cities].map((city) => {
          const active = filters.ciudad === city.slug;
          return (
            <li key={city.slug ?? "todas"} className="shrink-0">
              <Link
                href={buildTourHref(filters, { ciudad: city.slug })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={chipClass(active)}
              >
                {city.name}
              </Link>
            </li>
          );
        })}
      </ul>
      <TourFilterFields filters={filters} today={today} max={maxFecha(today)} />
    </nav>
  );
}

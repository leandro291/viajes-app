import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type { TourCityDto, TourFilters } from "../types/package";
import { buildTourHref, maxFecha, TOUR_SORT_OPTIONS } from "../utils/tour-filters";

const chipClass = (active: boolean) =>
  cn(
    "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-[15px]",
    active
      ? "border-ink bg-ink font-bold text-white"
      : "border-border bg-surface font-medium text-ink hover:bg-sand",
  );

const titleClass = "mb-2 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-muted";
const listClass =
  "-mx-1 -my-2 flex flex-wrap gap-2 px-1 py-2 max-md:flex-nowrap max-md:overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function TourFilterBar({
  filters,
  cities,
  today,
}: {
  filters: TourFilters;
  cities: TourCityDto[];
  today: string;
}) {
  const max = maxFecha(today);
  const hasActive = Boolean(filters.ciudad || filters.fecha || filters.orden);
  const linkClass = "inline-flex min-h-11 items-center px-1 text-sm font-bold text-primary";

  return (
    <nav aria-label="Filtros" className="flex flex-col gap-5">
      <div>
        <p id="tours-ciudad" className={titleClass}>
          Ciudad
        </p>
        <ul aria-labelledby="tours-ciudad" className={listClass}>
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
      </div>

      <div>
        <p id="tours-fecha" className={titleClass}>
          Fecha
        </p>
        <form
          method="get"
          action="/tours"
          aria-labelledby="tours-fecha"
          className="flex flex-wrap items-center gap-2"
        >
          {filters.ciudad && <input type="hidden" name="ciudad" value={filters.ciudad} />}
          {filters.orden && <input type="hidden" name="orden" value={filters.orden} />}
          <Input
            type="date"
            name="fecha"
            aria-label="Fecha de salida"
            defaultValue={filters.fecha}
            min={today}
            max={max}
            className="w-auto min-h-11"
          />
          <Button type="submit">Aplicar</Button>
          {filters.fecha && (
            <Link
              href={buildTourHref(filters, { fecha: undefined })}
              scroll={false}
              className={linkClass}
            >
              Quitar fecha
            </Link>
          )}
        </form>
      </div>

      <div>
        <p id="tours-orden" className={titleClass}>
          Ordenar
        </p>
        <ul aria-labelledby="tours-orden" className={listClass}>
          {TOUR_SORT_OPTIONS.map((option) => {
            const active = filters.orden === option.value;
            return (
              <li key={option.value ?? "recomendados"} className="shrink-0">
                <Link
                  href={buildTourHref(filters, { orden: option.value })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={chipClass(active)}
                >
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {hasActive && (
        <Link href="/tours" scroll={false} className={cn(linkClass, "self-start")}>
          Limpiar
        </Link>
      )}
    </nav>
  );
}

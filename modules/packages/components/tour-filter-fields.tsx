"use client";

import { useRouter } from "next/navigation";

import type { TourFilters } from "../types/package";
import { buildTourHref, TOUR_SORT_OPTIONS } from "../utils/tour-filters";

// Escritorio: etiqueta junto a un control en píldora. Móvil: caja con la etiqueta chica arriba.
const labelClass =
  "flex items-center gap-2.5 text-[15px] text-ink-muted max-md:min-w-0 max-md:flex-col max-md:items-stretch max-md:gap-0 max-md:rounded-[14px] max-md:border max-md:border-border max-md:bg-surface max-md:px-3 max-md:py-2";
const captionClass =
  "max-md:text-[11px] max-md:font-bold max-md:tracking-[0.06em] max-md:uppercase";
const controlClass =
  "min-h-11 rounded-full border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 font-bold text-ink max-md:min-h-[26px] max-md:w-full max-md:min-w-0 max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:text-[15px] max-md:font-medium";

// Fecha y orden se aplican al cambiar, sin botón "Aplicar".
// ponytail: sin JS no aplican (los chips de ciudad sí, son links); un <form method="get"> de respaldo si hace falta.
export function TourFilterFields({
  filters,
  today,
  max,
}: {
  filters: TourFilters;
  today: string;
  max: string;
}) {
  const router = useRouter();
  const apply = (change: Partial<Record<keyof TourFilters, string | undefined>>) =>
    router.push(buildTourHref(filters, change), { scroll: false });

  return (
    <div className="flex flex-wrap items-center gap-3 max-md:grid max-md:grid-cols-2 max-md:gap-2 max-md:px-4 max-md:pb-3.5">
      <label className={labelClass}>
        <span className={captionClass}>Fecha</span>
        <input
          type="date"
          defaultValue={filters.fecha}
          min={today}
          max={max}
          onChange={(e) => apply({ fecha: e.target.value || undefined })}
          className={controlClass}
        />
      </label>
      <label className={labelClass}>
        <span className={captionClass}>Ordenar</span>
        <select
          defaultValue={filters.orden ?? ""}
          onChange={(e) => apply({ orden: e.target.value || undefined })}
          className={controlClass}
        >
          {TOUR_SORT_OPTIONS.map((option) => (
            <option key={option.value ?? "recomendados"} value={option.value ?? ""}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

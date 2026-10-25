"use client";

import { useRouter } from "next/navigation";

import type { PackageFilters, SortOrder } from "../types/package";
import { buildListingHref, SORT_OPTIONS } from "../utils/package-filters";

export function PackageSort({ filters }: { filters: PackageFilters }) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2.5 text-[15px] text-ink-muted">
      Ordenar por
      {/* key: si el orden cambia desde la URL (p. ej. "Limpiar"), el select se reinicia. */}
      <select
        key={filters.orden ?? ""}
        defaultValue={filters.orden ?? ""}
        onChange={(e) =>
          router.push(
            buildListingHref(filters, {
              orden: (e.target.value || undefined) as SortOrder | undefined,
            }),
            { scroll: false },
          )
        }
        className="min-h-11 rounded-full border-[1.5px] border-border-strong bg-surface px-3.5 py-2.5 font-bold text-ink"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value ?? "rec"} value={o.value ?? ""}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

"use client";

import { useRouter } from "next/navigation";

import type { PackageFilters } from "../types/package";
import { buildListingHref } from "../utils/package-filters";

// Caja Duración/Ordenar de la barra móvil (< lg): la etiqueta chica arriba, aplica al cambiar.
export function PackageFilterSelect({
  filters,
  field,
  caption,
  options,
}: {
  filters: PackageFilters;
  field: "duracion" | "orden";
  caption: string;
  options: { value: string | undefined; label: string }[];
}) {
  const router = useRouter();
  const current = filters[field] ?? "";

  return (
    <label className="flex min-w-0 flex-col rounded-[14px] border border-border bg-surface px-3 py-2 lg:hidden">
      <span className="text-[11px] font-bold tracking-[0.06em] text-ink-muted uppercase">
        {caption}
      </span>
      {/* key: si el valor cambia desde la URL, el select se reinicia. */}
      <select
        key={current}
        defaultValue={current}
        onChange={(e) =>
          router.push(buildListingHref(filters, { [field]: e.target.value || undefined }), {
            scroll: false,
          })
        }
        className="min-h-[26px] w-full min-w-0 bg-transparent text-[15px] font-medium text-ink"
      >
        {options.map((o) => (
          <option key={o.value ?? "none"} value={o.value ?? ""}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

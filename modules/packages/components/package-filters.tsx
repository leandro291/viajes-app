import Link from "next/link";

import { cn } from "@/lib/utils";

import type { PackageFilters as Filters } from "../types/package";
import { buildListingHref, DURATION_OPTIONS, SORT_OPTIONS } from "../utils/package-filters";
import { PackageFilterSelect } from "./package-filter-select";

type Option = { value: string | undefined; label: string };

type Group = {
  id: string;
  title: string;
  key: keyof Filters;
  options: Option[];
};

export function PackageFilters({
  filters,
  categories,
}: {
  filters: Filters;
  categories: { slug: string; name: string }[];
}) {
  const groups: Group[] = [
    {
      id: "categoria",
      title: "Tipo de experiencia",
      key: "categoria",
      options: [
        { value: undefined, label: "Todos" },
        ...categories.map((c) => ({ value: c.slug, label: c.name })),
      ],
    },
    { id: "duracion", title: "Duración", key: "duracion", options: DURATION_OPTIONS },
  ];

  const hasActive = Boolean(
    filters.categoria || filters.duracion || filters.destino || filters.orden,
  );

  return (
    <nav
      aria-label="Filtros"
      className="flex flex-col gap-4 max-lg:sticky max-lg:top-0 max-lg:z-10 max-lg:-mx-4 max-lg:gap-0 max-lg:border-b max-lg:border-border max-lg:bg-bg md:max-lg:-mx-6 lg:sticky lg:top-6 lg:min-w-[230px] lg:max-w-[290px] lg:flex-[1_1_240px] lg:gap-[26px] lg:rounded-[24px] lg:bg-surface lg:p-6 lg:shadow-card"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 max-lg:hidden",
        )}
      >
        <span className="hidden font-display text-[22px] font-extrabold tracking-[-0.02em] lg:block">
          Filtros
        </span>
        {hasActive ? (
          <Link
            href="/paquetes"
            scroll={false}
            className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-primary lg:ml-auto"
          >
            Limpiar
          </Link>
        ) : (
          // Sin filtros activos: visible pero sin acción (AC16).
          <span
            role="link"
            aria-disabled="true"
            className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-primary opacity-45 lg:ml-auto"
          >
            Limpiar
          </span>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.id} className={cn(group.id === "duracion" && "max-lg:hidden")}>
          <p
            id={`filtros-${group.id}`}
            className="mb-2 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-muted max-lg:hidden"
          >
            {group.title}
          </p>
          <ul
            aria-labelledby={`filtros-${group.id}`}
            className="flex gap-2 overflow-x-auto px-4 pt-3.5 pb-2.5 md:max-lg:px-6 lg:m-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {group.options.map((option) => {
              const active = filters[group.key] === option.value;
              return (
                <li key={option.value ?? "none"} className="shrink-0 lg:shrink">
                  <Link
                    href={buildListingHref(filters, { [group.key]: option.value })}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 whitespace-nowrap rounded-full border-[1.5px] px-4 text-sm transition-colors lg:border lg:-mx-2.5 lg:rounded-[12px] lg:border-transparent lg:px-2.5 lg:text-base",
                      active
                        ? "border-ink bg-ink font-bold text-white lg:bg-transparent lg:text-ink"
                        : "border-border-strong bg-surface font-bold text-ink hover:bg-sand lg:font-medium",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "hidden size-[18px] shrink-0 rounded-full border-2 lg:block",
                        active
                          ? "border-accent bg-accent shadow-[inset_0_0_0_3px_var(--color-surface)]"
                          : "border-border-strong",
                      )}
                    />
                    {option.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <div className="grid grid-cols-2 gap-2 px-4 pb-3.5 md:max-lg:px-6 lg:hidden">
        <PackageFilterSelect
          filters={filters}
          field="duracion"
          caption="Duración"
          options={DURATION_OPTIONS}
        />
        <PackageFilterSelect
          filters={filters}
          field="orden"
          caption="Ordenar"
          options={SORT_OPTIONS}
        />
      </div>
    </nav>
  );
}

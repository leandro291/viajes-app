import Link from "next/link";

import { cn } from "@/lib/utils";

import type { PackageFilters as Filters } from "../types/package";
import {
  buildListingHref,
  DURATION_OPTIONS,
  SORT_OPTIONS,
} from "../utils/package-filters";

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
    { id: "orden", title: "Ordenar", key: "orden", options: SORT_OPTIONS },
  ];

  const hasActive = Boolean(
    filters.categoria || filters.duracion || filters.destino || filters.orden,
  );

  return (
    <nav
      aria-label="Filtros"
      className="flex flex-col gap-4 lg:sticky lg:top-6 lg:w-[290px] lg:shrink-0 lg:gap-6 lg:rounded-card lg:bg-surface lg:p-6 lg:shadow-card"
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2",
          !hasActive && "max-lg:hidden",
        )}
      >
        <span className="hidden font-display text-[22px] font-extrabold tracking-tight lg:block">
          Filtros
        </span>
        {hasActive && (
          <Link
            href="/paquetes"
            scroll={false}
            className="inline-flex min-h-11 items-center px-1 text-sm font-bold text-primary lg:ml-auto"
          >
            Limpiar
          </Link>
        )}
      </div>

      {groups.map((group) => (
        <div key={group.id}>
          <p
            id={`filtros-${group.id}`}
            className="mb-2 text-[13px] font-bold uppercase tracking-[0.08em] text-ink-muted"
          >
            {group.title}
          </p>
          <ul
            aria-labelledby={`filtros-${group.id}`}
            className="-mx-6 -my-2 flex gap-2 overflow-x-auto px-6 py-2 lg:m-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                      "flex min-h-11 items-center gap-3 whitespace-nowrap rounded-full border px-4 text-[15px] transition-colors lg:rounded-xl lg:border-transparent lg:px-2.5 lg:text-base",
                      active
                        ? "border-ink bg-ink font-bold text-white lg:bg-transparent lg:text-ink"
                        : "border-border bg-surface text-ink hover:bg-sand",
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
    </nav>
  );
}

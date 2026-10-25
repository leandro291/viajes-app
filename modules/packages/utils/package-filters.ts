import { z } from "zod";

import type { DurationFilter, PackageFilters, SortOrder } from "../types/package";

export const DURATION_OPTIONS: { value: DurationFilter | undefined; label: string }[] = [
  { value: undefined, label: "Cualquiera" },
  { value: "1", label: "Un día" },
  { value: "2-3", label: "2 a 3 días" },
  { value: "4-mas", label: "4 días o más" },
];

export const SORT_OPTIONS: { value: SortOrder | undefined; label: string }[] = [
  { value: undefined, label: "Recomendados" },
  { value: "precio-asc", label: "Precio: menor a mayor" },
  { value: "precio-desc", label: "Precio: mayor a menor" },
];

// Orden fijo de claves: mismo conjunto de filtros, mismo href.
const KEYS = ["categoria", "duracion", "destino", "orden"] as const;

const slugSchema = z.string().min(1).max(60);

const schemas = {
  categoria: slugSchema,
  duracion: z.enum(["1", "2-3", "4-mas"]),
  destino: slugSchema,
  orden: z.enum(["precio-asc", "precio-desc"]),
};

export function parseListingParams(
  raw: Record<string, string | string[] | undefined>,
): PackageFilters {
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const value = Array.isArray(raw[key]) ? raw[key][0] : raw[key];
    const parsed = schemas[key].safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as PackageFilters;
}

export function resolveFilters(
  parsed: PackageFilters,
  categories: { slug: string }[],
  destinations: { slug: string }[],
): PackageFilters {
  const out: PackageFilters = { ...parsed };
  if (out.categoria && !categories.some((c) => c.slug === out.categoria)) {
    delete out.categoria;
  }
  if (out.destino && !destinations.some((d) => d.slug === out.destino)) {
    delete out.destino;
  }
  return out;
}

export function buildListingHref(
  current: PackageFilters,
  change: Partial<Record<keyof PackageFilters, string | undefined>>,
): string {
  const merged: Record<string, string | undefined> = { ...current, ...change };
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = merged[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/paquetes?${query}` : "/paquetes";
}

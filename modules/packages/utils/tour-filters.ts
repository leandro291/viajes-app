import { z } from "zod";

import type { TourCardDto, TourCityDto, TourFilters, TourSort } from "../types/package";

export const TOUR_SORT_OPTIONS: { value: TourSort | undefined; label: string }[] = [
  { value: undefined, label: "Recomendados" },
  { value: "precio-asc", label: "Precio menor a mayor" },
  { value: "mas-cortos", label: "Más cortos primero" },
];

export const MAX_FECHA_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;
// Lima es UTC-5 todo el año (sin DST).
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;

// Orden fijo de claves: mismo conjunto de filtros, mismo href.
const KEYS = ["ciudad", "fecha", "orden"] as const;

const fechaSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  });

const schemas = {
  ciudad: z.string().min(1).max(60),
  fecha: fechaSchema,
  orden: z.enum(["precio-asc", "mas-cortos"]),
};

export function parseTourParams(
  raw: Record<string, string | string[] | undefined>,
): TourFilters {
  const out: Record<string, string> = {};
  for (const key of KEYS) {
    const value = Array.isArray(raw[key]) ? raw[key][0] : raw[key];
    const parsed = schemas[key].safeParse(value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as TourFilters;
}

/** Fecha de hoy en America/Lima, "YYYY-MM-DD". */
export function limaToday(now: Date): string {
  return new Date(now.getTime() - LIMA_OFFSET_MS).toISOString().slice(0, 10);
}

/** Última fecha aceptada: hoy (Lima) + MAX_FECHA_DAYS. Lo usan la validación y el `max` del input. */
export function maxFecha(today: string): string {
  return new Date(new Date(`${today}T00:00:00Z`).getTime() + MAX_FECHA_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export function resolveTourFilters(
  parsed: TourFilters,
  cities: { slug: string }[],
  today: string,
): TourFilters {
  const out: TourFilters = { ...parsed };
  if (out.ciudad && !cities.some((c) => c.slug === out.ciudad)) {
    delete out.ciudad;
  }
  if (out.fecha && (out.fecha < today || out.fecha > maxFecha(today))) {
    delete out.fecha;
  }
  return out;
}

/** Día de Lima como intervalo [from, to), 24 h exactas. */
export function dayRange(fecha: string): { from: Date; to: Date } {
  const from = new Date(`${fecha}T00:00:00-05:00`);
  return { from, to: new Date(from.getTime() + DAY_MS) };
}

export function citiesFromTours(tours: Pick<TourCardDto, "destination">[]): TourCityDto[] {
  const byCity = new Map<string, TourCityDto>();
  for (const { destination } of tours) {
    const city = byCity.get(destination.slug);
    if (city) city.count += 1;
    else byCity.set(destination.slug, { slug: destination.slug, name: destination.name, count: 1 });
  }
  return [...byCity.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "es"),
  );
}

export function buildTourHref(
  current: TourFilters,
  change: Partial<Record<keyof TourFilters, string | undefined>>,
): string {
  const merged: Record<string, string | undefined> = { ...current, ...change };
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = merged[key];
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `/tours?${query}` : "/tours";
}

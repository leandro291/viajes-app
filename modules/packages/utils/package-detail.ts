import { z } from "zod";

import type { DepartureDto, DetailParams, PackageDetailDto } from "../types/package";
import { formatDuration } from "./package-utils";

const KEYS = ["salida", "viajeros"] as const;
const TZ = "America/Lima";
const MAX_TRAVELERS = 20;
const DEFAULT_TRAVELERS = 2;

export { isValidSlug } from "@/lib/slug";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseDetailParams(
  raw: Record<string, string | string[] | undefined>,
): DetailParams {
  const out: DetailParams = {};
  const salida = z.uuid().safeParse(first(raw.salida));
  if (salida.success) out.salida = salida.data;
  const viajeros = z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(MAX_TRAVELERS))
    .safeParse(first(raw.viajeros));
  if (viajeros.success) out.viajeros = viajeros.data;
  return out;
}

// Orden fijo de claves: mismo conjunto de params, mismo href.
export function buildDetailHref(
  slug: string,
  current: DetailParams,
  change: Partial<Record<keyof DetailParams, string | number | undefined>>,
): string {
  const merged: Record<string, string | number | undefined> = { ...current, ...change };
  const params = new URLSearchParams();
  for (const key of KEYS) {
    const value = merged[key];
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `/paquetes/${slug}?${query}` : `/paquetes/${slug}`;
}

// Orden fijo: salida, viajeros, oferta (omitida si es vacía).
export function buildCheckoutHref(
  departureId: string,
  travelers: number,
  offerId?: string | null,
): string {
  const params = new URLSearchParams({ salida: departureId, viajeros: String(travelers) });
  if (offerId) params.set("oferta", offerId);
  return `/pago?${params}`;
}

export function seatsLeft(d: { capacity: number; bookedSeats: number }): number {
  return Math.max(0, d.capacity - d.bookedSeats);
}

export function seatsLabel(n: number): string {
  if (n <= 0) return "Agotado";
  return n === 1 ? "Queda 1 cupo" : `Quedan ${n} cupos`;
}

export function clampTravelers(n: number, maxGroupSize: number, left: number): number {
  const max = Math.max(1, Math.min(maxGroupSize, left));
  return Math.min(Math.max(1, Math.trunc(n)), max);
}

// Salida elegida (la de ?salida= si tiene cupo, si no la primera con cupo) y viajeros acotados.
export function resolveBooking(
  maxGroupSize: number,
  departures: DepartureDto[],
  params: DetailParams,
): { selected: DepartureDto | undefined; travelers: number } {
  const selected =
    departures.find((d) => d.id === params.salida && d.seatsLeft > 0) ??
    departures.find((d) => d.seatsLeft > 0);
  const travelers = clampTravelers(
    params.viajeros ?? DEFAULT_TRAVELERS,
    maxGroupSize,
    selected?.seatsLeft ?? maxGroupSize,
  );
  return { selected, travelers };
}

// Fechas en Lima aunque el servidor esté en UTC (AC5).
const limaParts = new Intl.DateTimeFormat("es-PE", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
});

function parts(d: Date) {
  const get = (type: string) => limaParts.formatToParts(d).find((p) => p.type === type)!.value;
  return { weekday: get("weekday"), day: get("day"), month: get("month") };
}

export function formatDepartureDate(d: Date): string {
  const p = parts(d);
  return `${p.weekday} ${p.day} de ${p.month}`;
}

export function formatDepartureChip(d: Date): { dow: string; day: string; month: string } {
  const p = parts(d);
  const dow = p.weekday.slice(0, 3);
  return { dow: dow.charAt(0).toUpperCase() + dow.slice(1), day: p.day, month: p.month.slice(0, 3) };
}

const limaTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatDepartureTime(d: Date): string {
  return formatStartTime(limaTime.format(d));
}

export function formatLanguages(codes: string[]): string {
  const names = codes.map((c) => (c === "es" ? "Español" : c === "en" ? "inglés" : c));
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

// "07:30:00" -> "7:30 a. m."
export function formatStartTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatPackageDuration(
  p: Pick<PackageDetailDto, "kind" | "durationDays" | "nights" | "durationHours">,
): string {
  if (p.kind === "day_tour") {
    if (p.durationHours) return p.durationHours === 1 ? "1 hora" : `${p.durationHours} horas`;
    return formatDuration(p.durationDays);
  }
  const nights = p.nights === 1 ? "1 noche" : `${p.nights} noches`;
  return `${formatDuration(p.durationDays)} · ${nights}`;
}

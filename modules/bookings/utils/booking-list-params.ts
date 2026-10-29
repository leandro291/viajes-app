import { z } from "zod";

import type { BookingListQuery, BookingSortKey } from "../types/booking-list";

export const BOOKINGS_PAGE_SIZE = 20;

export const DEFAULT_BOOKING_QUERY: BookingListQuery = {
  orden: "codigo",
  dir: "desc",
  pagina: 1,
};

// Primer clic en una columna (D11); el segundo invierte.
const INITIAL_DIR: Record<BookingSortKey, BookingListQuery["dir"]> = {
  codigo: "desc",
  salida: "asc",
  total: "desc",
};

const estadoSchema = z.enum(["pending", "confirmed", "cancelled"]);
const ordenSchema = z.enum(["codigo", "salida", "total"]);
const dirSchema = z.enum(["asc", "desc"]);
const paginaSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(Number.MAX_SAFE_INTEGER));

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

// Nunca lanza: valor inválido, vacío o repetido (se toma el primero) → default.
export function parseBookingListParams(
  raw: Record<string, string | string[] | undefined>,
): BookingListQuery {
  const estado = estadoSchema.safeParse(first(raw.estado));
  return {
    ...(estado.success && { estado: estado.data }),
    orden: ordenSchema.catch(DEFAULT_BOOKING_QUERY.orden).parse(first(raw.orden)),
    dir: dirSchema.catch(DEFAULT_BOOKING_QUERY.dir).parse(first(raw.dir)),
    pagina: paginaSchema.catch(DEFAULT_BOOKING_QUERY.pagina).parse(first(raw.pagina)),
  };
}

// Omite los valores por defecto; orden fijo de claves: estado, orden, dir, pagina.
export function buildBookingsHref(basePath: string, query: BookingListQuery): string {
  const params = new URLSearchParams();
  if (query.estado) params.set("estado", query.estado);
  if (query.orden !== DEFAULT_BOOKING_QUERY.orden) params.set("orden", query.orden);
  if (query.dir !== DEFAULT_BOOKING_QUERY.dir) params.set("dir", query.dir);
  if (query.pagina !== DEFAULT_BOOKING_QUERY.pagina) params.set("pagina", String(query.pagina));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function nextSortQuery(query: BookingListQuery, key: BookingSortKey): BookingListQuery {
  const dir =
    query.orden === key ? (query.dir === "asc" ? "desc" : "asc") : INITIAL_DIR[key];
  return { ...query, orden: key, dir, pagina: 1 };
}

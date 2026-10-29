// Zona horaria fija America/Lima (UTC-5, sin horario de verano).
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Rango semiabierto [from, to). */
export type DateRange = { from: Date; to: Date };

/** Día calendario de Lima que contiene `now`. */
export function limaDayRange(now: Date): DateRange {
  const from = Math.floor((now.getTime() - LIMA_OFFSET_MS) / DAY_MS) * DAY_MS + LIMA_OFFSET_MS;
  return { from: new Date(from), to: new Date(from + DAY_MS) };
}

/** Mes calendario de Lima que contiene `now`. */
export function limaMonthRange(now: Date): DateRange {
  const lima = new Date(now.getTime() - LIMA_OFFSET_MS);
  const y = lima.getUTCFullYear();
  const m = lima.getUTCMonth();
  return {
    from: new Date(Date.UTC(y, m, 1) + LIMA_OFFSET_MS),
    to: new Date(Date.UTC(y, m + 1, 1) + LIMA_OFFSET_MS),
  };
}

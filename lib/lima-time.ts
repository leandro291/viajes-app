// Zona horaria fija America/Lima (UTC-5, sin horario de verano).
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

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

export function instantToLimaParts(d: Date): { date: string; time: string } {
  const iso = new Date(d.getTime() - LIMA_OFFSET_MS).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/** Instante de `date` (YYYY-MM-DD) + `time` (HH:MM) en hora de Lima; null si no existen. */
export function limaToInstant(date: string, time: string): Date | null {
  const d = DATE_RE.exec(date);
  const t = TIME_RE.exec(time);
  if (!d || !t) return null;
  const instant = new Date(
    Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), Number(t[1]), Number(t[2])) +
      LIMA_OFFSET_MS,
  );
  if (Number.isNaN(instant.getTime())) return null;
  // `Date.UTC` rueda fechas inexistentes (2026-02-30, 24:00): se compara el round-trip.
  const back = instantToLimaParts(instant);
  return back.date === date && back.time === time ? instant : null;
}

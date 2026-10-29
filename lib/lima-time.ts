// Zona horaria fija America/Lima (UTC-5, sin horario de verano).
const LIMA_OFFSET_MS = 5 * 60 * 60 * 1000;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

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

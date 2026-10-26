import type { TourCardDto } from "../types/package";
import { formatDepartureChip, formatStartTime } from "./package-detail";
import { formatDuration } from "./package-utils";

// Todo tour es de un día (D1): sin horas, el fallback es "1 día".
export function formatTourDuration(t: Pick<TourCardDto, "durationHours">): string {
  return t.durationHours ? `${t.durationHours} h` : formatDuration(1);
}

export function formatTourStart(startTime: string): string {
  return `Sale ${formatStartTime(startTime)}`;
}

export function formatNextDeparture(d: { startsAt: Date; seatsLeft: number }): string {
  const { dow, day, month } = formatDepartureChip(d.startsAt);
  const seats = d.seatsLeft === 1 ? "1 cupo" : `${d.seatsLeft} cupos`;
  return `Próxima salida: ${dow.toLowerCase()} ${day} ${month} · ${seats}`;
}

export function formatTourCount(n: number): string {
  return n === 1 ? "1 tour disponible" : `${n} tours disponibles`;
}

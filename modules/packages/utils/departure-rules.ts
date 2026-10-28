import type { BookingStatusKey } from "@/components/shared/status-badge";
import type { departureStatus } from "@/lib/db/schema/enums";

export type DepartureStatus = (typeof departureStatus.enumValues)[number];

const NEXT_STATUSES: Record<DepartureStatus, DepartureStatus[]> = {
  scheduled: ["en_route", "cancelled"],
  en_route: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function allowedNextStatuses(from: DepartureStatus): DepartureStatus[] {
  return [...NEXT_STATUSES[from]];
}

export const isTerminalStatus = (s: DepartureStatus): boolean =>
  NEXT_STATUSES[s].length === 0;

export const DEPARTURE_STATUS_LABELS: Record<DepartureStatus, string> = {
  scheduled: "Programada",
  en_route: "En ruta",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const DEPARTURE_STATUS_BADGE: Record<DepartureStatus, BookingStatusKey> = {
  scheduled: "neutral",
  en_route: "pending",
  completed: "confirmed",
  cancelled: "cancelled",
};

export function soldLabel(
  booked: number,
  capacity: number,
): { sold: string; left: string } {
  const left = Math.max(0, capacity - booked);
  return {
    sold: `${booked} de ${capacity} cupos vendidos`,
    left: left === 0 ? "Agotada" : `Quedan ${left}`,
  };
}

export type RuleError =
  | { code: "DEPARTURE_CLOSED" | "INVALID_TRANSITION" | "SEATS_SOLD" }
  | { code: "INVALID_INPUT"; fieldErrors: Record<string, string> };

const FUTURE_DATE_ERROR: RuleError = {
  code: "INVALID_INPUT",
  fieldErrors: { date: "Elige una fecha futura." },
};

export function checkNewDeparture(startsAt: Date, now: Date): RuleError | null {
  return startsAt.getTime() > now.getTime() ? null : FUTURE_DATE_ERROR;
}

export function checkDepartureChange(
  current: {
    startsAt: Date;
    capacity: number;
    bookedSeats: number;
    status: DepartureStatus;
  },
  next: { startsAt: Date; capacity: number; status: DepartureStatus },
  now: Date,
): RuleError | null {
  if (isTerminalStatus(current.status)) return { code: "DEPARTURE_CLOSED" };

  if (
    next.status !== current.status &&
    !NEXT_STATUSES[current.status].includes(next.status)
  ) {
    return { code: "INVALID_TRANSITION" };
  }

  if (next.capacity < current.bookedSeats) {
    return {
      code: "INVALID_INPUT",
      fieldErrors: {
        capacity: `La capacidad no puede ser menor a los cupos vendidos (${current.bookedSeats}).`,
      },
    };
  }

  const dateChanged = next.startsAt.getTime() !== current.startsAt.getTime();
  if (current.bookedSeats > 0 && (dateChanged || next.status === "cancelled")) {
    return { code: "SEATS_SOLD" };
  }

  if (dateChanged) return checkNewDeparture(next.startsAt, now);
  return null;
}

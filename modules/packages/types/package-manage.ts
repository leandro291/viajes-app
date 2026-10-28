import type { organizerStatus } from "@/lib/db/schema/enums";

// Estructural: OrganizerProfile (modules/organizers) es asignable; no se importa su tipo.
export type OrganizerScope = { id: string; status: (typeof organizerStatus.enumValues)[number] };

export type ManageErrorCode =
  | "NO_ORGANIZER"
  | "ORGANIZER_SUSPENDED"
  | "ORGANIZER_PENDING"
  | "NOT_FOUND"
  | "INVALID_INPUT"
  | "HAS_BOOKINGS"
  | "HAS_DEPARTURES"
  | "HAS_OFFERS"
  | "HAS_DEPENDENCIES"
  | "UNKNOWN";

export type ManageResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; code: ManageErrorCode; message: string; fieldErrors?: Record<string, string> };

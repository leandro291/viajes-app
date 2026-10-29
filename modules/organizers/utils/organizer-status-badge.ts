import type { BookingStatusKey } from "@/components/shared/status-badge";

import type { OrganizerStatus } from "../types/organizer";

export const ORGANIZER_STATUS_BADGE: Record<OrganizerStatus, { status: BookingStatusKey; label: string }> = {
  active: { status: "confirmed", label: "Activo" },
  pending: { status: "pending", label: "Pendiente" },
  suspended: { status: "cancelled", label: "Suspendido" },
};

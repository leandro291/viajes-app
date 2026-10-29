import type { BookingStatusKey } from "@/components/shared/status-badge";
import type { DocType } from "../types/booking";
import type {
  BookingRowDto,
  BookingStatus,
  BookingTravelerDto,
  PaymentStatus,
} from "../types/booking-list";

// Columnas crudas del join bookings + packages + departures + users.
export type BookingRow = {
  id: string;
  code: string;
  packageTitle: string;
  departureStartsAt: Date;
  userFirstName: string | null;
  userLastName: string | null;
  contactEmail: string;
  contactPhone: string;
  paxCount: number;
  totalCents: number;
  status: BookingStatus;
};

export function toBookingRowDto(
  row: BookingRow,
  travelers: BookingTravelerDto[],
  latestPaymentStatus: PaymentStatus | null,
): BookingRowDto {
  const customerName =
    [row.userFirstName, row.userLastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || null;

  return {
    id: row.id,
    code: row.code,
    packageTitle: row.packageTitle,
    departureStartsAt: row.departureStartsAt,
    customerName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    paxCount: row.paxCount,
    totalCents: row.totalCents,
    status: row.status,
    paymentStatus: latestPaymentStatus,
    // sort estable: principal primero, el resto conserva su orden
    travelers: [...travelers].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary)),
  };
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  dni: "DNI",
  passport: "Pasaporte",
  foreign_id: "Carné de extranjería",
};

export const PAYMENT_BADGE: Record<PaymentStatus, { badge: BookingStatusKey; label: string }> = {
  succeeded: { badge: "confirmed", label: "Pagado" },
  pending: { badge: "pending", label: "Pendiente" },
  failed: { badge: "cancelled", label: "Fallido" },
  refunded: { badge: "neutral", label: "Reembolsado" },
  partially_refunded: { badge: "neutral", label: "Reembolso parcial" },
};

export const NO_PAYMENT_LABEL = "Sin pago";

export const BOOKING_STATUS_FILTERS: { value: BookingStatus | undefined; label: string }[] = [
  { value: undefined, label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "cancelled", label: "Canceladas" },
];

import type { bookingStatus, paymentStatus } from "@/lib/db/schema/enums";
import type { DocType } from "./booking";

export type BookingStatus = (typeof bookingStatus.enumValues)[number];
export type PaymentStatus = (typeof paymentStatus.enumValues)[number];

export type BookingSortKey = "codigo" | "salida" | "total";
export type SortDir = "asc" | "desc";

export type BookingListQuery = {
  estado?: BookingStatus;
  orden: BookingSortKey; // default "codigo"
  dir: SortDir; // default "desc"
  pagina: number; // >= 1, default 1
};

export type BookingScope = { organizerId: string } | { all: true };

export type BookingTravelerDto = {
  id: string;
  firstName: string;
  lastName: string;
  docType: DocType;
  docNumber: string; // completo (D3)
  isPrimary: boolean;
};

export type BookingRowDto = {
  id: string;
  code: string; // WY-####
  packageTitle: string;
  departureStartsAt: Date;
  customerName: string | null;
  contactEmail: string;
  contactPhone: string;
  paxCount: number;
  totalCents: number; // PEN
  status: BookingStatus;
  paymentStatus: PaymentStatus | null; // último pago
  travelers: BookingTravelerDto[]; // principal primero
};

export type BookingListResult = {
  rows: BookingRowDto[];
  total: number; // filas tras el filtro, antes de paginar
  page: number; // efectiva (acotada)
  pageCount: number; // >= 1
};

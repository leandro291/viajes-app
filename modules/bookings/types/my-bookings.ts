import type { bookingStatus, departureStatus, paymentStatus } from "@/lib/db/schema/enums";

type BookingStatus = (typeof bookingStatus.enumValues)[number];
type DepartureStatus = (typeof departureStatus.enumValues)[number];
type PaymentStatus = (typeof paymentStatus.enumValues)[number];

export type MyBookingDto = {
  id: string;
  code: string; // WY-####
  status: BookingStatus; // pending | confirmed | cancelled
  paxCount: number;
  totalCents: number; // PEN
  startsAt: Date;
  departureStatus: DepartureStatus;
  package: { slug: string; title: string; coverImageUrl: string | null; destinationName: string };
  paymentStatus: PaymentStatus | null; // último payment
  refundableUsdCents: number | null; // amount_cents si el último pago es `succeeded`, si no null
  freeCancelUntil: Date; // startsAt − 48 h
  canCancel: boolean; // cancelBlock(...) === null
};

/** Columnas del join booking + departure + package + destination. */
export type MyBookingRow = {
  id: string;
  code: string;
  status: BookingStatus;
  paxCount: number;
  totalCents: number;
  startsAt: Date;
  departureStatus: DepartureStatus;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  destinationName: string;
};

export type MyBookingPayment = { status: PaymentStatus; amountCents: number };

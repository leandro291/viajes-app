import type { docType } from "@/lib/db/schema/enums";
import type { BookingVoucherDto } from "../types/voucher";

export const BOOKING_CODE_PATTERN = /^WY-\d{4}$/;

export function isBookingCode(code: string): boolean {
  return BOOKING_CODE_PATTERN.test(code);
}

/** Columnas del join booking + departure + package + destination. */
export type VoucherRow = {
  id: string;
  code: string;
  status: BookingVoucherDto["status"];
  paxCount: number;
  totalCents: number;
  startsAt: Date;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  durationDays: number;
  nights: number;
  meetingPoint: string | null;
  meetingLat: number | null;
  meetingLng: number | null;
  destinationName: string;
};

/** Viajero tal como sale de la DB: lleva el número completo, que el mapper enmascara (D9). */
export type VoucherTravelerRow = {
  firstName: string;
  lastName: string;
  docType: (typeof docType.enumValues)[number];
  docNumber: string;
  isPrimary: boolean;
};

const CHARGED = new Set<BookingVoucherDto["paymentStatus"]>(["succeeded", "partially_refunded"]);

function maskDoc(docNumber: string): string {
  return docNumber.length > 4 ? `****${docNumber.slice(-4)}` : "****";
}

export function toVoucherDto(
  row: VoucherRow,
  travelers: VoucherTravelerRow[],
  payment: { status: BookingVoucherDto["paymentStatus"]; amountCents: number } | null,
): BookingVoucherDto {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    paxCount: row.paxCount,
    totalCents: row.totalCents,
    startsAt: row.startsAt,
    package: {
      slug: row.slug,
      title: row.title,
      coverImageUrl: row.coverImageUrl,
      durationDays: row.durationDays,
      nights: row.nights,
      meetingPoint: row.meetingPoint,
      meetingLat: row.meetingLat,
      meetingLng: row.meetingLng,
      destinationName: row.destinationName,
    },
    // sort estable: el principal primero, el resto conserva su orden
    travelers: [...travelers]
      .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary))
      .map((t) => ({
        firstName: t.firstName,
        lastName: t.lastName,
        docType: t.docType,
        docNumberMasked: maskDoc(t.docNumber),
        isPrimary: t.isPrimary,
      })),
    chargedUsdCents: payment && CHARGED.has(payment.status) ? payment.amountCents : null,
    paymentStatus: payment?.status ?? null,
  };
}

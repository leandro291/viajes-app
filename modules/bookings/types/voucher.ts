import type { bookingStatus, docType, paymentStatus } from "@/lib/db/schema/enums";

export type BookingVoucherDto = {
  id: string;
  code: string; // WY-####
  status: (typeof bookingStatus.enumValues)[number]; // pending | confirmed | cancelled
  paxCount: number;
  totalCents: number; // PEN
  startsAt: Date; // departures.starts_at
  package: {
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
  travelers: {
    firstName: string;
    lastName: string;
    docType: (typeof docType.enumValues)[number];
    docNumberMasked: string; // ****5678 (últimos 4), nunca el número completo
    isPrimary: boolean;
  }[]; // principal primero
  chargedUsdCents: number | null; // D10
  paymentStatus: (typeof paymentStatus.enumValues)[number] | null; // último payment
};

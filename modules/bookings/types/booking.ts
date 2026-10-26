import type { docType } from "@/lib/db/schema/enums";
import type { BookingAmount } from "@/modules/payments";

export type DocType = (typeof docType.enumValues)[number];

export type NewBookingInput = {
  customerId: string; // users.id (del token de Clerk, nunca del cliente)
  departureId: string;
  paxCount: number;
  amount: BookingAmount; // de getBookingAmount (snapshot)
  contact: { email: string; phone: string };
  traveler: { firstName: string; lastName: string; docType: DocType; docNumber: string };
};

export type CreatedBooking = { id: string; code: string };

export type BookingErrorCode = "departure_unavailable" | "insufficient_seats";

export class BookingError extends Error {
  readonly code: BookingErrorCode;
  readonly seatsLeft?: number; // solo con insufficient_seats

  constructor(code: BookingErrorCode, seatsLeft?: number) {
    super(code);
    this.name = "BookingError";
    this.code = code;
    this.seatsLeft = seatsLeft;
  }
}

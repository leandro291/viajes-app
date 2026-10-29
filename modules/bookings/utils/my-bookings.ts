import type { MyBookingDto, MyBookingPayment, MyBookingRow } from "../types/my-bookings";
import { cancelBlock, freeCancelDeadline } from "./cancellation";

/** Mapea una fila + su último pago al DTO. No copia customerId, contacto ni documentos. */
export function toMyBookingDto(
  row: MyBookingRow,
  payment: MyBookingPayment | null,
  now: Date,
): MyBookingDto {
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    paxCount: row.paxCount,
    totalCents: row.totalCents,
    startsAt: row.startsAt,
    departureStatus: row.departureStatus,
    package: {
      slug: row.slug,
      title: row.title,
      coverImageUrl: row.coverImageUrl,
      destinationName: row.destinationName,
    },
    paymentStatus: payment?.status ?? null,
    refundableUsdCents: payment?.status === "succeeded" ? payment.amountCents : null,
    freeCancelUntil: freeCancelDeadline(row.startsAt),
    canCancel:
      cancelBlock(
        { status: row.status, departureStatus: row.departureStatus, startsAt: row.startsAt },
        now,
      ) === null,
  };
}

/** D9: próximas = no cancelada y startsAt >= now (ascendente); el resto, descendente. */
export function partitionMyBookings(
  list: MyBookingDto[],
  now: Date,
): { upcoming: MyBookingDto[]; past: MyBookingDto[] } {
  const t = now.getTime();
  const isUpcoming = (b: MyBookingDto) => b.status !== "cancelled" && b.startsAt.getTime() >= t;
  return {
    upcoming: list.filter(isUpcoming).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()),
    past: list.filter((b) => !isUpcoming(b)).sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime()),
  };
}

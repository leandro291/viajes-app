export type CustomerRow = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  bookingsCount: number;
  totalCents: number;
  lastBookingAt: Date | null;
};

export type CustomerRowDto = {
  id: string;
  name: string | null;
  email: string;
  bookingsCount: number;
  totalCents: number; // PEN, solo reservas confirmadas
  lastBookingAt: Date | null;
};

export function toCustomerRowDto(row: CustomerRow): CustomerRowDto {
  const name =
    [row.firstName, row.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || null;

  return {
    id: row.id,
    name,
    email: row.email,
    bookingsCount: row.bookingsCount,
    totalCents: row.totalCents,
    lastBookingAt: row.lastBookingAt,
  };
}

import { and, desc, eq, sql } from "drizzle-orm";

import { bookings, db, users } from "@/lib/db";

import { toCustomerRowDto, type CustomerRowDto } from "../utils/customer-row";

export const CUSTOMERS_LIMIT = 100;

// Solo lectura, sin caché. Agregados sobre reservas confirmadas (ERM §Derivado):
// el LEFT JOIN deja a los clientes sin reservas con 0 / S/ 0 / sin fecha.
// ponytail: tope fijo sin paginar; paginar con `pagina` cuando haya más de 100 clientes.
export async function listCustomers(): Promise<CustomerRowDto[]> {
  const lastBookingAt = sql<Date | null>`max(${bookings.createdAt})`.mapWith(bookings.createdAt);

  const rows = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      bookingsCount: sql<number>`count(${bookings.id})`.mapWith(Number),
      totalCents: sql<number>`coalesce(sum(${bookings.totalCents}), 0)`.mapWith(Number),
      lastBookingAt,
    })
    .from(users)
    .leftJoin(bookings, and(eq(bookings.customerId, users.id), eq(bookings.status, "confirmed")))
    .where(eq(users.role, "customer"))
    .groupBy(users.id)
    .orderBy(sql`${lastBookingAt} desc nulls last`, desc(users.createdAt))
    .limit(CUSTOMERS_LIMIT);

  return rows.map(toCustomerRowDto);
}

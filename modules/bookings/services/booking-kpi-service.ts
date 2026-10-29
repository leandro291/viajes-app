import { and, count, gte, lt, sql } from "drizzle-orm";

import { bookings, db } from "@/lib/db";
import type { DateRange } from "@/lib/lima-time";

import type { BookingKpis } from "../types/booking-kpis";
import { toBookingKpis } from "../utils/booking-kpis";

// Lectura global, sin caché (D5, D8). Período = created_at en [from, to) (D4).
// Los tres estados del enum son todos los que cuentan, así que total = count(*).
export async function getBookingKpis(range: DateRange): Promise<BookingKpis> {
  const [row] = await db
    .select({
      totalCount: count(),
      confirmedCount: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed')`.mapWith(
        Number,
      ),
      cancelledCount: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')`.mapWith(
        Number,
      ),
      revenueCents:
        sql<number>`coalesce(sum(${bookings.totalCents}) filter (where ${bookings.status} = 'confirmed'), 0)`.mapWith(
          Number,
        ),
    })
    .from(bookings)
    .where(and(gte(bookings.createdAt, range.from), lt(bookings.createdAt, range.to)));

  return toBookingKpis(row);
}

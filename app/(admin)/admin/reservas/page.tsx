import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/shared/page-skeleton";
import { AdminBookingsPage } from "@/modules/bookings";

export const metadata: Metadata = { title: "Reservas" };

export default function AdminReservasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-ink">Reservas</h1>
      <Suspense fallback={<PageSkeleton />}>
        <AdminBookingsPage searchParams={searchParams} />
      </Suspense>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { AuthError, requireRole } from "@/lib/auth/require-role";
import { getUserByClerkId } from "@/modules/users";

import { getMyBookings } from "../services/my-bookings-service";
import type { MyBookingDto } from "../types/my-bookings";
import { partitionMyBookings } from "../utils/my-bookings";
import { MyBookingCard } from "./my-booking-card";

export function MyBookingsPage() {
  // Sesión de runtime: dentro de Suspense.
  return (
    <div className="flex flex-col gap-10 py-10">
      <h1 className="font-display text-[clamp(36px,5vw,58px)] font-extrabold leading-none tracking-[-0.03em] text-ink">
        Mis reservas
      </h1>
      <Suspense fallback={<MyBookingsSkeleton />}>
        <MyBookingsContent />
      </Suspense>
    </div>
  );
}

async function MyBookingsContent() {
  let clerkId: string | null = null;
  try {
    clerkId = (await requireRole("customer")).userId;
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
  }
  if (!clerkId) notFound();

  const user = await getUserByClerkId(clerkId);
  if (!user) notFound();

  const list = await getMyBookings(user.id);
  if (list.length === 0) return <EmptyState />;

  const { upcoming, past } = partitionMyBookings(list, new Date());
  return (
    <>
      <BookingSection title="Próximas" bookings={upcoming} />
      <BookingSection title="Anteriores y canceladas" bookings={past} />
    </>
  );
}

function BookingSection({ title, bookings }: { title: string; bookings: MyBookingDto[] }) {
  if (bookings.length === 0) return null;
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-[clamp(26px,3vw,34px)] leading-[1.05] tracking-[-0.03em] text-ink">{title}</h2>
      <ul className="m-0 flex list-none flex-col gap-5 p-0">
        {bookings.map((b) => (
          <li key={b.id}>
            <MyBookingCard booking={b} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-start gap-5 rounded-[22px] border border-border bg-surface p-8">
      <p className="text-xl font-bold text-ink">Todavía no tienes reservas</p>
      <Button variant="cta" nativeButton={false} render={<Link href="/paquetes" />}>
        Explorar paquetes
      </Button>
    </div>
  );
}

function MyBookingsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-5">
      <span className="sr-only">Cargando tus reservas…</span>
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden
          className="h-52 animate-pulse rounded-[22px] bg-sand motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

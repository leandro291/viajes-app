import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { AuthError, requireRole } from "@/lib/auth/require-role";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { getBookingVoucher, type BookingVoucherDto } from "@/modules/bookings";
import { getUserByClerkId } from "@/modules/users";

import { BookingVoucher } from "./booking-voucher";
import { CheckoutNotice } from "./checkout-notice";
import { CheckoutSkeleton } from "./checkout-skeleton";
import { ConfirmationHelp } from "./confirmation-help";
import { ConfirmationHero } from "./confirmation-hero";
import { ConfirmationMeeting } from "./confirmation-meeting";
import { ConfirmationNextSteps } from "./confirmation-next-steps";
import { ConfirmationRefresher } from "./confirmation-refresher";

const PACKAGES_HREF = "/paquetes";

export function ConfirmationPage({ params }: { params: Promise<{ code: string }> }) {
  // Sesión y params son de runtime: dentro de Suspense (D4, D5).
  return (
    <Suspense
      fallback={
        <div className="py-10">
          <CheckoutSkeleton />
        </div>
      }
    >
      <ConfirmationContent params={params} />
    </Suspense>
  );
}

async function ConfirmationContent({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // D3: sin sesión válida, sin usuario o sin reserva propia -> el mismo 404 (D1).
  let clerkId: string | null = null;
  try {
    clerkId = (await requireRole("customer")).userId;
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
  }
  if (!clerkId) notFound();

  const user = await getUserByClerkId(clerkId);
  if (!user) notFound();

  const booking = await getBookingVoucher(code, user.id);
  if (!booking) notFound();

  if (booking.status === "pending") return <PendingView />;
  if (booking.status === "cancelled") return <CancelledView booking={booking} />;
  return <ConfirmedView booking={booking} />;
}

function PendingView() {
  return (
    <div className="flex flex-col items-start gap-5 py-10">
      <div role="status" className="flex flex-col items-start gap-5">
        <StatusBadge status="pending" label="Confirmando pago…" />
        <h1 className="font-display text-[clamp(36px,5vw,58px)] font-extrabold leading-none tracking-[-0.03em]">
          Estamos confirmando tu pago
        </h1>
      </div>
      <ConfirmationRefresher />
    </div>
  );
}

function CancelledView({ booking }: { booking: BookingVoucherDto }) {
  const refunded =
    booking.paymentStatus === "refunded" || booking.paymentStatus === "partially_refunded";
  return (
    <div className="py-10">
      <CheckoutNotice
        title="Esta reserva fue cancelada"
        message={`No se confirmó tu lugar en esta salida.${refunded ? " Te reembolsamos el pago." : ""}`}
        action={{ label: "Ver paquetes", href: PACKAGES_HREF }}
      />
    </div>
  );
}

function ConfirmedView({ booking }: { booking: BookingVoucherDto }) {
  const helpHref = buildWhatsAppUrl(
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER,
    `Hola Wayra, necesito ayuda con mi reserva ${booking.code}.`,
  );
  const { package: pkg } = booking;

  return (
    <>
      <ConfirmationHero coverImageUrl={pkg.coverImageUrl} />
      {/* Solape sobre el hero (-110 / -64 px); al imprimir sin solapa. Div: el <main> ya lo pone SiteShell. */}
      <div className="relative z-[4] mx-auto -mt-16 flex w-full max-w-[1000px] flex-col gap-[72px] px-4 pb-[104px] sm:-mt-[110px] sm:px-6 print:mt-0 print:pb-0">
        <div className="flex flex-col gap-6">
          <BookingVoucher booking={booking} />
        </div>
        <ConfirmationMeeting
          meetingPoint={pkg.meetingPoint}
          lat={pkg.meetingLat}
          lng={pkg.meetingLng}
          startsAt={booking.startsAt}
        />
        <ConfirmationNextSteps />
        {helpHref && <ConfirmationHelp href={helpHref} />}
        <Link
          href={PACKAGES_HREF}
          className="inline-flex min-h-11 items-center justify-center self-center p-2.5 text-[17px] font-bold text-primary print:hidden"
        >
          Seguir explorando paquetes →
        </Link>
      </div>
    </>
  );
}

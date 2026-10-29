"use client";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";

import { cancelBookingAction } from "../actions/cancel-booking-action";

export function CancelBookingButton({
  code,
  refundableUsdCents,
}: {
  code: string;
  refundableUsdCents: number | null;
}) {
  const refund =
    refundableUsdCents === null
      ? "Te devolveremos el pago"
      : `Te devolveremos ${formatUsd(refundableUsdCents)}`;

  return (
    <ConfirmActionDialog
      trigger={
        <Button
          variant="outline"
          className="h-auto min-h-11 rounded-full border-[1.5px] border-ink px-5 py-3 text-base font-bold text-ink hover:bg-ink hover:text-white"
        >
          Cancelar reserva
        </Button>
      }
      title={`¿Cancelar la reserva ${code}?`}
      description={`Es gratis. ${refund} a la tarjeta con la que pagaste; tu banco puede tardar unos días en mostrarlo. Esta acción no se puede deshacer.`}
      confirmLabel="Sí, cancelar reserva"
      pendingLabel="Cancelando…"
      dismissLabel="Mantener reserva"
      onConfirm={() => cancelBookingAction(code)}
    />
  );
}

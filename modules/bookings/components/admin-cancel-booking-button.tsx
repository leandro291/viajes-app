"use client";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Button } from "@/components/ui/button";

import { cancelBookingAsAdminAction } from "../actions/admin-cancel-booking-action";

const DESCRIPTION = {
  confirmed: "Se liberan los lugares y se reembolsa el pago completo al cliente.",
  pending: "No hay cobro que reembolsar y se cierra el pago pendiente.",
} as const;

export function AdminCancelBookingButton({
  code,
  status,
}: {
  code: string;
  status: "pending" | "confirmed";
}) {
  return (
    <ConfirmActionDialog
      trigger={
        <Button
          variant="outline"
          aria-label={`Cancelar reserva ${code}`}
          className="h-auto min-h-11 min-w-11 rounded-full px-4 font-bold"
        >
          Cancelar
        </Button>
      }
      title={`¿Cancelar la reserva ${code}?`}
      description={`${DESCRIPTION[status]} Esta acción no se puede deshacer.`}
      confirmLabel="Sí, cancelar reserva"
      pendingLabel="Cancelando…"
      dismissLabel="Mantener reserva"
      onConfirm={() => cancelBookingAsAdminAction(code)}
    />
  );
}

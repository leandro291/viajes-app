"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Button } from "@/components/ui/button";

import { deleteDestinationAction } from "../actions/destination-actions";

// Si la action devuelve HAS_PACKAGES, ConfirmActionDialog mantiene el diálogo abierto con el message.
export function DestinationRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="destructive" aria-label={`Eliminar ${name}`}>
          <Trash2 aria-hidden="true" />
          Eliminar
        </Button>
      }
      title={`Eliminar «${name}»`}
      description="Se borrará el destino con su clima, lugares imperdibles y preguntas frecuentes. Esta acción no se puede deshacer. Si tiene paquetes asociados, no se podrá eliminar."
      confirmLabel="Eliminar"
      onConfirm={async () => {
        try {
          const result = await deleteDestinationAction(id);
          if (!result.ok) return { ok: false, message: result.message };
          router.refresh();
          return { ok: true };
        } catch {
          return { ok: false, message: "No pudimos completar la acción. Inténtalo de nuevo." };
        }
      }}
    />
  );
}

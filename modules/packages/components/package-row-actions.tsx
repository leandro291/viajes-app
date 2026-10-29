"use client";

import { CircleAlert, EyeOff, Rocket, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import {
  deletePackageAdminAction,
  setPackageStatusAdminAction,
} from "../actions/admin-package-actions";
import { deletePackageAction, setPackageStatusAction } from "../actions/package-actions";
import type { OwnPackageListItem } from "../services/own-package-service";
import type { OrganizerScope } from "../types/package-manage";
import { MANAGE_MESSAGES } from "../utils/manage-gate";

const ACTIONS = {
  organizer: { setStatus: setPackageStatusAction, remove: deletePackageAction },
  admin: { setStatus: setPackageStatusAdminAction, remove: deletePackageAdminAction },
};

const PENDING_HINT =
  "Tu cuenta debe estar activa para publicar. Mientras tanto guarda como borrador.";

type PackageRowActionsProps = {
  item: OwnPackageListItem;
  panel?: "organizer" | "admin";
  organizerStatus: OrganizerScope["status"];
};

// Root `contents`: los botones fluyen en el contenedor de acciones de la fila; los mensajes ocupan toda la línea.
export function PackageRowActions({ item, panel = "organizer", organizerStatus }: PackageRowActionsProps) {
  const actions = ACTIONS[panel];
  const router = useRouter();
  const hintId = useId();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const suspended = organizerStatus === "suspended";
  const isPublished = item.status === "published";
  const publishBlocked = !isPublished && organizerStatus === "pending";

  function toggleStatus() {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await actions.setStatus(
          item.id,
          isPublished ? "draft" : "published",
        );
        if (!result.ok) {
          setMessage(result.message);
          return;
        }
        router.refresh();
      } catch {
        setMessage(MANAGE_MESSAGES.UNKNOWN);
      }
    });
  }

  return (
    <div className="contents">
      <Button
        variant="outline"
        disabled={suspended || pending || publishBlocked}
        aria-describedby={publishBlocked ? hintId : undefined}
        onClick={toggleStatus}
      >
        {isPublished ? <EyeOff aria-hidden="true" /> : <Rocket aria-hidden="true" />}
        {isPublished ? "Pasar a borrador" : "Publicar"}
      </Button>
      <ConfirmActionDialog
        trigger={
          <Button variant="destructive" disabled={suspended || pending}>
            <Trash2 aria-hidden="true" />
            Eliminar
          </Button>
        }
        title={`Eliminar «${item.title}»`}
        description="Se borrará el paquete con su itinerario e imágenes. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        onConfirm={async () => {
          const result = await actions.remove(item.id);
          if (!result.ok) return { ok: false, message: result.message };
          router.refresh();
          return { ok: true };
        }}
      />
      {publishBlocked && (
        <p id={hintId} className="w-full text-base text-ink-muted">
          {PENDING_HINT}
        </p>
      )}
      {message && (
        <Alert variant="destructive" role="alert" className="w-full">
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-base">{message}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}

"use client";

import { Ban, Check, RotateCcw, X, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Button } from "@/components/ui/button";

import { setOperatorStatusAction } from "../actions/operator-actions";
import type { OrganizerStatus } from "../types/organizer";
import { OPERATOR_MESSAGES, type OperatorTarget } from "../types/organizer-manage";

type RowAction = {
  label: string;
  Icon: LucideIcon;
  target: OperatorTarget;
  pendingLabel: string;
  description: string;
};

const APPROVE_NOTE =
  "Si el operador tiene la sesión abierta, verá el cambio en menos de un minuto o al volver a entrar.";

const APPROVE: RowAction = {
  label: "Aprobar",
  Icon: Check,
  target: "active",
  pendingLabel: "Aprobando…",
  description: `Podrá publicar paquetes y ofertas. ${APPROVE_NOTE}`,
};
const REJECT: RowAction = {
  label: "Rechazar",
  Icon: X,
  target: "suspended",
  pendingLabel: "Rechazando…",
  description: "No podrá publicar ni editar hasta que lo reactives.",
};
const SUSPEND: RowAction = {
  label: "Suspender",
  Icon: Ban,
  target: "suspended",
  pendingLabel: "Suspendiendo…",
  description: "No podrá publicar ni editar hasta que lo reactives. Conserva el acceso a su panel.",
};
const REACTIVATE: RowAction = {
  label: "Reactivar",
  Icon: RotateCcw,
  target: "active",
  pendingLabel: "Reactivando…",
  description: `Volverá a poder publicar paquetes y ofertas. ${APPROVE_NOTE}`,
};

const ACTIONS_BY_STATUS: Record<OrganizerStatus, RowAction[]> = {
  pending: [APPROVE, REJECT],
  active: [SUSPEND],
  suspended: [REACTIVATE],
};

type OperatorStatusActionsProps = { id: string; businessName: string; status: OrganizerStatus };

export function OperatorStatusActions({ id, businessName, status }: OperatorStatusActionsProps) {
  const router = useRouter();

  return (
    <>
      {ACTIONS_BY_STATUS[status].map(({ label, Icon, target, pendingLabel, description }) => (
        <ConfirmActionDialog
          key={label}
          trigger={
            <Button variant="outline" aria-label={`${label} a ${businessName}`}>
              <Icon aria-hidden="true" />
              {label}
            </Button>
          }
          title={`${label} a «${businessName}»`}
          description={description}
          confirmLabel={label}
          pendingLabel={pendingLabel}
          onConfirm={async () => {
            try {
              const result = await setOperatorStatusAction(id, target);
              if (!result.ok) return { ok: false, message: result.message };
              router.refresh();
              return { ok: true };
            } catch {
              return { ok: false, message: OPERATOR_MESSAGES.UNKNOWN };
            }
          }}
        />
      ))}
    </>
  );
}

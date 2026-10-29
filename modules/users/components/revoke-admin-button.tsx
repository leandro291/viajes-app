"use client";

import { UserMinus } from "lucide-react";
import { useRouter } from "next/navigation";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Button } from "@/components/ui/button";

import { revokeAdminAction } from "../actions/admin-actions";
import { ADMIN_MESSAGES } from "../types/admin-manage";

type RevokeAdminButtonProps = { id: string; label: string };

export function RevokeAdminButton({ id, label }: RevokeAdminButtonProps) {
  const router = useRouter();

  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="outline" aria-label={`Quitar acceso a ${label}`}>
          <UserMinus aria-hidden="true" />
          Quitar acceso
        </Button>
      }
      title={`Quitar acceso a «${label}»`}
      description="Dejará de ser administrador y volverá a ser cliente. Si tiene la sesión abierta, el acceso puede tardar hasta un minuto en cerrarse."
      confirmLabel="Quitar acceso"
      pendingLabel="Quitando…"
      onConfirm={async () => {
        try {
          const result = await revokeAdminAction(id);
          if (!result.ok) return { ok: false, message: result.message };
          router.refresh();
          return { ok: true };
        } catch {
          return { ok: false, message: ADMIN_MESSAGES.UNKNOWN };
        }
      }}
    />
  );
}

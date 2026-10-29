"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

import { deleteOfferAdminAction } from "../actions/admin-offer-actions";
import { deleteOfferAction } from "../actions/offer-actions";
import type { OfferFormOptions, OwnOfferItem } from "../types/offer-manage";
import {
  describeOfferTerms,
  OFFER_STATE_BADGE,
  OFFER_STATE_LABELS,
  type OfferState,
} from "../utils/offer-rules";
import { formatValidUntil, OFFER_KIND_LABELS } from "../utils/offer-view";
import { OwnOfferForm } from "./own-offer-form";

const DELETE_ACTION = { organizer: deleteOfferAction, admin: deleteOfferAdminAction };

export function OwnOfferRow({
  item,
  state,
  options,
  minDate,
  disabled,
  panel = "organizer",
}: {
  item: OwnOfferItem;
  state: OfferState;
  options: OfferFormOptions;
  minDate: string;
  disabled: boolean;
  panel?: "organizer" | "admin";
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const off = disabled || pending;

  if (editing) {
    return (
      <li className="py-4">
        <OwnOfferForm
          mode="edit"
          panel={panel}
          item={item}
          options={options}
          minDate={minDate}
          disabled={disabled}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  const { discount, min } = describeOfferTerms(item);
  const validity = item.validUntil
    ? `Hasta el ${formatValidUntil(item.validUntil.toISOString())}`
    : "Sin vencimiento";

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-bold text-ink">{item.packageTitle}</p>
        {panel === "admin" && (
          <p className="break-words text-ink-muted">{item.organizerName}</p>
        )}
        <p className="text-ink">{OFFER_KIND_LABELS[item.kind]}</p>
        <p className="text-ink">
          {discount} · {min}
        </p>
        <p className="text-ink-muted">{validity}</p>
        {item.packageStatus === "draft" && (
          <p className="text-ink-muted">
            Paquete en borrador: la oferta no se muestra al público hasta que lo publiques
          </p>
        )}
        <div className="mt-2">
          <StatusBadge status={OFFER_STATE_BADGE[state]} label={OFFER_STATE_LABELS[state]} />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" disabled={off} onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" />
          Editar
        </Button>
        <ConfirmActionDialog
          trigger={
            <Button variant="destructive" disabled={off}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </Button>
          }
          title="Eliminar oferta"
          description={`Se eliminará la oferta de ${item.packageTitle}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={async () => {
            const result = await DELETE_ACTION[panel](item.id);
            if (!result.ok) return { ok: false, message: result.message };
            startTransition(() => router.refresh());
            return { ok: true };
          }}
        />
      </div>
    </li>
  );
}

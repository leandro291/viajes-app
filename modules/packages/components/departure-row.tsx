"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

import { deleteDepartureAction } from "../actions/departure-actions";
import type { DepartureFormOptions, OwnDepartureItem } from "../services/own-departure-service";
import {
  DEPARTURE_STATUS_BADGE,
  DEPARTURE_STATUS_LABELS,
  isTerminalStatus,
  soldLabel,
} from "../utils/departure-rules";
import { formatDepartureShortDate, formatDepartureTime } from "../utils/package-detail";
import { DepartureForm } from "./departure-form";

export function DepartureRow({
  item,
  options,
  minDate,
  disabled,
}: {
  item: OwnDepartureItem;
  options: DepartureFormOptions;
  minDate: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const off = disabled || pending;

  if (editing) {
    return (
      <li className="py-4">
        <DepartureForm
          mode="edit"
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

  const { sold, left } = soldLabel(item.bookedSeats, item.capacity);
  const when = `${formatDepartureShortDate(item.startsAt)} · ${formatDepartureTime(item.startsAt)}`;

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-bold text-ink">{item.packageTitle}</p>
        <p className="text-ink">{when}</p>
        <p className="break-words text-ink-muted">{item.guideName ?? "Sin guía"}</p>
        <p className="text-ink-muted">
          {sold} · {left}
        </p>
        <div className="mt-2">
          <StatusBadge
            status={DEPARTURE_STATUS_BADGE[item.status]}
            label={DEPARTURE_STATUS_LABELS[item.status]}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {!isTerminalStatus(item.status) && (
          <Button variant="outline" disabled={off} onClick={() => setEditing(true)}>
            <Pencil aria-hidden="true" />
            Editar
          </Button>
        )}
        <ConfirmActionDialog
          trigger={
            <Button variant="destructive" disabled={off}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </Button>
          }
          title="Eliminar salida"
          description={`Se eliminará la salida de ${item.packageTitle} del ${when}. Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={async () => {
            const result = await deleteDepartureAction(item.id);
            if (!result.ok) return { ok: false, message: result.message };
            startTransition(() => router.refresh());
            return { ok: true };
          }}
        />
      </div>
    </li>
  );
}

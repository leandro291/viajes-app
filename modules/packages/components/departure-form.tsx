"use client";

import { CircleAlert, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { createDepartureAction, updateDepartureAction } from "../actions/departure-actions";
import {
  departureInputSchema,
  departureUpdateSchema,
  MAX_DEPARTURE_CAPACITY,
} from "../schemas/departure-schema";
import type { DepartureFormOptions, OwnDepartureItem } from "../services/own-departure-service";
import type { ManageResult } from "../types/package-manage";
import {
  allowedNextStatuses,
  DEPARTURE_STATUS_LABELS,
  type DepartureStatus,
} from "../utils/departure-rules";
import { instantToLimaParts } from "../utils/departure-time";
import { toFieldErrors } from "../utils/field-errors";
import { MANAGE_MESSAGES } from "../utils/manage-gate";

type DepartureFormProps =
  | { mode: "create"; options: DepartureFormOptions; minDate: string; disabled: boolean }
  | {
      mode: "edit";
      item: OwnDepartureItem;
      options: DepartureFormOptions;
      minDate: string;
      disabled: boolean;
      onDone: () => void;
      onCancel: () => void;
    };

// Entrada cruda: es lo que validan los schemas y lo que reciben las actions.
type Values = {
  packageId: string;
  date: string;
  time: string;
  capacity: string;
  guideId: string;
  status: DepartureStatus;
};

// NativeSelect solo deja estilar el contenedor: se llega al <select> con variantes.
const selectClass =
  "w-full [&_select]:h-[52px] [&_select]:rounded-field [&_select]:border-[1.5px] [&_select]:border-border-field [&_select]:bg-surface [&_select]:pl-4 [&_select]:pr-10 [&_select]:text-base [&_select]:aria-invalid:border-destructive";

function initialValues(props: DepartureFormProps): Values {
  if (props.mode === "create") {
    return { packageId: "", date: "", time: "", capacity: "", guideId: "", status: "scheduled" };
  }
  const { item } = props;
  return {
    packageId: item.packageId,
    ...instantToLimaParts(item.startsAt),
    capacity: String(item.capacity),
    guideId: item.guideId ?? "",
    status: item.status,
  };
}

export function DepartureForm(props: DepartureFormProps) {
  const { options, minDate, disabled } = props;
  const router = useRouter();
  const prefix = useId();
  const [values, setValues] = useState(() => initialValues(props));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const off = disabled || pending;

  const edit = props.mode === "edit" ? props : null;
  const booked = edit?.item.bookedSeats ?? 0;
  const dateLocked = booked > 0;
  // Solo el estado actual y los siguientes permitidos; sin "Cancelada" con cupos vendidos.
  const statusOptions = edit
    ? [edit.item.status, ...allowedNextStatuses(edit.item.status)].filter(
        (s) => !(booked > 0 && s === "cancelled"),
      )
    : [];
  const packageTitle = edit?.item.packageTitle;

  const set = (key: keyof Values) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  function selectPackage(packageId: string) {
    const pkg = options.packages.find((p) => p.id === packageId);
    setValues((v) => ({
      ...v,
      packageId,
      capacity: pkg ? String(pkg.maxGroupSize) : v.capacity,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { status, packageId, ...rest } = values;
    const parsed = edit
      ? departureUpdateSchema.safeParse({ ...rest, status })
      : departureInputSchema.safeParse({ ...rest, packageId });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setMessage(MANAGE_MESSAGES.INVALID_INPUT);
      return;
    }
    startTransition(async () => {
      let result: ManageResult;
      try {
        result = edit
          ? await updateDepartureAction(edit.item.id, { ...rest, status })
          : await createDepartureAction({ ...rest, packageId });
      } catch {
        result = { ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN };
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        // STALE y similares: la lista debe reflejar el estado real.
        router.refresh();
        return;
      }
      setErrors({});
      setMessage(null);
      if (edit) edit.onDone();
      else setValues(initialValues(props));
      router.refresh();
    });
  }

  const idOf = (key: string) => `${prefix}-${key}`;
  const describedBy = (key: string, extra?: string) => {
    const ids = [extra, errors[key] ? `${idOf(key)}-error` : undefined].filter(Boolean);
    return ids.length ? ids.join(" ") : undefined;
  };
  const invalid = (key: string) => (errors[key] ? true : undefined);
  const fieldError = (key: string) =>
    errors[key] ? <FieldError id={`${idOf(key)}-error`}>{errors[key]}</FieldError> : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {message && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={invalid("packageId")} className="min-w-0">
          <FieldLabel htmlFor={idOf("packageId")}>Paquete</FieldLabel>
          {edit ? (
            <Input
              id={idOf("packageId")}
              value={packageTitle}
              readOnly
              disabled
            />
          ) : (
            <NativeSelect
              id={idOf("packageId")}
              name="packageId"
              value={values.packageId}
              disabled={off}
              aria-invalid={invalid("packageId")}
              aria-describedby={describedBy("packageId")}
              onChange={(e) => selectPackage(e.target.value)}
              className={selectClass}
            >
              <NativeSelectOption value="">Elige un paquete</NativeSelectOption>
              {options.packages.map((p) => (
                <NativeSelectOption key={p.id} value={p.id}>
                  {p.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
          {fieldError("packageId")}
        </Field>

        <Field data-invalid={invalid("capacity")} className="min-w-0">
          <FieldLabel htmlFor={idOf("capacity")}>Capacidad</FieldLabel>
          <Input
            id={idOf("capacity")}
            name="capacity"
            type="number"
            inputMode="numeric"
            min={Math.max(1, booked)}
            max={MAX_DEPARTURE_CAPACITY}
            step={1}
            value={values.capacity}
            disabled={off}
            aria-invalid={invalid("capacity")}
            aria-describedby={describedBy("capacity")}
            onChange={(e) => set("capacity")(e.target.value)}
          />
          {fieldError("capacity")}
        </Field>

        <Field data-invalid={invalid("date")} className="min-w-0">
          <FieldLabel htmlFor={idOf("date")}>Fecha</FieldLabel>
          <Input
            id={idOf("date")}
            name="date"
            type="date"
            min={minDate}
            value={values.date}
            disabled={off || dateLocked}
            aria-invalid={invalid("date")}
            aria-describedby={describedBy("date", dateLocked ? idOf("locked") : undefined)}
            onChange={(e) => set("date")(e.target.value)}
          />
          {fieldError("date")}
        </Field>

        <Field data-invalid={invalid("time")} className="min-w-0">
          <FieldLabel htmlFor={idOf("time")}>Hora (Lima)</FieldLabel>
          <Input
            id={idOf("time")}
            name="time"
            type="time"
            value={values.time}
            disabled={off || dateLocked}
            aria-invalid={invalid("time")}
            aria-describedby={describedBy("time", dateLocked ? idOf("locked") : undefined)}
            onChange={(e) => set("time")(e.target.value)}
          />
          {fieldError("time")}
        </Field>

        {dateLocked && (
          <FieldDescription id={idOf("locked")} className="sm:col-span-2">
            Esta salida ya tiene cupos vendidos ({booked}): no puedes cambiar su fecha ni su hora, y
            la capacidad no puede bajar de {booked}.
          </FieldDescription>
        )}

        <Field data-invalid={invalid("guideId")} className="min-w-0">
          <FieldLabel htmlFor={idOf("guideId")}>Guía (opcional)</FieldLabel>
          <NativeSelect
            id={idOf("guideId")}
            name="guideId"
            value={values.guideId}
            disabled={off}
            aria-invalid={invalid("guideId")}
            aria-describedby={describedBy(
              "guideId",
              options.guides.length === 0 ? idOf("no-guides") : undefined,
            )}
            onChange={(e) => set("guideId")(e.target.value)}
            className={selectClass}
          >
            <NativeSelectOption value="">Sin guía</NativeSelectOption>
            {options.guides.map((g) => (
              <NativeSelectOption key={g.id} value={g.id}>
                {g.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {options.guides.length === 0 && (
            <FieldDescription id={idOf("no-guides")}>
              Aún no tienes guías.{" "}
              <Link href="/operador/guias">Agrega una guía</Link>
            </FieldDescription>
          )}
          {fieldError("guideId")}
        </Field>

        {edit && (
          <Field data-invalid={invalid("status")} className="min-w-0">
            <FieldLabel htmlFor={idOf("status")}>Estado</FieldLabel>
            <NativeSelect
              id={idOf("status")}
              name="status"
              value={values.status}
              disabled={off}
              aria-invalid={invalid("status")}
              aria-describedby={describedBy("status")}
              onChange={(e) => set("status")(e.target.value)}
              className={selectClass}
            >
              {statusOptions.map((s) => (
                <NativeSelectOption key={s} value={s}>
                  {DEPARTURE_STATUS_LABELS[s]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {fieldError("status")}
          </Field>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant={edit ? "default" : "cta"} disabled={off}>
          {!edit && <Plus aria-hidden="true" />}
          {pending ? "Guardando…" : edit ? "Guardar" : "Crear salida"}
        </Button>
        {edit && (
          <Button type="button" variant="ghost" disabled={pending} onClick={edit.onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

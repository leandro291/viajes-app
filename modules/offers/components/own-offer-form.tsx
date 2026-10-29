"use client";

import { CircleAlert, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import type { ZodError } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { instantToLimaParts } from "@/lib/lima-time";
// Solo tipos: el barrel de packages arrastra lib/db al bundle cliente.
import type { ManageResult } from "@/modules/packages";

import { createOfferAction, updateOfferAction } from "../actions/offer-actions";
import {
  MAX_OFFER_MIN_PEOPLE,
  MAX_OFFER_PERCENT,
  offerInputSchema,
  offerUpdateSchema,
} from "../schemas/offer-schema";
import type { DiscountType, OfferKind } from "../types/offer";
import type { OfferFormOptions, OwnOfferItem } from "../types/offer-manage";
import { OFFER_KIND_LABELS } from "../utils/offer-view";

type OwnOfferFormProps =
  | { mode: "create"; options: OfferFormOptions; minDate: string; disabled: boolean }
  | {
      mode: "edit";
      item: OwnOfferItem;
      options: OfferFormOptions;
      minDate: string;
      disabled: boolean;
      onDone: () => void;
      onCancel: () => void;
    };

// Entrada cruda: es lo que validan los schemas y lo que reciben las actions.
type Values = {
  packageId: string;
  kind: OfferKind | "";
  discountType: DiscountType;
  discountValue: string;
  minPeople: string;
  validUntil: string;
  isActive: boolean;
};

const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  percent: "Porcentaje",
  two_for_one: "2x1",
};

const INVALID_MESSAGE = "Revisa los campos marcados.";
const UNKNOWN_MESSAGE = "No pudimos completar la acción. Inténtalo de nuevo.";

// NativeSelect solo deja estilar el contenedor: se llega al <select> con variantes.
const selectClass =
  "w-full [&_select]:h-[52px] [&_select]:rounded-field [&_select]:border-[1.5px] [&_select]:border-border-field [&_select]:bg-surface [&_select]:pl-4 [&_select]:pr-10 [&_select]:text-base [&_select]:aria-invalid:border-destructive";

// Copia de packages/utils/field-errors.ts: el barrel de packages arrastraría lib/db al bundle cliente.
function toFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

function initialValues(props: OwnOfferFormProps): Values {
  if (props.mode === "create") {
    return {
      packageId: "",
      kind: "",
      discountType: "percent",
      discountValue: "",
      minPeople: "",
      validUntil: "",
      isActive: true,
    };
  }
  const { item } = props;
  return {
    packageId: item.packageId,
    kind: item.kind,
    discountType: item.discountType,
    discountValue: item.discountValue === null ? "" : String(item.discountValue),
    minPeople: item.minPeople === null ? "" : String(item.minPeople),
    validUntil: item.validUntil ? instantToLimaParts(item.validUntil).date : "",
    isActive: item.isActive,
  };
}

export function OwnOfferForm(props: OwnOfferFormProps) {
  const { options, minDate, disabled } = props;
  const router = useRouter();
  const prefix = useId();
  const [values, setValues] = useState(() => initialValues(props));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const off = disabled || pending;

  const edit = props.mode === "edit" ? props : null;
  const isPercent = values.discountType === "percent";
  const maxGroupSize = edit
    ? edit.item.packageMaxGroupSize
    : options.packages.find((p) => p.id === values.packageId)?.maxGroupSize;

  const set = <K extends keyof Values>(key: K) => (value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { packageId, ...rest } = values;
    // 2x1 no lleva porcentaje: se envía vacío aunque el campo oculto tenga un valor.
    const terms = { ...rest, discountValue: isPercent ? rest.discountValue : "" };
    const parsed = edit
      ? offerUpdateSchema.safeParse(terms)
      : offerInputSchema.safeParse({ ...terms, packageId });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setMessage(INVALID_MESSAGE);
      return;
    }
    startTransition(async () => {
      let result: ManageResult;
      try {
        result = edit
          ? await updateOfferAction(edit.item.id, terms)
          : await createOfferAction({ ...terms, packageId });
      } catch {
        result = { ok: false, code: "UNKNOWN", message: UNKNOWN_MESSAGE };
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        // NOT_FOUND y similares: la lista debe reflejar el estado real.
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
        <Alert variant="destructive" role="alert">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field data-invalid={invalid("packageId")} className="min-w-0">
          <FieldLabel htmlFor={idOf("packageId")}>Paquete</FieldLabel>
          {edit ? (
            <Input id={idOf("packageId")} value={edit.item.packageTitle} readOnly disabled />
          ) : (
            <NativeSelect
              id={idOf("packageId")}
              name="packageId"
              value={values.packageId}
              disabled={off}
              aria-invalid={invalid("packageId")}
              aria-describedby={describedBy("packageId")}
              onChange={(e) => set("packageId")(e.target.value)}
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

        <Field data-invalid={invalid("kind")} className="min-w-0">
          <FieldLabel htmlFor={idOf("kind")}>Tipo de oferta</FieldLabel>
          <NativeSelect
            id={idOf("kind")}
            name="kind"
            value={values.kind}
            disabled={off}
            aria-invalid={invalid("kind")}
            aria-describedby={describedBy("kind")}
            onChange={(e) => set("kind")(e.target.value as OfferKind | "")}
            className={selectClass}
          >
            <NativeSelectOption value="">Elige un tipo</NativeSelectOption>
            {(Object.keys(OFFER_KIND_LABELS) as OfferKind[]).map((k) => (
              <NativeSelectOption key={k} value={k}>
                {OFFER_KIND_LABELS[k]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {fieldError("kind")}
        </Field>

        <Field data-invalid={invalid("discountType")} className="min-w-0">
          <FieldLabel htmlFor={idOf("discountType")}>Tipo de descuento</FieldLabel>
          <NativeSelect
            id={idOf("discountType")}
            name="discountType"
            value={values.discountType}
            disabled={off}
            aria-invalid={invalid("discountType")}
            aria-describedby={describedBy("discountType")}
            onChange={(e) => set("discountType")(e.target.value as DiscountType)}
            className={selectClass}
          >
            {(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map((t) => (
              <NativeSelectOption key={t} value={t}>
                {DISCOUNT_TYPE_LABELS[t]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {fieldError("discountType")}
        </Field>

        {isPercent && (
          <Field data-invalid={invalid("discountValue")} className="min-w-0">
            <FieldLabel htmlFor={idOf("discountValue")}>Porcentaje de descuento</FieldLabel>
            <Input
              id={idOf("discountValue")}
              name="discountValue"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_OFFER_PERCENT}
              step={1}
              required
              value={values.discountValue}
              disabled={off}
              aria-invalid={invalid("discountValue")}
              aria-describedby={describedBy("discountValue")}
              onChange={(e) => set("discountValue")(e.target.value)}
            />
            {fieldError("discountValue")}
          </Field>
        )}

        <Field data-invalid={invalid("minPeople")} className="min-w-0">
          <FieldLabel htmlFor={idOf("minPeople")}>Mínimo de personas (opcional)</FieldLabel>
          <Input
            id={idOf("minPeople")}
            name="minPeople"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxGroupSize ?? MAX_OFFER_MIN_PEOPLE}
            step={1}
            value={values.minPeople}
            disabled={off}
            aria-invalid={invalid("minPeople")}
            aria-describedby={describedBy("minPeople")}
            onChange={(e) => set("minPeople")(e.target.value)}
          />
          {fieldError("minPeople")}
        </Field>

        <Field data-invalid={invalid("validUntil")} className="min-w-0">
          <FieldLabel htmlFor={idOf("validUntil")}>Vigente hasta (opcional)</FieldLabel>
          <Input
            id={idOf("validUntil")}
            name="validUntil"
            type="date"
            min={minDate}
            value={values.validUntil}
            disabled={off}
            aria-invalid={invalid("validUntil")}
            aria-describedby={describedBy("validUntil", idOf("validUntil-help"))}
            onChange={(e) => set("validUntil")(e.target.value)}
          />
          <FieldDescription id={idOf("validUntil-help")}>
            Hasta las 23:59 (hora de Lima). Vacío = sin vencimiento
          </FieldDescription>
          {fieldError("validUntil")}
        </Field>

        <Field data-invalid={invalid("isActive")} className="min-w-0 sm:col-span-2">
          <Label className="min-h-11 gap-3 text-base leading-snug">
            <Checkbox
              checked={values.isActive}
              disabled={off}
              aria-invalid={invalid("isActive")}
              aria-describedby={describedBy("isActive")}
              onCheckedChange={(checked) => set("isActive")(checked === true)}
            />
            Oferta activa
          </Label>
          {fieldError("isActive")}
        </Field>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant={edit ? "default" : "cta"} disabled={off}>
          {!edit && <Plus aria-hidden="true" />}
          {pending ? "Guardando…" : edit ? "Guardar" : "Crear oferta"}
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

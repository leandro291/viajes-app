"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Info, Lock } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { startCheckout } from "../actions/start-checkout-action";
import type { CheckoutField, CheckoutFormState } from "../types/checkout";

const initialState: CheckoutFormState = { status: "idle" };

const cardClass =
  "flex flex-col gap-[22px] rounded-card bg-surface p-[clamp(22px,3vw,32px)] shadow-card";
const labelClass = "text-sm font-bold";
// NativeSelect solo deja estilar el contenedor: se llega al <select> con variantes.
const selectClass =
  "w-full [&_select]:h-[52px] [&_select]:rounded-field [&_select]:border-[1.5px] [&_select]:border-border-field [&_select]:bg-surface [&_select]:pl-4 [&_select]:pr-10 [&_select]:text-base [&_select]:aria-invalid:border-destructive";

type Values = Record<Exclude<CheckoutField, "terms">, string>;

function SectionTitle({ n, id, children }: { n: number; id: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-[12px] bg-ink font-display font-extrabold text-white"
      >
        {n}
      </span>
      <h2 id={id} className="font-display text-2xl font-extrabold tracking-[-0.02em]">
        {children}
      </h2>
    </div>
  );
}

/**
 * Botón de pagar. Debe renderizarse DENTRO de `CheckoutForm` (vía su prop `summary`):
 * así `useFormStatus` ve el envío y el botón queda `disabled` mientras redirige.
 */
export function CheckoutSubmitButton({
  children,
  disabled = false,
}: {
  /** Texto, p. ej. "Pagar US$ 688.00". */
  children: ReactNode;
  /** Total bajo el mínimo de Stripe: `aria-disabled`, no envía. */
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="cta"
      disabled={pending}
      aria-disabled={disabled || undefined}
      onClick={disabled ? (e) => e.preventDefault() : undefined}
      className="h-14 w-full gap-2.5"
    >
      <Lock aria-hidden className="size-[18px]" strokeWidth={2.2} />
      {pending ? "Redirigiendo a Stripe…" : children}
    </Button>
  );
}

/**
 * Formulario del viajero principal + términos. Renderiza el `<form>` como grilla de dos
 * columnas: campos a la izquierda y `summary` (el `CheckoutSummary` con el
 * `CheckoutSubmitButton` como `children`) a la derecha / debajo en móvil.
 */
export function CheckoutForm({
  salida,
  viajeros,
  oferta,
  email,
  disabled,
  continueWithoutOfferHref,
  summary,
}: {
  salida: string;
  viajeros: number;
  oferta?: string;
  email: string;
  /** Total bajo el mínimo: el envío se bloquea (el botón recibe el mismo `disabled`). */
  disabled: boolean;
  continueWithoutOfferHref: string;
  summary: ReactNode;
}) {
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(startCheckout, initialState);
  // Controlados: React 19 resetea el <form> tras la acción; así se conserva lo escrito.
  const [values, setValues] = useState<Values>({
    firstName: "",
    lastName: "",
    email,
    phone: "",
    docType: "dni",
    docNumber: "",
  });
  const [terms, setTerms] = useState(false);

  const errors = (state.status === "error" && state.fieldErrors) || {};

  // Foco al primer campo inválido (en orden del DOM) tras cada respuesta con errores.
  useEffect(() => {
    if (state.status === "error" && state.fieldErrors) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [state]);

  const set = (key: keyof Values) => (v: string) =>
    setValues((prev) => ({ ...prev, [key]: v }));

  const idOf = (f: CheckoutField) => `${uid}-${f}`;
  const errOf = (f: CheckoutField) => `${uid}-${f}-error`;
  const aria = (f: CheckoutField) => ({
    "aria-invalid": errors[f] ? (true as const) : undefined,
    "aria-describedby": errors[f] ? errOf(f) : undefined,
  });
  const fieldError = (f: CheckoutField) =>
    errors[f] ? <FieldError id={errOf(f)}>{errors[f]}</FieldError> : null;

  const text = (
    f: Exclude<CheckoutField, "terms" | "docType">,
    label: string,
    props: React.ComponentProps<"input">,
  ) => (
    <Field data-invalid={errors[f] ? true : undefined} className="min-w-0">
      <Label htmlFor={idOf(f)} className={labelClass}>
        {label}
      </Label>
      <Input
        id={idOf(f)}
        name={f}
        value={values[f]}
        onChange={(e) => set(f)(e.target.value)}
        {...aria(f)}
        {...props}
      />
      {fieldError(f)}
    </Field>
  );

  return (
    <form
      ref={formRef}
      action={formAction}
      noValidate
      onSubmit={disabled ? (e) => e.preventDefault() : undefined}
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_420px]"
    >
      <input type="hidden" name="salida" value={salida} />
      <input type="hidden" name="viajeros" value={viajeros} />
      {oferta && <input type="hidden" name="oferta" value={oferta} />}

      <div className="flex min-w-0 flex-col gap-6">
        <section aria-labelledby={`${uid}-datos`} className={cardClass}>
          <SectionTitle n={1} id={`${uid}-datos`}>
            Viajero principal
          </SectionTitle>
          <div className="grid gap-[18px] sm:grid-cols-2">
            {text("firstName", "Nombres", { type: "text", autoComplete: "given-name" })}
            {text("lastName", "Apellidos", { type: "text", autoComplete: "family-name" })}
            {text("email", "Correo electrónico", { type: "email", autoComplete: "email" })}
            {text("phone", "Celular (WhatsApp)", {
              type: "tel",
              autoComplete: "tel",
              placeholder: "+51 9XX XXX XXX",
            })}
            <Field data-invalid={errors.docType ? true : undefined} className="min-w-0">
              <Label htmlFor={idOf("docType")} className={labelClass}>
                Documento
              </Label>
              <NativeSelect
                id={idOf("docType")}
                name="docType"
                value={values.docType}
                onChange={(e) => set("docType")(e.target.value)}
                className={selectClass}
                {...aria("docType")}
              >
                <NativeSelectOption value="dni">DNI</NativeSelectOption>
                <NativeSelectOption value="passport">Pasaporte</NativeSelectOption>
                <NativeSelectOption value="foreign_id">Carné de extranjería</NativeSelectOption>
              </NativeSelect>
              {fieldError("docType")}
            </Field>
            {text("docNumber", "Número de documento", {
              type: "text",
              autoComplete: "off",
              autoCapitalize: "characters",
            })}
          </div>
          <p className="flex items-start gap-2.5 rounded-[14px] bg-primary-soft px-4 py-3.5 text-sm leading-normal text-ink">
            <Info aria-hidden className="mt-px size-[18px] shrink-0 text-primary" strokeWidth={2.2} />
            Escribe tu nombre y documento tal como figuran en tu DNI o pasaporte: con ellos
            emitimos tu reserva.
          </p>
        </section>

        <section aria-labelledby={`${uid}-pago`} className={cardClass}>
          <SectionTitle n={2} id={`${uid}-pago`}>
            Pago
          </SectionTitle>
          <p className="flex items-start gap-2.5 text-[15px] leading-normal text-ink">
            <Lock aria-hidden className="mt-0.5 size-[18px] shrink-0 text-primary" strokeWidth={2.2} />
            Pagarás con tarjeta en la página segura de Stripe. No guardamos los datos de tu tarjeta.
          </p>
        </section>

        <Field data-invalid={errors.terms ? true : undefined} className="px-1">
          <Label className="items-start gap-3 text-base leading-normal font-normal">
            <Checkbox
              name="terms"
              checked={terms}
              onCheckedChange={setTerms}
              className="mt-0.5 size-[22px]"
              {...aria("terms")}
            />
            <span>
              Acepto los términos y condiciones y la política de cancelación (gratis hasta 48 h
              antes de la salida).
            </span>
          </Label>
          {fieldError("terms")}
        </Field>

        {state.status === "error" && (
          <Alert variant="destructive">
            <AlertDescription className="text-destructive">
              {state.message}
              {state.code === "offer_invalid" && (
                <>
                  {" "}
                  <Link href={continueWithoutOfferHref} className="font-bold">
                    Continuar sin oferta
                  </Link>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {summary}
    </form>
  );
}

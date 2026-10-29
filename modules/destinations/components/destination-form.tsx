"use client";

import { CircleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CATALOG_MESSAGES } from "@/lib/catalog-result";
import { toFieldErrors } from "@/lib/field-errors";

import { createDestinationAction, updateDestinationAction } from "../actions/destination-actions";
import { destinationInputSchema } from "../schemas/destination-schema";
import {
  toDestinationInput,
  type DestinationFormValues,
  type FormErrors,
} from "../utils/destination-form";
import { DestinationFormBasics } from "./destination-form-basics";
import { DestinationFormClimate } from "./destination-form-climate";
import { DestinationFormFaqs } from "./destination-form-faqs";
import { DestinationFormSights } from "./destination-form-sights";

type DestinationFormProps = {
  destinationId?: string; // solo en edit
  initialValues: DestinationFormValues;
};

// Sin botón submit y con varios inputs, Enter no envía nada: todo guardado sale del botón.
export function DestinationForm({ destinationId, initialValues }: DestinationFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);

  // Foco al primer campo inválido (orden del DOM) o, si solo hay mensaje, al resumen. Con errores
  // de servidor el estado se commitea aún con isPending=true (inputs disabled): se espera a que pase a false.
  useEffect(() => {
    if (!focusRequested.current || isPending) return;
    focusRequested.current = false;
    const invalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    const target = invalid ?? summaryRef.current;
    target?.scrollIntoView({ block: "center" });
    target?.focus();
  }, [errors, summary, isPending]);

  function showFailure(fieldErrors: FormErrors, message: string) {
    const count = Object.keys(fieldErrors).length;
    focusRequested.current = true;
    setErrors(fieldErrors);
    setSummary(count > 0 ? `${message} Errores: ${count}.` : message);
  }

  function submit() {
    const input = toDestinationInput(values);
    const parsed = destinationInputSchema.safeParse(input);
    if (!parsed.success) {
      showFailure(toFieldErrors(parsed.error), CATALOG_MESSAGES.INVALID_INPUT);
      return;
    }
    setErrors({});
    setSummary(null);
    startTransition(async () => {
      try {
        // Se envía el objeto sin validar: el servidor revalida siempre.
        const result = destinationId
          ? await updateDestinationAction(destinationId, input)
          : await createDestinationAction(input);
        if (result.ok) {
          router.replace("/admin/destinos");
          return;
        }
        showFailure(result.fieldErrors ?? {}, result.message);
      } catch {
        showFailure({}, CATALOG_MESSAGES.UNKNOWN);
      }
    });
  }

  const onChange = (patch: Partial<DestinationFormValues>) =>
    setValues((v) => ({ ...v, ...patch }));
  const sectionProps = { values, errors, disabled: isPending, onChange };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-6"
    >
      <DestinationFormBasics {...sectionProps} />
      <DestinationFormClimate {...sectionProps} />
      <DestinationFormSights {...sectionProps} />
      <DestinationFormFaqs {...sectionProps} />

      {summary && (
        <Alert ref={summaryRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-base">{summary}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="cta"
          disabled={isPending}
          className="w-full sm:w-auto"
          onClick={submit}
        >
          {isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

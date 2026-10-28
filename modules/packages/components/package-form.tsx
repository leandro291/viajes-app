"use client";

import { CircleAlert, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import { createPackageAction, updatePackageAction } from "../actions/package-actions";
import { packageInputSchema } from "../schemas/package-schema";
import type { ManageOptions } from "../services/own-package-service";
import type { OrganizerScope } from "../types/package-manage";
import { toFieldErrors } from "../utils/field-errors";
import { MANAGE_MESSAGES } from "../utils/manage-gate";
import {
  toFormErrors,
  toPackageInput,
  type FormErrors,
  type PackageFormValues,
} from "../utils/package-form";
import { PackageFormBasics } from "./package-form-basics";
import { PackageFormInclusions } from "./package-form-inclusions";
import { PackageFormItinerary } from "./package-form-itinerary";
import { PackageFormMedia } from "./package-form-media";

type PackageFormProps = {
  mode: "create" | "edit";
  packageId?: string; // solo en edit
  initialValues: PackageFormValues;
  initialStatus: "draft" | "published"; // "draft" en create
  departureCount: number; // 0 en create
  options: ManageOptions;
  organizerStatus: OrganizerScope["status"];
};

type Status = "draft" | "published";

const NO_DEPARTURES_NOTICE =
  "Este paquete se publicará sin salidas: nadie podrá reservarlo hasta que agregues salidas.";
const PENDING_NOTICE =
  "Tu cuenta debe estar activa para publicar. Mientras tanto guarda como borrador.";
const SUSPENDED_NOTICE = "Tu cuenta está suspendida: no puedes modificar paquetes";

// Sin botón submit y con varios inputs, Enter no envía nada (no hay guardado implícito
// inesperado, p. ej. despublicar sin querer): todo guardado sale de un botón.
export function PackageForm({
  mode,
  packageId,
  initialValues,
  initialStatus,
  departureCount,
  options,
  organizerStatus,
}: PackageFormProps) {
  const router = useRouter();
  const noteId = useId();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const focusRequested = useRef(false);

  const suspended = organizerStatus === "suspended";
  const pending = organizerStatus === "pending";
  const disabled = isPending || suspended;
  const wasPublished = mode === "edit" && initialStatus === "published";

  // Tras pintar los errores: foco al primer campo inválido (orden del DOM) o, si solo hay mensaje, al resumen.
  // Con errores de servidor el estado se commitea aún con isPending=true (inputs disabled, el foco no
  // pega): se espera sin consumir el flag y el efecto reintenta cuando isPending pasa a false.
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

  function submit(status: Status) {
    const input = toPackageInput(values, status);
    const parsed = packageInputSchema.safeParse(input);
    if (!parsed.success) {
      showFailure(toFormErrors(toFieldErrors(parsed.error)), MANAGE_MESSAGES.INVALID_INPUT);
      return;
    }
    setErrors({});
    setSummary(null);
    startTransition(async () => {
      try {
        // Se envía el objeto sin validar: el servidor revalida siempre.
        const result = packageId
          ? await updatePackageAction(packageId, input)
          : await createPackageAction(input);
        if (result.ok) {
          router.replace("/operador/paquetes");
          return;
        }
        showFailure(toFormErrors(result.fieldErrors ?? {}), result.message);
      } catch {
        showFailure({}, MANAGE_MESSAGES.UNKNOWN);
      }
    });
  }

  const onChange = (patch: Partial<PackageFormValues>) => setValues((v) => ({ ...v, ...patch }));
  const sectionProps = { values, errors, disabled, onChange };
  const publishDisabled = disabled || pending;
  // Con cuenta suspendida/pendiente sobre un borrador publicar es imposible: el aviso confundiría.
  const showNoDeparturesNotice = departureCount === 0 && (wasPublished || !(suspended || pending));
  const note = suspended ? SUSPENDED_NOTICE : pending ? PENDING_NOTICE : null;

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => e.preventDefault()}
      className="flex flex-col gap-6"
    >
      <PackageFormBasics {...sectionProps} options={options} />
      <PackageFormMedia {...sectionProps} />
      <PackageFormItinerary {...sectionProps} />
      <PackageFormInclusions {...sectionProps} />

      {showNoDeparturesNotice && (
        <Alert role="status">
          <Info aria-hidden="true" />
          <AlertDescription className="text-base">{NO_DEPARTURES_NOTICE}</AlertDescription>
        </Alert>
      )}

      {summary && (
        <Alert ref={summaryRef} variant="destructive" role="alert" tabIndex={-1}>
          <CircleAlert aria-hidden="true" />
          <AlertDescription className="text-base">{summary}</AlertDescription>
        </Alert>
      )}

      {note && (
        <p id={noteId} className="text-base text-ink-muted">
          {note}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full sm:w-auto"
          onClick={() => submit("draft")}
        >
          {wasPublished ? "Pasar a borrador" : "Guardar borrador"}
        </Button>
        <Button
          type="button"
          variant="cta"
          disabled={publishDisabled}
          aria-describedby={note ? noteId : undefined}
          className="w-full sm:w-auto"
          onClick={() => submit("published")}
        >
          {wasPublished ? "Guardar cambios" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}

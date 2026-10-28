"use client";

import { CircleAlert, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import {
  createGuideAction,
  deleteGuideAction,
  updateGuideAction,
} from "../actions/guide-actions";
import { guideSchema, type GuideDto, type GuideInput } from "../schemas/guide-schema";
import type { ManageResult, OrganizerScope } from "../types/package-manage";
import { toFieldErrors } from "../utils/field-errors";
import { MANAGE_MESSAGES } from "../utils/manage-gate";

type GuideFormProps = {
  initial: GuideInput;
  submitLabel: string;
  submitVariant: "cta" | "default";
  submitIcon?: React.ReactNode;
  disabled: boolean;
  run: (input: GuideInput) => Promise<ManageResult>;
  // Sin onDone el formulario se limpia (alta); con onDone se cierra (edición).
  onDone?: () => void;
  onCancel?: () => void;
};

function GuideForm({
  initial,
  submitLabel,
  submitVariant,
  submitIcon,
  disabled,
  run,
  onDone,
  onCancel,
}: GuideFormProps) {
  const router = useRouter();
  const prefix = useId();
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const off = disabled || pending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = guideSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setMessage(MANAGE_MESSAGES.INVALID_INPUT);
      return;
    }
    startTransition(async () => {
      let result: ManageResult;
      try {
        result = await run(parsed.data);
      } catch {
        result = { ok: false, code: "UNKNOWN", message: MANAGE_MESSAGES.UNKNOWN };
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setMessage(result.message);
        return;
      }
      setErrors({});
      setMessage(null);
      if (onDone) onDone();
      else setValues(initial);
      router.refresh();
    });
  }

  const fields = [
    { key: "name", label: "Nombre", autoComplete: "off", inputMode: undefined },
    { key: "phone", label: "Teléfono", autoComplete: "off", inputMode: "tel" },
  ] as const;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {message && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(({ key, label, autoComplete, inputMode }) => {
          const id = `${prefix}-${key}`;
          const error = errors[key];
          return (
            <Field key={key} data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={id}>{label}</FieldLabel>
              <Input
                id={id}
                name={key}
                type={key === "phone" ? "tel" : "text"}
                inputMode={inputMode}
                autoComplete={autoComplete}
                value={values[key]}
                disabled={off}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              />
              {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
            </Field>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant={submitVariant} disabled={off}>
          {submitIcon}
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

function GuideRow({ guide, disabled }: { guide: GuideDto; disabled: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="py-4">
        <GuideForm
          initial={{ name: guide.name, phone: guide.phone }}
          submitLabel="Guardar"
          submitVariant="default"
          disabled={disabled}
          run={(input) => updateGuideAction(guide.id, input)}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-bold text-ink">{guide.name}</p>
        <p className="break-words text-ink-muted">{guide.phone}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" disabled={disabled} onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" />
          Editar
        </Button>
        <ConfirmActionDialog
          trigger={
            <Button variant="destructive" disabled={disabled}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </Button>
          }
          title={`Eliminar a ${guide.name}`}
          description="Las salidas que tengan asignada a esta guía quedarán sin guía. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={async () => {
            const result = await deleteGuideAction(guide.id);
            if (!result.ok) return { ok: false, message: result.message };
            router.refresh();
            return { ok: true };
          }}
        />
      </div>
    </li>
  );
}

export function GuideManager({
  guides,
  organizerStatus,
}: {
  guides: GuideDto[];
  organizerStatus: OrganizerScope["status"];
}) {
  const suspended = organizerStatus === "suspended";

  return (
    <section
      aria-labelledby="guides-title"
      className="rounded-card bg-surface p-6 shadow-card md:p-8"
    >
      <h2 id="guides-title" className="text-lg font-bold text-ink">
        Tus guías
      </h2>

      {suspended && (
        <Alert variant="destructive" className="mt-4">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{MANAGE_MESSAGES.ORGANIZER_SUSPENDED}</AlertDescription>
        </Alert>
      )}

      {guides.length === 0 ? (
        <p className="mt-4 text-ink-muted">Aún no tienes guías</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {guides.map((guide) => (
            <GuideRow key={guide.id} guide={guide} disabled={suspended} />
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-border pt-6">
        <h3 className="mb-4 text-base font-bold text-ink">Agregar guía</h3>
        <GuideForm
          initial={{ name: "", phone: "" }}
          submitLabel="Agregar guía"
          submitVariant="cta"
          submitIcon={<Plus aria-hidden="true" />}
          disabled={suspended}
          run={createGuideAction}
        />
      </div>
    </section>
  );
}

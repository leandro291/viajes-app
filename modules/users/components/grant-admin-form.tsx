"use client";

import { CircleAlert, CircleCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition, type FormEvent } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { grantAdminAction } from "../actions/admin-actions";
import { ADMIN_MESSAGES } from "../types/admin-manage";

export function GrantAdminForm() {
  const router = useRouter();
  const id = useId();
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const inputId = `${id}-email`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await grantAdminAction(email);
        if (!result.ok) {
          // El error de campo (correo mal formado) va en el input; el resto, en la alerta.
          const emailError = result.fieldErrors?.email;
          if (emailError) setFieldError(emailError);
          else setError(result.message);
          return;
        }
        setSuccess(`Listo: ${email.trim()} ya es administrador.`);
        setEmail("");
        router.refresh();
      } catch {
        setError(ADMIN_MESSAGES.UNKNOWN);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-labelledby={`${id}-title`}
      className="mt-8 flex flex-col gap-4 border-t border-border pt-6"
    >
      <h3 id={`${id}-title`} className="text-lg font-bold text-ink">
        Agregar administrador
      </h3>
      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Field data-invalid={fieldError ? true : undefined}>
        <FieldLabel htmlFor={inputId}>Correo</FieldLabel>
        <Input
          id={inputId}
          type="email"
          autoComplete="off"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={pending}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${hintId} ${errorId}` : hintId}
        />
        <FieldDescription id={hintId}>La persona ya debe haberse registrado en Wayra.</FieldDescription>
        {fieldError && <FieldError id={errorId}>{fieldError}</FieldError>}
      </Field>
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending} className="w-full md:w-auto">
          <UserPlus aria-hidden="true" />
          {pending ? "Agregando…" : "Agregar administrador"}
        </Button>
        <p aria-live="polite" className="flex items-center gap-2 break-words text-ink-muted">
          {success && (
            <>
              <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
              {success}
            </>
          )}
        </p>
      </div>
    </form>
  );
}

import { cn } from "@/lib/utils";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";

type FormSectionProps = {
  id: string;
  title: string;
  // Clases del contenedor del cuerpo (con `mt-4`); sin él, los hijos van directo bajo el título.
  bodyClassName?: string;
  children: React.ReactNode;
};

// Tarjeta de sección del formulario: h2 enlazado por aria-labelledby.
export function FormSection({ id, title, bodyClassName, children }: FormSectionProps) {
  return (
    <section aria-labelledby={id} className="rounded-card bg-surface p-6 shadow-card md:p-8">
      <h2 id={id} className="text-lg font-bold text-ink">
        {title}
      </h2>
      {bodyClassName ? <div className={cn("mt-4", bodyClassName)}>{children}</div> : children}
    </section>
  );
}

type FieldShellProps = {
  id: string;
  label: string;
  error?: string;
  children: (aria: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
};

// Label visible + control + mensaje de error enlazado (aria-invalid / aria-describedby).
export function FieldShell({ id, label, error, children }: FieldShellProps) {
  const errorId = `${id}-error`;
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      {error && <FieldError id={errorId} className="text-base">{error}</FieldError>}
    </Field>
  );
}

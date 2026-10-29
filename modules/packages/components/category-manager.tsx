"use client";

import { CircleAlert, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CATALOG_MESSAGES, type CatalogResult } from "@/lib/catalog-result";

import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "../actions/category-actions";
import {
  categoryInputSchema,
  type CategoryAdminDto,
  type CategoryInput,
} from "../schemas/category-schema";
import { toFieldErrors } from "../utils/field-errors";

type CategoryFormProps = {
  initial: CategoryInput;
  submitLabel: string;
  submitVariant: "cta" | "default";
  submitIcon?: React.ReactNode;
  run: (input: CategoryInput) => Promise<CatalogResult<object>>;
  // Sin onDone el formulario se limpia (alta); con onDone se cierra (edición).
  onDone?: () => void;
  onCancel?: () => void;
};

function CategoryForm({
  initial,
  submitLabel,
  submitVariant,
  submitIcon,
  run,
  onDone,
  onCancel,
}: CategoryFormProps) {
  const router = useRouter();
  const id = `${useId()}-name`;
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const error = errors.name;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = categoryInputSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setMessage(null);
      return;
    }
    startTransition(async () => {
      let result: CatalogResult<object>;
      try {
        result = await run(parsed.data);
      } catch {
        result = { ok: false, code: "UNKNOWN", message: CATALOG_MESSAGES.UNKNOWN };
      }
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        // Si el error ya se muestra en el campo, no se repite en el aviso.
        setMessage(result.fieldErrors?.name ? null : result.message);
        return;
      }
      setErrors({});
      setMessage(null);
      if (onDone) onDone();
      else setValues(initial);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {message && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={id}>Nombre</FieldLabel>
        <Input
          id={id}
          name="name"
          type="text"
          autoComplete="off"
          value={values.name}
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setValues({ name: e.target.value })}
        />
        {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" variant={submitVariant} disabled={pending}>
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

function CategoryRow({ category }: { category: CategoryAdminDto }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="py-4">
        <CategoryForm
          initial={{ name: category.name }}
          submitLabel="Guardar"
          submitVariant="default"
          run={(input) => updateCategoryAction(category.id, input)}
          onDone={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-words font-bold text-ink">{category.name}</p>
        <p className="break-words text-ink-muted">
          {category.slug} · {category.packageCount}{" "}
          {category.packageCount === 1 ? "paquete" : "paquetes"}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          aria-label={`Editar ${category.name}`}
          onClick={() => setEditing(true)}
        >
          <Pencil aria-hidden="true" />
          Editar
        </Button>
        <ConfirmActionDialog
          trigger={
            <Button variant="destructive" aria-label={`Eliminar ${category.name}`}>
              <Trash2 aria-hidden="true" />
              Eliminar
            </Button>
          }
          title={`Eliminar ${category.name}`}
          description="Esta acción no se puede deshacer. Si la categoría tiene paquetes asociados, no se podrá eliminar."
          confirmLabel="Eliminar"
          onConfirm={async () => {
            const result = await deleteCategoryAction(category.id);
            if (!result.ok) return { ok: false, message: result.message };
            router.refresh();
            return { ok: true };
          }}
        />
      </div>
    </li>
  );
}

export function CategoryManager({ categories }: { categories: CategoryAdminDto[] }) {
  return (
    <section
      aria-labelledby="categories-title"
      className="rounded-card bg-surface p-6 shadow-card md:p-8"
    >
      <h2 id="categories-title" className="text-lg font-bold text-ink">
        Categorías
      </h2>

      {categories.length === 0 ? (
        <p className="mt-4 text-ink-muted">Aún no hay categorías</p>
      ) : (
        <ul className="mt-2 divide-y divide-border">
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-border pt-6">
        <h3 className="mb-4 text-base font-bold text-ink">Agregar categoría</h3>
        <CategoryForm
          initial={{ name: "" }}
          submitLabel="Agregar categoría"
          submitVariant="cta"
          submitIcon={<Plus aria-hidden="true" />}
          run={createCategoryAction}
        />
      </div>
    </section>
  );
}

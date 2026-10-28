"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { newKey, type PackageFormValues, type SectionProps } from "../utils/package-form";
import { FieldShell, FormSection } from "./form-section";

type ListKey = "included" | "excluded";

type InclusionListProps = SectionProps & {
  listKey: ListKey;
  title: string;
  itemLabel: string;
};

function InclusionList({
  values,
  errors,
  disabled,
  onChange,
  listKey,
  title,
  itemLabel,
}: InclusionListProps) {
  const p = useId();
  const items = values[listKey];
  const groupError = errors[listKey];
  const patch = (next: PackageFormValues[ListKey]) => onChange({ [listKey]: next });

  return (
    <FormSection id={`${p}-title`} title={title}>
      {items.length === 0 && <p className="mt-4 text-base text-ink-muted">Aún no agregaste ítems</p>}

      <ul className="mt-4 flex flex-col gap-4">
        {items.map((item, i) => {
          const id = `${p}-${item.key}`;
          const label = `${itemLabel} ${i + 1}`;
          const error = errors[`${listKey}.${i}`];
          return (
            <li key={item.key}>
              <FieldShell id={id} label={label} error={error}>
                {(aria) => (
                  <div className="flex items-start gap-2">
                    <Input
                      {...aria}
                      value={item.text}
                      disabled={disabled}
                      onChange={(e) =>
                        patch(items.map((x) => (x.key === item.key ? { ...x, text: e.target.value } : x)))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-[52px] w-11 shrink-0"
                      disabled={disabled}
                      aria-label={`Quitar ${label}`}
                      onClick={() => patch(items.filter((x) => x.key !== item.key))}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </FieldShell>
            </li>
          );
        })}
      </ul>

      {groupError && (
        <FieldError id={`${p}-error`} className="mt-4 text-base">
          {groupError}
        </FieldError>
      )}

      <Button
        type="button"
        variant="outline"
        className="mt-4"
        disabled={disabled}
        onClick={() => patch([...items, { key: newKey(), text: "" }])}
      >
        <Plus aria-hidden="true" />
        Agregar
        <span className="sr-only"> a {title}</span>
      </Button>
    </FormSection>
  );
}

export function PackageFormInclusions(props: SectionProps) {
  return (
    <div className="flex flex-col gap-6">
      <InclusionList {...props} listKey="included" title="Incluye" itemLabel="Incluye" />
      <InclusionList {...props} listKey="excluded" title="No incluye" itemLabel="No incluye" />
    </div>
  );
}

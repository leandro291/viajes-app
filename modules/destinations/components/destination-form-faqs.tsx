"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";

import { FieldShell, FormSection } from "@/components/shared/form-section";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { MAX_FAQS } from "../schemas/destination-schema";
import {
  type DestinationFormValues,
  emptyFaq,
  type SectionProps,
} from "../utils/destination-form";

type Faq = DestinationFormValues["faqs"][number];

type FaqRowProps = {
  faq: Faq;
  index: number;
  errors: SectionProps["errors"];
  disabled: boolean;
  onPatch: (patch: Partial<Faq>) => void;
  onRemove: () => void;
};

function FaqRow({ faq, index, errors, disabled, onPatch, onRemove }: FaqRowProps) {
  const prefix = useId();
  const n = index + 1;

  return (
    <li>
      <FieldSet className="min-w-0 rounded-field border border-border-field p-4">
        <FieldLegend className="px-1">Pregunta {n}</FieldLegend>
        <FieldShell id={`${prefix}-question`} label="Pregunta" error={errors[`faqs.${index}.question`]}>
          {(aria) => (
            <Input
              {...aria}
              value={faq.question}
              disabled={disabled}
              onChange={(e) => onPatch({ question: e.target.value })}
            />
          )}
        </FieldShell>
        <FieldShell id={`${prefix}-answer`} label="Respuesta" error={errors[`faqs.${index}.answer`]}>
          {(aria) => (
            <Textarea
              {...aria}
              value={faq.answer}
              disabled={disabled}
              onChange={(e) => onPatch({ answer: e.target.value })}
            />
          )}
        </FieldShell>
        <Button
          type="button"
          variant="destructive"
          className="self-start"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
          Quitar pregunta {n}
        </Button>
      </FieldSet>
    </li>
  );
}

export function DestinationFormFaqs({ values, errors, disabled, onChange }: SectionProps) {
  const { faqs } = values;
  const groupError = errors["faqs"];

  const patchFaq = (key: string, patch: Partial<Faq>) =>
    onChange({ faqs: faqs.map((f) => (f.key === key ? { ...f, ...patch } : f)) });

  return (
    <FormSection id="faqs-heading" title="Preguntas frecuentes" bodyClassName="flex flex-col gap-4">
      {faqs.length > 0 && (
        <ol className="flex flex-col gap-4">
          {faqs.map((faq, index) => (
            <FaqRow
              key={faq.key}
              faq={faq}
              index={index}
              errors={errors}
              disabled={disabled}
              onPatch={(patch) => patchFaq(faq.key, patch)}
              onRemove={() => onChange({ faqs: faqs.filter((f) => f.key !== faq.key) })}
            />
          ))}
        </ol>
      )}
      {groupError && <FieldError className="text-base">{groupError}</FieldError>}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={disabled || faqs.length >= MAX_FAQS}
        onClick={() => onChange({ faqs: [...faqs, emptyFaq()] })}
      >
        <Plus aria-hidden="true" />
        Agregar pregunta
      </Button>
    </FormSection>
  );
}

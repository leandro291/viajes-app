"use client";

import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId } from "react";

import { FieldShell, FormSection } from "@/components/shared/form-section";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { MAX_SIGHTS } from "../schemas/destination-schema";
import {
  type DestinationFormValues,
  emptySight,
  type SectionProps,
} from "../utils/destination-form";

type Sight = DestinationFormValues["sights"][number];
type TextKey = "name" | "lat" | "lng";

type SightRowProps = {
  sight: Sight;
  index: number;
  errors: SectionProps["errors"];
  disabled: boolean;
  onPatch: (patch: Partial<Sight>) => void;
  onRemove: () => void;
};

function SightRow({ sight, index, errors, disabled, onPatch, onRemove }: SightRowProps) {
  const prefix = useId();
  const n = index + 1;
  const err = (field: keyof Sight) => errors[`sights.${index}.${field}`];

  function textField(field: TextKey, label: string, extra?: React.ComponentProps<typeof Input>) {
    return (
      <FieldShell id={`${prefix}-${field}`} label={label} error={err(field)}>
        {(aria) => (
          <Input
            {...aria}
            value={sight[field]}
            disabled={disabled}
            onChange={(e) => onPatch({ [field]: e.target.value })}
            {...extra}
          />
        )}
      </FieldShell>
    );
  }

  return (
    <li>
      <FieldSet className="min-w-0 rounded-field border border-border-field p-4">
        <FieldLegend className="px-1">Lugar {n}</FieldLegend>
        {textField("name", "Nombre")}
        <FieldShell id={`${prefix}-description`} label="Descripción" error={err("description")}>
          {(aria) => (
            <Textarea
              {...aria}
              value={sight.description}
              disabled={disabled}
              onChange={(e) => onPatch({ description: e.target.value })}
            />
          )}
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("lat", "Latitud (opcional)", { inputMode: "decimal", autoComplete: "off" })}
          {textField("lng", "Longitud (opcional)", { inputMode: "decimal", autoComplete: "off" })}
        </div>
        <div className="flex flex-col gap-3">
          <ImageUploadField
            label={`Foto del lugar ${n}`}
            disabled={disabled}
            error={err("imageUrl")}
            onUploaded={({ url }) => onPatch({ imageUrl: url })}
          />
          {sight.imageUrl && (
            <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-field border border-border-field">
              <Image
                src={sight.imageUrl}
                alt={`Foto del lugar ${n}`}
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="destructive"
          className="self-start"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
          Quitar lugar {n}
        </Button>
      </FieldSet>
    </li>
  );
}

export function DestinationFormSights({ values, errors, disabled, onChange }: SectionProps) {
  const { sights } = values;
  const groupError = errors["sights"];

  const patchSight = (key: string, patch: Partial<Sight>) =>
    onChange({ sights: sights.map((s) => (s.key === key ? { ...s, ...patch } : s)) });

  return (
    <FormSection id="sights-heading" title="Lugares imperdibles" bodyClassName="flex flex-col gap-4">
      {sights.length > 0 && (
        <ol className="flex flex-col gap-4">
          {sights.map((sight, index) => (
            <SightRow
              key={sight.key}
              sight={sight}
              index={index}
              errors={errors}
              disabled={disabled}
              onPatch={(patch) => patchSight(sight.key, patch)}
              onRemove={() => onChange({ sights: sights.filter((s) => s.key !== sight.key) })}
            />
          ))}
        </ol>
      )}
      {groupError && <FieldError className="text-base">{groupError}</FieldError>}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={disabled || sights.length >= MAX_SIGHTS}
        onClick={() => onChange({ sights: [...sights, emptySight()] })}
      >
        <Plus aria-hidden="true" />
        Agregar lugar
      </Button>
    </FormSection>
  );
}

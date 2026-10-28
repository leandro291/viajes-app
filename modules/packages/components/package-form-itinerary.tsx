"use client";

import { Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  emptyItineraryDay,
  type PackageFormValues,
  type SectionProps,
} from "../utils/package-form";
import { FieldShell, FormSection } from "./form-section";
import { ImageUploadField } from "./image-upload-field";

type Day = PackageFormValues["itinerary"][number];
type TextKey = "title" | "place" | "transportLeg" | "lat" | "lng";

type DayRowProps = {
  day: Day;
  index: number;
  errors: SectionProps["errors"];
  disabled: boolean;
  canRemove: boolean;
  onPatch: (patch: Partial<Day>) => void;
  onRemove: () => void;
};

function DayRow({
  day,
  index,
  errors,
  disabled,
  canRemove,
  onPatch,
  onRemove,
}: DayRowProps) {
  const prefix = useId();
  const n = index + 1;
  const err = (field: keyof Day) => errors[`itinerary.${index}.${field}`];

  // Un campo de texto con su error enlazado (aria-invalid + aria-describedby).
  function textField(
    field: TextKey,
    label: string,
    extra?: React.ComponentProps<typeof Input>,
  ) {
    return (
      <FieldShell id={`${prefix}-${field}`} label={label} error={err(field)}>
        {(aria) => (
          <Input
            {...aria}
            value={day[field]}
            disabled={disabled}
            onChange={(e) => onPatch({ [field]: e.target.value })}
            {...extra}
          />
        )}
      </FieldShell>
    );
  }

  const imageError = err("imageUrl");

  return (
    <li>
      <FieldSet className="min-w-0 rounded-field border border-border-field p-4">
        <FieldLegend className="px-1">Día {n}</FieldLegend>
        {textField("title", "Título")}
        <FieldShell id={`${prefix}-description`} label="Descripción" error={err("description")}>
          {(aria) => (
            <Textarea
              {...aria}
              value={day.description}
              disabled={disabled}
              onChange={(e) => onPatch({ description: e.target.value })}
            />
          )}
        </FieldShell>
        {textField("place", "Lugar")}
        {textField("transportLeg", "Tramo de transporte (opcional)")}
        <div className="grid gap-4 sm:grid-cols-2">
          {textField("lat", "Latitud (opcional)", {
            inputMode: "decimal",
            autoComplete: "off",
          })}
          {textField("lng", "Longitud (opcional)", {
            inputMode: "decimal",
            autoComplete: "off",
          })}
        </div>
        <div className="flex flex-col gap-3">
          <ImageUploadField
            label={`Imagen del día ${n} (opcional)`}
            disabled={disabled}
            error={imageError}
            onUploaded={({ url }) => onPatch({ imageUrl: url })}
          />
          {day.imageUrl && (
            <div className="flex flex-col items-start gap-3">
              <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-field border border-border-field">
                <Image
                  src={day.imageUrl}
                  alt={`Imagen guardada del día ${n}`}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                onClick={() => onPatch({ imageUrl: "" })}
              >
                <Trash2 aria-hidden="true" />
                Quitar imagen
              </Button>
            </div>
          )}
        </div>
        <Button
          type="button"
          variant="destructive"
          className="self-start"
          disabled={disabled || !canRemove}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
          Quitar día {n}
        </Button>
      </FieldSet>
    </li>
  );
}

export function PackageFormItinerary({
  values,
  errors,
  disabled,
  onChange,
}: SectionProps) {
  const { itinerary } = values;
  const groupError = errors["itinerary"];

  const patchDay = (key: string, patch: Partial<Day>) =>
    onChange({
      itinerary: itinerary.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    });

  return (
    <FormSection id="itinerary-heading" title="Itinerario" bodyClassName="flex flex-col gap-4">
      <ol className="flex flex-col gap-4">
        {itinerary.map((day, index) => (
          <DayRow
            key={day.key}
            day={day}
            index={index}
            errors={errors}
            disabled={disabled}
            canRemove={itinerary.length > 1}
            onPatch={(patch) => patchDay(day.key, patch)}
            onRemove={() =>
              onChange({
                itinerary: itinerary.filter((d) => d.key !== day.key),
              })
            }
          />
        ))}
      </ol>
      {groupError && (
        <FieldError className="text-base">{groupError}</FieldError>
      )}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={disabled}
        onClick={() =>
          onChange({ itinerary: [...itinerary, emptyItineraryDay()] })
        }
      >
        <Plus aria-hidden="true" />
        Agregar día
      </Button>
    </FormSection>
  );
}

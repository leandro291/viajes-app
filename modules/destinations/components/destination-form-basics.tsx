"use client";

import Image from "next/image";
import { useId } from "react";

import { FieldShell, FormSection } from "@/components/shared/form-section";
import { ImageUploadField } from "@/components/shared/image-upload-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { DestinationFormValues, SectionProps } from "../utils/destination-form";

type TextKey = {
  [K in keyof DestinationFormValues]: DestinationFormValues[K] extends string ? K : never;
}[keyof DestinationFormValues];

export function DestinationFormBasics({ values, errors, disabled, onChange }: SectionProps) {
  const p = useId();
  const set =
    (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange({ [key]: e.target.value });

  return (
    <div className="flex flex-col gap-6">
      <FormSection id={`${p}-basics`} title="Datos básicos" bodyClassName="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id={`${p}-name`} label="Nombre" error={errors["name"]}>
            {(aria) => (
              <Input {...aria} value={values.name} disabled={disabled} onChange={set("name")} />
            )}
          </FieldShell>
          <FieldShell id={`${p}-region`} label="Región" error={errors["region"]}>
            {(aria) => (
              <Input {...aria} value={values.region} disabled={disabled} onChange={set("region")} />
            )}
          </FieldShell>
        </div>
        <FieldShell id={`${p}-tagline`} label="Eslogan (opcional)" error={errors["tagline"]}>
          {(aria) => (
            <Input {...aria} value={values.tagline} disabled={disabled} onChange={set("tagline")} />
          )}
        </FieldShell>
        <FieldShell id={`${p}-description`} label="Descripción (opcional)" error={errors["description"]}>
          {(aria) => (
            <Textarea
              {...aria}
              rows={6}
              className="min-h-32 text-base"
              value={values.description}
              disabled={disabled}
              onChange={set("description")}
            />
          )}
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldShell id={`${p}-altitude`} label="Altitud en metros (opcional)" error={errors["altitudeM"]}>
            {(aria) => (
              <Input
                {...aria}
                inputMode="numeric"
                autoComplete="off"
                value={values.altitudeM}
                disabled={disabled}
                onChange={set("altitudeM")}
              />
            )}
          </FieldShell>
          <FieldShell id={`${p}-season`} label="Mejor época (opcional)" error={errors["bestSeasonText"]}>
            {(aria) => (
              <Input
                {...aria}
                value={values.bestSeasonText}
                disabled={disabled}
                onChange={set("bestSeasonText")}
              />
            )}
          </FieldShell>
          <FieldShell id={`${p}-lima`} label="Desde Lima (opcional)" error={errors["fromLimaText"]}>
            {(aria) => (
              <Input
                {...aria}
                value={values.fromLimaText}
                disabled={disabled}
                onChange={set("fromLimaText")}
              />
            )}
          </FieldShell>
        </div>
      </FormSection>

      <FormSection id={`${p}-getting`} title="Cómo llegar y consejos" bodyClassName="flex flex-col gap-4">
        <FieldShell id={`${p}-how`} label="Cómo llegar (opcional)" error={errors["howToGetText"]}>
          {(aria) => (
            <Textarea
              {...aria}
              rows={4}
              className="min-h-24 text-base"
              value={values.howToGetText}
              disabled={disabled}
              onChange={set("howToGetText")}
            />
          )}
        </FieldShell>
        <FieldShell id={`${p}-tips`} label="Consejos (opcional)" error={errors["tipsText"]}>
          {(aria) => (
            <Textarea
              {...aria}
              rows={4}
              className="min-h-24 text-base"
              value={values.tipsText}
              disabled={disabled}
              onChange={set("tipsText")}
            />
          )}
        </FieldShell>
      </FormSection>

      <FormSection id={`${p}-hero`} title="Foto de portada" bodyClassName="flex flex-col gap-3">
        <ImageUploadField
          label="Foto de portada"
          disabled={disabled}
          error={errors["heroImageUrl"]}
          onUploaded={({ url }) => onChange({ heroImageUrl: url })}
        />
        {values.heroImageUrl && (
          <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-field border border-border-field">
            <Image
              src={values.heroImageUrl}
              alt={`Portada actual de ${values.name || "el destino"}`}
              fill
              sizes="320px"
              className="object-cover"
            />
          </div>
        )}
      </FormSection>
    </div>
  );
}

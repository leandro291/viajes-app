"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import { MAX_GALLERY_IMAGES } from "../schemas/package-schema";
import { newKey, type SectionProps } from "../utils/package-form";
import { FieldShell, FormSection } from "@/components/shared/form-section";
import { ImageUploadField } from "@/components/shared/image-upload-field";

function GalleryRow({
  image,
  index,
  errors,
  disabled,
  onAlt,
  onRemove,
}: {
  image: SectionProps["values"]["images"][number];
  index: number;
  errors: SectionProps["errors"];
  disabled: boolean;
  onAlt: (alt: string) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const n = index + 1;
  const altError = errors[`images.${index}.alt`];
  const urlError = errors[`images.${index}.url`];
  const creditError = errors[`images.${index}.credit`];
  const rowError = urlError ?? creditError;
  const rowErrorId = `${id}-row-error`;
  const describedBy = [altError && `${id}-alt-error`, rowError && rowErrorId]
    .filter(Boolean)
    .join(" ");

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-field border border-border-field p-4 sm:flex-row">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-field border border-border-field sm:w-40">
        <Image
          src={image.url}
          alt={image.alt || `Imagen ${n} de la galería`}
          fill
          sizes="160px"
          className="object-cover"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <FieldShell id={`${id}-alt`} label="Descripción de la imagen (alt)" error={altError}>
          {(aria) => (
            <Input
              {...aria}
              aria-describedby={describedBy || undefined}
              value={image.alt}
              disabled={disabled}
              onChange={(e) => onAlt(e.target.value)}
            />
          )}
        </FieldShell>
        {image.credit && (
          <p className="text-base break-words">Crédito: {image.credit}</p>
        )}
        {rowError && (
          <FieldError id={rowErrorId} className="text-base">
            {rowError}
          </FieldError>
        )}
        <Button
          type="button"
          variant="destructive"
          className="self-start"
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 aria-hidden="true" />
          Quitar imagen {n}
        </Button>
      </div>
    </li>
  );
}

export function PackageFormMedia({
  values,
  errors,
  disabled,
  onChange,
}: SectionProps) {
  const { coverImageUrl, images } = values;
  const full = images.length >= MAX_GALLERY_IMAGES;

  return (
    <FormSection id="media-heading" title="Imágenes" bodyClassName="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <ImageUploadField
          label="Portada"
          disabled={disabled}
          error={errors["coverImageUrl"]}
          onUploaded={({ url }) => onChange({ coverImageUrl: url })}
        />
        {coverImageUrl && (
          <div className="relative aspect-video w-full max-w-xs overflow-hidden rounded-field border border-border-field">
            <Image
              src={coverImageUrl}
              alt="Portada actual del paquete"
              fill
              sizes="320px"
              className="object-cover"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-lg font-semibold">Galería (opcional)</h3>
        {images.length > 0 && (
          <ul className="flex flex-col gap-4">
            {images.map((image, index) => (
              <GalleryRow
                key={image.key}
                image={image}
                index={index}
                errors={errors}
                disabled={disabled}
                onAlt={(alt) =>
                  onChange({
                    images: images.map((i) =>
                      i.key === image.key ? { ...i, alt } : i,
                    ),
                  })
                }
                onRemove={() =>
                  onChange({
                    images: images.filter((i) => i.key !== image.key),
                  })
                }
              />
            ))}
          </ul>
        )}
        {errors["images"] && (
          <FieldError className="text-base">{errors["images"]}</FieldError>
        )}
        {full && (
          <p role="status" className="text-base">
            Llegaste al máximo de {MAX_GALLERY_IMAGES} imágenes. Quita una para
            agregar otra.
          </p>
        )}
        <ImageUploadField
          label="Agregar imagen a la galería"
          withCredit
          disabled={disabled || full}
          onUploaded={({ url, credit }) =>
            onChange({
              images: [
                ...images,
                { key: newKey(), url, alt: "", credit: credit ?? "" },
              ],
            })
          }
        />
      </div>
    </FormSection>
  );
}

"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/blob/upload-image-action";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_CREDIT_LENGTH,
  MAX_IMAGE_BYTES,
} from "@/lib/blob/upload-image-schema";

type ImageUploadFieldProps = {
  label: string;
  disabled?: boolean;
  withCredit?: boolean;
  onUploaded: (img: { url: string; credit: string | null }) => void;
  error?: string;
};

const GENERIC_ERROR = "No pudimos subir la imagen. Inténtalo de nuevo";
const TYPE_ERROR = "Usa una imagen JPG, PNG o WebP";
const SIZE_ERROR = "La imagen supera los 4 MB";

export function ImageUploadField({
  label,
  disabled,
  withCredit,
  onUploaded,
  error,
}: ImageUploadFieldProps) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [credit, setCredit] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const off = disabled || pending;
  const shownError = localError ?? error;
  const errorId = `${id}-error`;
  const descId = `${id}-desc`;

  // Latest ref: la subida es async; onUploaded debe ser el de la render actual, no el del disparo.
  const onUploadedRef = useRef(onUploaded);
  useEffect(() => {
    onUploadedRef.current = onUploaded;
  });

  function reset() {
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalError(null);

    // Validación previa para no gastar la subida (Vercel corta con 413 sobre 4.5 MB).
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setLocalError(TYPE_ERROR);
      reset();
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError(SIZE_ERROR);
      reset();
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("credit", credit);

    startTransition(async () => {
      try {
        const result = await uploadImage(formData);
        if (result.ok) {
          setCredit("");
          onUploadedRef.current({ url: result.url, credit: result.credit });
        } else {
          setLocalError(result.message);
        }
      } catch {
        setLocalError(GENERIC_ERROR);
      } finally {
        reset();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {withCredit && (
        <Field>
          <FieldLabel htmlFor={`${id}-credit`}>Crédito de la foto (opcional)</FieldLabel>
          <Input
            id={`${id}-credit`}
            value={credit}
            maxLength={MAX_CREDIT_LENGTH}
            disabled={off}
            onChange={(e) => setCredit(e.target.value)}
          />
        </Field>
      )}
      <Field data-invalid={shownError ? true : undefined}>
        <FieldLabel htmlFor={`${id}-file`}>{label}</FieldLabel>
        <Input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          disabled={off}
          onChange={handleChange}
          aria-invalid={shownError ? true : undefined}
          aria-describedby={shownError ? `${descId} ${errorId}` : descId}
          className="cursor-pointer py-2.5 file:mr-3 file:h-auto file:text-base"
        />
        <FieldDescription id={descId}>JPG, PNG o WebP, hasta 4 MB</FieldDescription>
        <div role="status" className="text-base">
          {pending && (
            <span className="flex items-center gap-2">
              <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              Subiendo…
            </span>
          )}
        </div>
        {shownError && (
          <FieldError id={errorId} className="text-base">
            {shownError}
          </FieldError>
        )}
      </Field>
    </div>
  );
}

"use client";

import { useId } from "react";

import { FieldShell, FormSection } from "@/components/shared/form-section";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import { SEASONS } from "../schemas/destination-schema";
import type { Season } from "../types/destination";
import { MONTH_NAMES, SEASON_LABEL } from "../utils/destination-page";
import type { SectionProps } from "../utils/destination-form";

const HELP = "Define los 12 meses o déjalos todos sin definir";

export function DestinationFormClimate({ values, errors, disabled, onChange }: SectionProps) {
  const p = useId();
  const helpId = `${p}-help`;
  const errorId = `${p}-error`;
  const error = errors["climate"];
  const describedBy = error ? `${helpId} ${errorId}` : helpId;

  return (
    <FormSection id={`${p}-climate`} title="Clima por mes" bodyClassName="flex flex-col gap-4">
      <FieldDescription id={helpId} className="text-base">
        {HELP}
      </FieldDescription>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MONTH_NAMES.map((month, i) => (
          <FieldShell
            key={month}
            id={`${p}-m${i}`}
            label={month.charAt(0).toUpperCase() + month.slice(1)}
          >
            {(aria) => (
              <NativeSelect
                id={aria.id}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className="w-full [&_select]:h-11 [&_select]:text-base"
                value={values.climate[i] ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  onChange({
                    climate: values.climate.map((c, j) =>
                      j === i ? (e.target.value as Season | "") : c,
                    ),
                  })
                }
              >
                <NativeSelectOption value="">Sin definir</NativeSelectOption>
                {SEASONS.map((s) => (
                  <NativeSelectOption key={s} value={s}>
                    {SEASON_LABEL[s]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FieldShell>
        ))}
      </div>
      {error && (
        <FieldError id={errorId} className="text-base">
          {error}
        </FieldError>
      )}
    </FormSection>
  );
}

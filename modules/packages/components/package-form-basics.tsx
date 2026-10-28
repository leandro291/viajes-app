"use client";

import { useId } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

import { PACKAGE_LANGUAGES } from "../schemas/package-schema";
import type { ManageOptions } from "../services/own-package-service";
import type { PackageFormValues, SectionProps } from "../utils/package-form";
import { FieldShell, FormSection } from "./form-section";

const LANGUAGE_LABELS: Record<(typeof PACKAGE_LANGUAGES)[number], string> = {
  es: "Español",
  en: "Inglés",
};

// Error exacto o, para arrays ("categoryIds.0"), el primero del grupo.
function errorFor(errors: SectionProps["errors"], key: string): string | undefined {
  return errors[key] ?? Object.entries(errors).find(([k]) => k.startsWith(`${key}.`))?.[1];
}

type CheckGroupProps<T extends string> = {
  id: string;
  legend: string;
  items: { value: T; label: string }[];
  selected: T[];
  error?: string;
  disabled: boolean;
  onToggle: (value: T, checked: boolean) => void;
};

function CheckGroup<T extends string>({
  id,
  legend,
  items,
  selected,
  error,
  disabled,
  onToggle,
}: CheckGroupProps<T>) {
  const errorId = `${id}-error`;
  return (
    <FieldSet aria-describedby={error ? errorId : undefined} data-invalid={error ? true : undefined}>
      <FieldLegend>{legend}</FieldLegend>
      <div className="flex flex-col">
        {items.map((item) => (
          <Label key={item.value} className="min-h-11 gap-3 text-base leading-snug">
            <Checkbox
              checked={selected.includes(item.value)}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              onCheckedChange={(checked) => onToggle(item.value, checked)}
            />
            {item.label}
          </Label>
        ))}
      </div>
      {error && <FieldError id={errorId} className="text-base">{error}</FieldError>}
    </FieldSet>
  );
}

export function PackageFormBasics({
  values,
  errors,
  disabled,
  onChange,
  options,
}: SectionProps & { options: ManageOptions }) {
  const p = useId();
  const set =
    (key: keyof PackageFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      onChange({ [key]: e.target.value });
  const err = (key: string) => errorFor(errors, key);
  const isPackage = values.kind === "package";

  function toggle<T extends string>(list: T[], value: T, checked: boolean): T[] {
    return checked ? [...list.filter((v) => v !== value), value] : list.filter((v) => v !== value);
  }

  return (
    <div className="flex flex-col gap-6">
      <FormSection id={`${p}-basics`} title="Datos básicos" bodyClassName="flex flex-col gap-4">
        <FieldShell id={`${p}-kind`} label="Tipo" error={err("kind")}>
          {(aria) => (
            <NativeSelect
              {...aria}
              className="w-full [&_select]:h-11 [&_select]:text-base"
              value={values.kind}
              disabled={disabled}
              onChange={(e) => onChange({ kind: e.target.value as PackageFormValues["kind"] })}
            >
              <NativeSelectOption value="package">Paquete (varios días)</NativeSelectOption>
              <NativeSelectOption value="day_tour">Tour de un día</NativeSelectOption>
            </NativeSelect>
          )}
        </FieldShell>
        <FieldShell id={`${p}-title`} label="Título" error={err("title")}>
          {(aria) => (
            <Input {...aria} value={values.title} disabled={disabled} onChange={set("title")} />
          )}
        </FieldShell>
        <FieldShell id={`${p}-blurb`} label="Resumen" error={err("blurb")}>
          {(aria) => (
            <Input {...aria} value={values.blurb} disabled={disabled} onChange={set("blurb")} />
          )}
        </FieldShell>
        <FieldShell id={`${p}-description`} label="Descripción" error={err("description")}>
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
        <FieldShell id={`${p}-destination`} label="Destino" error={err("destinationId")}>
          {(aria) => (
            <NativeSelect
              {...aria}
              className="w-full [&_select]:h-11 [&_select]:text-base"
              value={values.destinationId}
              disabled={disabled}
              onChange={set("destinationId")}
            >
              <NativeSelectOption value="">Selecciona un destino</NativeSelectOption>
              {options.destinations.map((d) => (
                <NativeSelectOption key={d.id} value={d.id}>
                  {d.name} ({d.region})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FieldShell>
        <CheckGroup
          id={`${p}-categories`}
          legend="Categorías"
          items={options.categories.map((c) => ({ value: c.id, label: c.name }))}
          selected={values.categoryIds}
          error={err("categoryIds")}
          disabled={disabled}
          onToggle={(value, checked) =>
            onChange({ categoryIds: toggle(values.categoryIds, value, checked) })
          }
        />
        <CheckGroup
          id={`${p}-languages`}
          legend="Idiomas"
          items={PACKAGE_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_LABELS[l] }))}
          selected={values.languages}
          error={err("languages")}
          disabled={disabled}
          onToggle={(value, checked) =>
            onChange({
              languages: PACKAGE_LANGUAGES.filter((l) =>
                l === value ? checked : values.languages.includes(l),
              ),
            })
          }
        />
      </FormSection>

      <FormSection id={`${p}-price`} title="Precio y cupo" bodyClassName="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id={`${p}-price-input`} label="Precio por persona (soles)" error={err("price")}>
            {(aria) => (
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-ink-muted"
                >
                  S/
                </span>
                <Input
                  {...aria}
                  inputMode="decimal"
                  autoComplete="off"
                  className="pl-11"
                  value={values.price}
                  disabled={disabled}
                  onChange={set("price")}
                />
              </div>
            )}
          </FieldShell>
          <FieldShell id={`${p}-max`} label="Cupo máximo por grupo" error={err("maxGroupSize")}>
            {(aria) => (
              <Input
                {...aria}
                inputMode="numeric"
                autoComplete="off"
                value={values.maxGroupSize}
                disabled={disabled}
                onChange={set("maxGroupSize")}
              />
            )}
          </FieldShell>
        </div>
      </FormSection>

      <FormSection id={`${p}-duration`} title="Duración" bodyClassName="flex flex-col gap-4">
        {/* Los campos del otro tipo se ocultan pero conservan su valor en el estado. */}
        <div className="grid gap-4 sm:grid-cols-2">
          {isPackage ? (
            <>
              <FieldShell id={`${p}-days`} label="Días" error={err("durationDays")}>
                {(aria) => (
                  <Input
                    {...aria}
                    inputMode="numeric"
                    autoComplete="off"
                    value={values.durationDays}
                    disabled={disabled}
                    onChange={set("durationDays")}
                  />
                )}
              </FieldShell>
              <FieldShell id={`${p}-nights`} label="Noches" error={err("nights")}>
                {(aria) => (
                  <Input
                    {...aria}
                    inputMode="numeric"
                    autoComplete="off"
                    value={values.nights}
                    disabled={disabled}
                    onChange={set("nights")}
                  />
                )}
              </FieldShell>
            </>
          ) : (
            <>
              <FieldShell id={`${p}-hours`} label="Horas de duración" error={err("durationHours")}>
                {(aria) => (
                  <Input
                    {...aria}
                    inputMode="numeric"
                    autoComplete="off"
                    value={values.durationHours}
                    disabled={disabled}
                    onChange={set("durationHours")}
                  />
                )}
              </FieldShell>
              <FieldShell id={`${p}-start`} label="Hora de inicio" error={err("startTime")}>
                {(aria) => (
                  <Input
                    {...aria}
                    type="time"
                    value={values.startTime}
                    disabled={disabled}
                    onChange={set("startTime")}
                  />
                )}
              </FieldShell>
            </>
          )}
        </div>
      </FormSection>

      <FormSection id={`${p}-meeting`} title="Punto de encuentro" bodyClassName="flex flex-col gap-4">
        <FieldShell id={`${p}-meeting-point`} label="Dónde nos encontramos" error={err("meetingPoint")}>
          {(aria) => (
            <Input
              {...aria}
              value={values.meetingPoint}
              disabled={disabled}
              onChange={set("meetingPoint")}
            />
          )}
        </FieldShell>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldShell id={`${p}-lat`} label="Latitud (opcional)" error={err("meetingLat")}>
            {(aria) => (
              <Input
                {...aria}
                inputMode="decimal"
                autoComplete="off"
                value={values.meetingLat}
                disabled={disabled}
                onChange={set("meetingLat")}
              />
            )}
          </FieldShell>
          <FieldShell id={`${p}-lng`} label="Longitud (opcional)" error={err("meetingLng")}>
            {(aria) => (
              <Input
                {...aria}
                inputMode="decimal"
                autoComplete="off"
                value={values.meetingLng}
                disabled={disabled}
                onChange={set("meetingLng")}
              />
            )}
          </FieldShell>
        </div>
      </FormSection>
    </div>
  );
}

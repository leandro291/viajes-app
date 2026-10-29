"use client";

import { useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { CATALOG_MESSAGES } from "@/lib/catalog-result";

import { setNotificationPreferenceAction } from "../actions/notification-actions";
import { NOTIFICATION_OPTIONS, type NotificationKey } from "../utils/notification-options";

type NotificationSwitchesProps = { initial: Record<NotificationKey, boolean> };

export function NotificationSwitches({ initial }: NotificationSwitchesProps) {
  const baseId = useId();
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState<NotificationKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(key: NotificationKey, enabled: boolean) {
    const previous = values[key];
    setValues((v) => ({ ...v, [key]: enabled }));
    setSaving(key);
    setSaved(false);
    setError(null);
    try {
      const result = await setNotificationPreferenceAction(key, enabled);
      if (result.ok) {
        setSaved(true);
      } else {
        setValues((v) => ({ ...v, [key]: previous }));
        setError(result.message);
      }
    } catch {
      setValues((v) => ({ ...v, [key]: previous }));
      setError(CATALOG_MESSAGES.UNKNOWN);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="mt-4">
      <FieldGroup className="gap-0 divide-y divide-border">
        {NOTIFICATION_OPTIONS.map(({ key, label, description }) => {
          const labelId = `${baseId}-${key}-label`;
          const descId = `${baseId}-${key}-desc`;
          return (
            <div key={key} className="flex min-h-[44px] items-center justify-between gap-4 py-4">
              <FieldContent>
                <FieldLabel id={labelId} htmlFor={`${baseId}-${key}`} className="text-base font-bold text-ink">
                  {label}
                </FieldLabel>
                <FieldDescription id={descId} className="break-words">
                  {description}
                </FieldDescription>
              </FieldContent>
              <Switch
                id={`${baseId}-${key}`}
                checked={values[key]}
                disabled={saving !== null}
                aria-labelledby={labelId}
                aria-describedby={descId}
                onCheckedChange={(checked) => onChange(key, checked)}
              />
            </div>
          );
        })}
      </FieldGroup>
      <p role="status" aria-live="polite" className="mt-4 min-h-6 text-sm text-ink-muted">
        {saved ? "Guardado" : ""}
      </p>
      {error ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

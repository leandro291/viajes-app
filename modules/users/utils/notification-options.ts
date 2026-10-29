import { notificationKey } from "@/lib/db/schema/enums";

export type NotificationKey = (typeof notificationKey.enumValues)[number];

export const NOTIFICATION_OPTIONS: ReadonlyArray<{
  key: NotificationKey;
  label: string;
  description: string;
  defaultEnabled: boolean;
}> = [
  { key: "new_booking", label: "Nueva reserva", description: "Aviso cuando un cliente hace una reserva.", defaultEnabled: true },
  { key: "cancellations", label: "Cancelaciones", description: "Aviso cuando se cancela una reserva.", defaultEnabled: true },
  { key: "weekly_summary", label: "Resumen semanal", description: "Resumen de la actividad de la semana.", defaultEnabled: false },
];

// La fila guardada gana al default; las claves ajenas se ignoran.
export function mergePreferences(rows: { key: NotificationKey; enabled: boolean }[]): Record<NotificationKey, boolean> {
  const result = Object.fromEntries(NOTIFICATION_OPTIONS.map((o) => [o.key, o.defaultEnabled])) as Record<NotificationKey, boolean>;
  for (const row of rows) {
    if (row.key in result) result[row.key] = row.enabled;
  }
  return result;
}

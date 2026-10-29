import { describe, expect, it } from "vitest";

import { mergePreferences, NOTIFICATION_OPTIONS, type NotificationKey } from "./notification-options";

describe("notification-options", () => {
  it("AC10: defaults y orden fijo (true, true, false)", () => {
    expect(NOTIFICATION_OPTIONS.map((o) => [o.key, o.defaultEnabled])).toEqual([
      ["new_booking", true],
      ["cancellations", true],
      ["weekly_summary", false],
    ]);
  });

  it("AC10: sin filas devuelve los defaults", () => {
    expect(mergePreferences([])).toEqual({ new_booking: true, cancellations: true, weekly_summary: false });
  });

  it("AC10: filas parciales pisan solo su clave", () => {
    expect(mergePreferences([{ key: "new_booking", enabled: false }, { key: "weekly_summary", enabled: true }])).toEqual({
      new_booking: false,
      cancellations: true,
      weekly_summary: true,
    });
  });

  it("AC10: claves ajenas se ignoran", () => {
    const rows = [{ key: "otra" as NotificationKey, enabled: true }];
    expect(mergePreferences(rows)).toEqual({ new_booking: true, cancellations: true, weekly_summary: false });
  });
});

import { describe, expect, it } from "vitest";

import { notificationPreferenceSchema } from "./notification-schema";

describe("notificationPreferenceSchema", () => {
  it.each(["new_booking", "cancellations", "weekly_summary"])("AC12: acepta la key %s", (key) => {
    expect(notificationPreferenceSchema.safeParse({ key, enabled: true }).success).toBe(true);
  });

  it("AC12: rechaza una key ajena", () => {
    expect(notificationPreferenceSchema.safeParse({ key: "otra", enabled: true }).success).toBe(false);
  });

  it("AC12: rechaza enabled que no es boolean", () => {
    expect(notificationPreferenceSchema.safeParse({ key: "new_booking", enabled: "true" }).success).toBe(false);
    expect(notificationPreferenceSchema.safeParse({ key: "new_booking" }).success).toBe(false);
  });
});

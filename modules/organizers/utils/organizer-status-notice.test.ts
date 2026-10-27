import { describe, expect, it } from "vitest";
import { getOrganizerNotice } from "./organizer-status-notice";

describe("getOrganizerNotice", () => {
  it.each(["pending", "suspended"] as const)("AC8: %s devuelve aviso con tone y textos", (status) => {
    const notice = getOrganizerNotice(status);
    expect(notice?.tone).toBe(status);
    expect(notice?.title).not.toBe("");
    expect(notice?.description).not.toBe("");
  });

  it("AC8: active, null y undefined devuelven null", () => {
    expect(getOrganizerNotice("active")).toBeNull();
    expect(getOrganizerNotice(null)).toBeNull();
    expect(getOrganizerNotice(undefined)).toBeNull();
  });
});

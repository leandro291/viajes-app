import { describe, expect, it } from "vitest";

import type { ManageErrorCode } from "../types/package-manage";
import { getWriteBlock, MANAGE_MESSAGES, manageFail } from "./manage-gate";

describe("getWriteBlock", () => {
  it.each([
    ["active", false, null],
    ["active", true, null],
    ["pending", false, null],
    ["pending", true, "ORGANIZER_PENDING"],
    ["suspended", false, "ORGANIZER_SUSPENDED"],
    ["suspended", true, "ORGANIZER_SUSPENDED"],
  ] as const)("AC5: %s con publishing=%s -> %s", (status, publishing, expected) => {
    expect(getWriteBlock(status, { publishing })).toBe(expected);
  });
});

describe("MANAGE_MESSAGES", () => {
  const codes: ManageErrorCode[] = [
    "NO_ORGANIZER",
    "ORGANIZER_SUSPENDED",
    "ORGANIZER_PENDING",
    "NOT_FOUND",
    "INVALID_INPUT",
    "HAS_BOOKINGS",
    "HAS_DEPARTURES",
    "HAS_OFFERS",
    "HAS_DEPENDENCIES",
    "UNKNOWN",
  ];

  it("AC5: tiene un mensaje no vacío para cada código", () => {
    expect(Object.keys(MANAGE_MESSAGES).sort()).toEqual([...codes].sort());
    for (const code of codes) expect(MANAGE_MESSAGES[code].trim()).not.toBe("");
  });

  it("AC5: los bloqueos de borrado guían a pasar a borrador", () => {
    expect(MANAGE_MESSAGES.HAS_BOOKINGS).toContain("Pásalo a borrador");
    expect(MANAGE_MESSAGES.HAS_DEPENDENCIES).toContain("Pásalo a borrador");
  });
});

describe("manageFail", () => {
  it("AC5: arma el resultado con el mensaje de MANAGE_MESSAGES y sin fieldErrors", () => {
    const r = manageFail("NOT_FOUND");
    expect(r).toEqual({ ok: false, code: "NOT_FOUND", message: MANAGE_MESSAGES.NOT_FOUND });
    expect("fieldErrors" in r).toBe(false);
  });

  it("AC5: incluye fieldErrors solo cuando se pasan", () => {
    expect(manageFail("INVALID_INPUT", { name: "Requerido" })).toEqual({
      ok: false,
      code: "INVALID_INPUT",
      message: MANAGE_MESSAGES.INVALID_INPUT,
      fieldErrors: { name: "Requerido" },
    });
  });
});

import { describe, expect, it } from "vitest";

import { findPgError, isFkViolation, isUniqueViolation } from "./pg-errors";

describe("pg-errors", () => {
  it("AC1: detecta el código directo y en cause", () => {
    expect(isFkViolation({ code: "23503" })).toBe(true);
    expect(isFkViolation({ cause: { code: "23503" } })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(findPgError({ code: "23503" }, "23503")).toEqual({ code: "23503" });
  });

  it("AC1: constraint opcional (constraint o constraint_name)", () => {
    expect(isUniqueViolation({ code: "23505", constraint: "a" }, "a")).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505", constraint_name: "a" } }, "a")).toBe(true);
    expect(isUniqueViolation({ code: "23505", constraint: "a" }, "b")).toBe(false);
  });

  it("AC1: otros códigos y valores no objeto son falsos", () => {
    expect(isFkViolation({ code: "23505" })).toBe(false);
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    for (const v of [null, undefined, "23503", 23503]) {
      expect(isFkViolation(v)).toBe(false);
      expect(isUniqueViolation(v)).toBe(false);
    }
  });
});

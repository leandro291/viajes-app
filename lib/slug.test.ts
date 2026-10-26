import { describe, expect, it } from "vitest";

import { isValidSlug } from "./slug";

describe("isValidSlug", () => {
  it("AC11: acepta slugs válidos y el límite de 100", () => {
    expect(isValidSlug("machu-picchu-magico")).toBe(true);
    expect(isValidSlug("a")).toBe(true);
    expect(isValidSlug("a".repeat(100))).toBe(true);
  });

  it("AC11: rechaza espacios, vacío, mayúsculas, 101 caracteres y guion bajo", () => {
    expect(isValidSlug("Machu Picchu")).toBe(false);
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("Cusco")).toBe(false);
    expect(isValidSlug("a".repeat(101))).toBe(false);
    expect(isValidSlug("a_b")).toBe(false);
  });
});

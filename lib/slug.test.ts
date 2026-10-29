import { describe, expect, it } from "vitest";

import { hasSlugChars, isValidSlug, slugify } from "./slug";

describe("hasSlugChars", () => {
  it.each(["Cusco", "Ñuñoa", "2 Mares", "¡Hola!"])("AC2: %s -> true", (t) => {
    expect(hasSlugChars(t)).toBe(true);
  });

  it.each(["", "   ", "!!!", "日本"])("AC2: %j -> false", (t) => {
    expect(hasSlugChars(t)).toBe(false);
  });
});

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

describe("slugify", () => {
  it.each([
    ["Machu Picchu 3 días", "machu-picchu-3-dias"],
    ["Año Nuevo en Ñuñoa", "ano-nuevo-en-nunoa"],
    ["  Cusco   Mágico  ", "cusco-magico"],
    ["¡Valle Sagrado! (full day) & más", "valle-sagrado-full-day-mas"],
    ["--a--", "a"],
  ])("AC12: %s -> %s", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it("AC12: corta a 80 caracteres por defecto sin guion final", () => {
    const out = slugify(`${"a".repeat(79)} bbb`);
    expect(out).toBe("a".repeat(79));
    expect(slugify("a".repeat(200))).toHaveLength(80);
  });

  it("AC12: respeta maxLength custom", () => {
    expect(slugify("hola mundo", 5)).toBe("hola");
  });

  it("AC12: sin letras ni dígitos devuelve paquete", () => {
    expect(slugify("")).toBe("paquete");
    expect(slugify("   ")).toBe("paquete");
    expect(slugify("¡¿?!")).toBe("paquete");
  });

  it("AC12: el resultado siempre cumple isValidSlug", () => {
    for (const t of [
      "",
      "Ñandú",
      "x".repeat(300),
      "a - b - c",
      "日本語",
      "A_B C",
      "ab ".repeat(60),
    ]) {
      expect(isValidSlug(slugify(t))).toBe(true);
    }
  });
});

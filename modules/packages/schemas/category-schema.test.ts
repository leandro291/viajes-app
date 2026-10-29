import { describe, expect, it } from "vitest";

import { categoryInputSchema } from "./category-schema";

const issue = (input: unknown) => {
  const result = categoryInputSchema.safeParse(input);
  return result.success ? null : result.error.issues[0];
};

describe("categoryInputSchema", () => {
  it("AC4: nombre en los límites 2 y 40 pasa", () => {
    expect(issue({ name: "Aa" })).toBeNull();
    expect(issue({ name: "a".repeat(40) })).toBeNull();
  });

  it("AC4: nombre de 1 o 41 caracteres, vacío o solo espacios falla en name", () => {
    for (const name of ["A", "a".repeat(41), "", "   "]) {
      const i = issue({ name });
      expect(i?.path, name).toEqual(["name"]);
      expect(i?.message).toBe("Ingresa un nombre de 2 a 40 caracteres");
    }
  });

  it("AC4: aplica trim", () => {
    const result = categoryInputSchema.safeParse({ name: "  Aventura  " });
    expect(result.success && result.data).toEqual({ name: "Aventura" });
  });

  it("AC4: sin letras ni dígitos falla con mensaje en español", () => {
    for (const name of ["!!!", "日本"]) {
      const i = issue({ name });
      expect(i?.path, name).toEqual(["name"]);
      expect(i?.message).toBe("El nombre debe incluir al menos una letra o un número");
    }
  });

  it("AC4: descarta campos extra (slug, id)", () => {
    const result = categoryInputSchema.safeParse({ name: "Aventura", slug: "x", id: "y" });
    expect(result.success && result.data).toEqual({ name: "Aventura" });
  });

  it("AC4: ausente o no string falla sin lanzar", () => {
    expect(issue({})?.path).toEqual(["name"]);
    expect(issue({ name: 42 })?.path).toEqual(["name"]);
  });
});

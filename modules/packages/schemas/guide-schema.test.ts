import { describe, expect, it } from "vitest";

import { guideSchema } from "./guide-schema";

const PHONE = "+51 900 000 000";

const issue = (input: unknown) => {
  const result = guideSchema.safeParse(input);
  return result.success ? null : result.error.issues[0];
};

describe("guideSchema", () => {
  it("AC2: nombre en los límites 2 y 80 pasa", () => {
    expect(issue({ name: "Al", phone: PHONE })).toBeNull();
    expect(issue({ name: "a".repeat(80), phone: PHONE })).toBeNull();
  });

  it("AC2: nombre de 1 o 81 caracteres, vacío o solo espacios falla en name", () => {
    for (const name of ["A", "a".repeat(81), "", "   "]) {
      const i = issue({ name, phone: PHONE });
      expect(i?.path).toEqual(["name"]);
      expect(i?.message).toBe("Ingresa un nombre de 2 a 80 caracteres");
    }
  });

  it("AC2: teléfonos válidos pasan", () => {
    for (const phone of ["+51 900 000 000", "900000000", "01 (234) 5678", "123456", "1".repeat(20)]) {
      expect(issue({ name: "Ana", phone })).toBeNull();
    }
  });

  it("AC2: teléfonos inválidos fallan en phone con mensaje en español", () => {
    const bad = ["", "   ", "12345", "1".repeat(21), "abc123456", "+", "-123456", "900 000 00a", "++51900000"];
    for (const phone of bad) {
      const i = issue({ name: "Ana", phone });
      expect(i?.path, phone).toEqual(["phone"]);
      expect(i?.message).toBe("Ingresa un teléfono válido, ej. +51 900 000 000");
    }
  });

  it("AC2: aplica trim a nombre y teléfono", () => {
    const result = guideSchema.safeParse({ name: "  Ana  ", phone: `  ${PHONE}  ` });
    expect(result.success && result.data).toEqual({ name: "Ana", phone: PHONE });
  });

  it("AC2: campos ausentes o no string fallan sin lanzar", () => {
    expect(issue({})?.path).toEqual(["name"]);
    expect(issue({ name: "Ana", phone: 42 })?.path).toEqual(["phone"]);
  });
});

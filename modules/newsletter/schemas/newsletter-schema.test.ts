import { describe, expect, it } from "vitest";

import { subscribeSchema } from "./newsletter-schema";

const firstMessage = (input: unknown) => {
  const result = subscribeSchema.safeParse(input);
  return result.success ? null : result.error.issues[0].message;
};

describe("subscribeSchema", () => {
  it("AC10: normaliza espacios y mayúsculas", () => {
    const result = subscribeSchema.safeParse({ email: "  Ana@Correo.COM " });
    expect(result.success && result.data.email).toBe("ana@correo.com");
  });

  it("AC10: rechaza vacío o solo espacios con 'Ingresa tu correo'", () => {
    expect(firstMessage({ email: "" })).toBe("Ingresa tu correo");
    expect(firstMessage({ email: "   " })).toBe("Ingresa tu correo");
  });

  it("AC10: rechaza sin @ o sin dominio con 'Ingresa un correo válido'", () => {
    for (const email of ["ana", "ana@", "@correo.com", "ana@correo", "ana correo@x.com"]) {
      expect(firstMessage({ email })).toBe("Ingresa un correo válido");
    }
  });

  it("AC10: rechaza más de 254 caracteres", () => {
    const long = `${"a".repeat(250)}@x.com`;
    expect(long.length).toBeGreaterThan(254);
    expect(firstMessage({ email: long })).toBe("Ingresa un correo válido");
  });

  it("AC10: campo ausente o no string falla sin lanzar", () => {
    expect(firstMessage({})).toBe("Ingresa tu correo");
    expect(firstMessage({ email: null })).toBe("Ingresa tu correo"); // formData.get sin campo
    expect(firstMessage({ email: new File([], "a.txt") })).toBe("Ingresa tu correo");
    expect(firstMessage({ email: 42 })).toBe("Ingresa tu correo");
  });
});

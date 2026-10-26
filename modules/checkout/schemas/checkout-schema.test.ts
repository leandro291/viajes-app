import { describe, expect, it } from "vitest";

import { checkoutSchema, parseCheckoutForm } from "./checkout-schema";

const SALIDA = "6f1d3f0e-8a53-4c3e-9d0b-2f6b1c7a9e11";
const OFERTA = "0b8f6d4a-2c1e-4f7b-8a39-5d6e7f8a9b00";

const valid = {
  salida: SALIDA,
  viajeros: "2",
  oferta: "",
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@correo.com",
  phone: "+51987654321",
  docType: "dni",
  docNumber: "12345678",
  terms: "on",
};

// Primer error por campo; null si el input es válido.
const errors = (override: Record<string, unknown>) => {
  const r = checkoutSchema.safeParse({ ...valid, ...override });
  if (r.success) return null;
  const out: Record<string, string> = {};
  for (const i of r.error.issues) out[String(i.path[0])] ??= i.message;
  return out;
};

describe("checkoutSchema normaliza (AC5)", () => {
  it("AC5: acepta una entrada válida", () => {
    const r = checkoutSchema.safeParse(valid);
    expect(r.success && r.data).toEqual({
      salida: SALIDA,
      viajeros: 2,
      oferta: undefined,
      firstName: "Ana",
      lastName: "Pérez",
      email: "ana@correo.com",
      phone: "+51987654321",
      docType: "dni",
      docNumber: "12345678",
      terms: true,
    });
  });

  it("AC5: espacios, minúsculas, teléfono y documento", () => {
    const r = checkoutSchema.safeParse({
      ...valid,
      firstName: "  María   José ",
      lastName: " O'Brien-Díaz ",
      email: "  Ana@Correo.COM ",
      phone: "+51 987-654 321",
      docType: "passport",
      docNumber: "ab123456",
      oferta: OFERTA,
      viajeros: 3,
    });
    expect(r.success && r.data).toMatchObject({
      firstName: "María José",
      lastName: "O'Brien-Díaz",
      email: "ana@correo.com",
      phone: "+51987654321",
      docNumber: "AB123456",
      oferta: OFERTA,
      viajeros: 3,
    });
  });

  it("AC5: teléfono con paréntesis y sin +", () => {
    const r = checkoutSchema.safeParse({ ...valid, phone: "(01) 234-5678" });
    expect(r.success && r.data.phone).toBe("012345678");
  });

  it("AC5: oferta ausente (null) queda undefined", () => {
    const r = checkoutSchema.safeParse({ ...valid, oferta: null });
    expect(r.success && r.data.oferta).toBeUndefined();
  });
});

describe("checkoutSchema rechaza (AC6)", () => {
  it("AC6: nombre y apellido vacíos, con dígitos o de más de 60", () => {
    for (const field of ["firstName", "lastName"]) {
      expect(errors({ [field]: "" })?.[field]).toMatch(/Ingresa tu/);
      expect(errors({ [field]: "   " })?.[field]).toMatch(/Ingresa tu/);
      expect(errors({ [field]: "Ana2" })?.[field]).toBe(
        "Usa solo letras, espacios, apóstrofes, puntos y guiones",
      );
      expect(errors({ [field]: "a".repeat(61) })?.[field]).toBe(
        "Máximo 60 caracteres",
      );
      expect(errors({ [field]: null })?.[field]).toMatch(/Ingresa tu/);
    }
    expect(errors({ firstName: "a".repeat(60) })).toBeNull();
  });

  it("AC6: correo inválido", () => {
    for (const email of [
      "",
      "ana",
      "ana@",
      "ana@correo",
      `${"a".repeat(250)}@x.com`,
    ]) {
      expect(errors({ email })?.email).toMatch(/correo/);
    }
  });

  it("AC6: teléfono con letras, corto o largo", () => {
    expect(errors({ phone: "" })?.phone).toBe("Ingresa tu celular");
    for (const phone of ["98765abc", "123456", "+1234567890123456"]) {
      expect(errors({ phone })?.phone).toBe(
        "Ingresa un celular válido (7 a 15 dígitos)",
      );
    }
    expect(errors({ phone: "1234567" })).toBeNull();
    expect(errors({ phone: "+123456789012345" })).toBeNull();
  });

  it("AC6: DNI distinto de 8 dígitos", () => {
    for (const docNumber of ["1234567", "123456789", "1234567A"]) {
      expect(errors({ docType: "dni", docNumber })?.docNumber).toBe(
        "El DNI debe tener 8 dígitos",
      );
    }
  });

  it("AC6: pasaporte y carné de 5 o 13 caracteres o con símbolos", () => {
    for (const docType of ["passport", "foreign_id"]) {
      for (const docNumber of ["A1234", "A123456789012", "AB_12345"]) {
        expect(errors({ docType, docNumber })?.docNumber).toBe(
          "Usa de 6 a 12 letras o números, sin símbolos",
        );
      }
      expect(errors({ docType, docNumber: "1234567" })).toBeNull();
    }
  });

  it("AC6: docType desconocido o ausente", () => {
    expect(errors({ docType: "ruc" })?.docType).toBe(
      "Elige un tipo de documento",
    );
    expect(errors({ docType: null })?.docType).toBe(
      "Elige un tipo de documento",
    );
  });

  it("AC6: términos ausentes", () => {
    for (const terms of [undefined, null, "", "off"]) {
      expect(errors({ terms })?.terms).toBe(
        "Debes aceptar los términos y condiciones",
      );
    }
  });

  it("AC6: salida no uuid y viajeros fuera de rango", () => {
    expect(errors({ salida: "zzz" })?.salida).toBeDefined();
    expect(errors({ salida: null })?.salida).toBeDefined();
    expect(errors({ oferta: "zzz" })?.oferta).toBeDefined();
    for (const viajeros of ["0", "21", "abc", "1.5", "", null, 0, 21]) {
      expect(errors({ viajeros })?.viajeros).toBeDefined();
    }
    expect(errors({ viajeros: "20" })).toBeNull();
    expect(errors({ viajeros: 1 })).toBeNull();
  });
});

describe("parseCheckoutForm (AC6)", () => {
  const toForm = (fields: Record<string, string>) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    return fd;
  };
  const base = { ...valid } as Record<string, string>;

  it("AC6: formulario válido", () => {
    const r = parseCheckoutForm(toForm(base));
    expect(r.ok && r.data.viajeros).toBe(2);
  });

  it("AC6: falla en campos del usuario sin marcar linkInvalid", () => {
    const rest: Record<string, string> = { ...base, email: "mal" };
    delete rest.terms;
    const r = parseCheckoutForm(toForm(rest));
    expect(r).toMatchObject({
      ok: false,
      linkInvalid: false,
      fieldErrors: {
        email: "Ingresa un correo válido",
        terms: "Debes aceptar los términos y condiciones",
      },
    });
  });

  it("AC6: marca linkInvalid con salida, viajeros u oferta inválidos", () => {
    for (const bad of [
      { salida: "zzz" },
      { viajeros: "99" },
      { oferta: "zzz" },
    ] as Record<string, string>[]) {
      const r = parseCheckoutForm(toForm({ ...base, ...bad }));
      expect(r).toMatchObject({
        ok: false,
        linkInvalid: true,
        fieldErrors: {},
      });
    }
  });

  it("AC6: campos ocultos ausentes también son enlace inválido", () => {
    const rest: Record<string, string> = { ...base };
    delete rest.salida;
    expect(parseCheckoutForm(toForm(rest))).toMatchObject({
      ok: false,
      linkInvalid: true,
    });
  });
});

describe("checkoutSchema descarta extras (AC7)", () => {
  it("AC7: total, precio, packageId, customerId y amountUsdCents no llegan", () => {
    const extras = {
      total: 1,
      precio: 1,
      packageId: "x",
      customerId: "y",
      amountUsdCents: 1,
    };
    const r = checkoutSchema.safeParse({ ...valid, ...extras });
    expect(r.success).toBe(true);
    if (r.success) {
      for (const k of Object.keys(extras)) expect(r.data).not.toHaveProperty(k);
    }
  });

  it("AC7: parseCheckoutForm ignora campos extra del FormData", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(valid)) fd.set(k, v);
    fd.set("total", "1");
    fd.set("amountUsdCents", "1");
    const r = parseCheckoutForm(fd);
    expect(r.ok && Object.keys(r.data)).not.toContain("total");
    expect(r.ok && Object.keys(r.data)).not.toContain("amountUsdCents");
  });
});

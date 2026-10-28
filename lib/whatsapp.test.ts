import { describe, expect, it } from "vitest";
import { buildWhatsAppUrl } from "./whatsapp";

describe("buildWhatsAppUrl", () => {
  it("AC10: deja solo dígitos (+, espacios, guiones)", () => {
    expect(buildWhatsAppUrl("+51 999-999-999", "hola")).toBe("https://wa.me/51999999999?text=hola");
  });

  it("AC10: codifica mensaje con tildes y espacios", () => {
    expect(buildWhatsAppUrl("51999999999", "Hola Wayra, ¿viajamos?")).toBe(
      `https://wa.me/51999999999?text=${encodeURIComponent("Hola Wayra, ¿viajamos?")}`,
    );
  });

  it("AC10: null si el número tiene menos de 8 dígitos", () => {
    expect(buildWhatsAppUrl("1234567", "x")).toBeNull();
    expect(buildWhatsAppUrl("+(12) 3-4", "x")).toBeNull();
  });

  it("AC10: acepta exactamente 8 dígitos", () => {
    expect(buildWhatsAppUrl("12345678", "x")).toBe("https://wa.me/12345678?text=x");
  });

  it("AC10: null si falta o está vacío", () => {
    expect(buildWhatsAppUrl(undefined, "x")).toBeNull();
    expect(buildWhatsAppUrl("", "x")).toBeNull();
    expect(buildWhatsAppUrl("abc", "x")).toBeNull();
  });
});

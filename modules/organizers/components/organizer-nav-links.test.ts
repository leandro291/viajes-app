import { describe, expect, it } from "vitest";
import { ORGANIZER_NAV_LINKS, isActiveNavLink } from "./organizer-nav-links";

describe("isActiveNavLink", () => {
  it("AC9: /operador exacto activa Perfil", () => {
    expect(isActiveNavLink("/operador", "/operador")).toBe(true);
  });

  it("AC9: /operador/paquetes no activa Perfil", () => {
    expect(isActiveNavLink("/operador/paquetes", "/operador")).toBe(false);
  });

  it("AC9: subruta de un link no raíz activa ese link", () => {
    expect(isActiveNavLink("/operador/paquetes", "/operador/paquetes")).toBe(true);
    expect(isActiveNavLink("/operador/paquetes/nuevo", "/operador/paquetes")).toBe(true);
    expect(isActiveNavLink("/operador/paquetesx", "/operador/paquetes")).toBe(false);
  });

  it("AC9: pathname null devuelve false", () => {
    expect(isActiveNavLink(null, "/operador")).toBe(false);
  });

  it("AC9: /operadores no activa /operador", () => {
    expect(isActiveNavLink("/operadores", "/operador")).toBe(false);
  });
});

describe("ORGANIZER_NAV_LINKS", () => {
  it("AC2: solo contiene Perfil (/operador)", () => {
    expect(ORGANIZER_NAV_LINKS.map((l) => l.href)).toEqual(["/operador"]);
  });
});

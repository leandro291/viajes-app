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
    expect(isActiveNavLink("/operador/paquetes", "/operador/paquetes")).toBe(
      true,
    );
    expect(
      isActiveNavLink("/operador/paquetes/nuevo", "/operador/paquetes"),
    ).toBe(true);
    expect(isActiveNavLink("/operador/paquetesx", "/operador/paquetes")).toBe(
      false,
    );
  });

  it("AC9: pathname null devuelve false", () => {
    expect(isActiveNavLink(null, "/operador")).toBe(false);
  });

  it("AC9: /operadores no activa /operador", () => {
    expect(isActiveNavLink("/operadores", "/operador")).toBe(false);
  });
});

describe("ORGANIZER_NAV_LINKS", () => {
  it("AC13/AC15: contiene Perfil, Paquetes, Salidas, Reservas, Ofertas y Guías en ese orden", () => {
    expect(ORGANIZER_NAV_LINKS.map((l) => l.href)).toEqual([
      "/operador",
      "/operador/paquetes",
      "/operador/salidas",
      "/operador/reservas",
      "/operador/ofertas",
      "/operador/guias",
    ]);
  });

  it("AC13: /operador/reservas y subrutas activan Reservas y no Perfil", () => {
    for (const path of ["/operador/reservas", "/operador/reservas/x"]) {
      expect(isActiveNavLink(path, "/operador/reservas")).toBe(true);
      expect(isActiveNavLink(path, "/operador")).toBe(false);
      expect(isActiveNavLink(path, "/operador/salidas")).toBe(false);
    }
  });

  it("AC16: /operador/ofertas activa Ofertas y no Perfil, Salidas ni Reservas", () => {
    expect(isActiveNavLink("/operador/ofertas", "/operador/ofertas")).toBe(true);
    expect(isActiveNavLink("/operador/ofertas", "/operador")).toBe(false);
    expect(isActiveNavLink("/operador/ofertas", "/operador/salidas")).toBe(false);
    expect(isActiveNavLink("/operador/ofertas", "/operador/reservas")).toBe(false);
  });

  it("AC32: /operador/guias y subrutas activan Guías y no Perfil", () => {
    for (const path of ["/operador/guias", "/operador/guias/x"]) {
      expect(isActiveNavLink(path, "/operador/guias")).toBe(true);
      expect(isActiveNavLink(path, "/operador")).toBe(false);
    }
  });

  it("AC15: /operador/salidas activa Salidas y no Perfil ni Paquetes", () => {
    expect(isActiveNavLink("/operador/salidas", "/operador/salidas")).toBe(true);
    expect(isActiveNavLink("/operador/salidas", "/operador")).toBe(false);
    expect(isActiveNavLink("/operador/salidas", "/operador/paquetes")).toBe(
      false,
    );
  });

  it("AC32: /operador/paquetes y subrutas activan Paquetes y no Perfil ni Guías", () => {
    const id = "123e4567-e89b-42d3-a456-426614174000";
    for (const path of [
      "/operador/paquetes",
      "/operador/paquetes/nuevo",
      `/operador/paquetes/${id}/editar`,
    ]) {
      expect(isActiveNavLink(path, "/operador/paquetes")).toBe(true);
      expect(isActiveNavLink(path, "/operador")).toBe(false);
      expect(isActiveNavLink(path, "/operador/guias")).toBe(false);
    }
  });
});

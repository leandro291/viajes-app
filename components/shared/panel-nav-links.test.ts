import { describe, expect, it } from "vitest";
import { isActivePanelLink } from "./panel-nav-links";

describe("isActivePanelLink", () => {
  it("AC2: raíz exacta activa el link raíz", () => {
    expect(isActivePanelLink("/admin", "/admin", "/admin")).toBe(true);
  });

  it("AC2: subruta no activa la raíz", () => {
    expect(isActivePanelLink("/admin/reservas", "/admin", "/admin")).toBe(false);
  });

  it("AC12: subruta de un link no raíz activa ese link", () => {
    const root = "/operador";
    expect(
      isActivePanelLink("/operador/paquetes", "/operador/paquetes", root),
    ).toBe(true);
    expect(
      isActivePanelLink("/operador/paquetes/nuevo", "/operador/paquetes", root),
    ).toBe(true);
    expect(
      isActivePanelLink("/operador/paquetesx", "/operador/paquetes", root),
    ).toBe(false);
  });

  it("AC2: pathname null devuelve false", () => {
    expect(isActivePanelLink(null, "/admin", "/admin")).toBe(false);
  });

  it("AC2: prefijo parecido no activa la raíz", () => {
    expect(isActivePanelLink("/administradores", "/admin", "/admin")).toBe(false);
    expect(isActivePanelLink("/operadores", "/operador", "/operador")).toBe(false);
  });
});

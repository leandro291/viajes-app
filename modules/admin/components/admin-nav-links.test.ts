import { describe, expect, it } from "vitest";

import { isActivePanelLink } from "@/components/shared/panel-nav-links";

import { ADMIN_NAV_LINKS } from "./admin-nav-links";

describe("ADMIN_NAV_LINKS", () => {
  it("AC1, AC9: Paquetes y Ofertas van tras Resumen y Reservas, en ese orden, con su href", () => {
    expect(ADMIN_NAV_LINKS.map((l) => [l.label, l.href])).toEqual([
      ["Resumen", "/admin"],
      ["Reservas", "/admin/reservas"],
      ["Paquetes", "/admin/paquetes"],
      ["Ofertas", "/admin/ofertas"],
    ]);
  });

  it("AC9: Paquetes queda activo en /admin/paquetes/[id]/editar y Resumen no", () => {
    const path = "/admin/paquetes/abc/editar";
    expect(isActivePanelLink(path, "/admin/paquetes", "/admin")).toBe(true);
    expect(isActivePanelLink(path, "/admin", "/admin")).toBe(false);
  });
});

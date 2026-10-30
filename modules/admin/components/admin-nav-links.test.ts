import { describe, expect, it } from "vitest";

import { isActivePanelLink } from "@/components/shared/panel-nav-links";

import { ADMIN_NAV_LINKS, getAdminNavLinks } from "./admin-nav-links";

describe("ADMIN_NAV_LINKS", () => {
  it("AC1, AC8, AC9, AC26: Clientes, Paquetes y Ofertas van tras Resumen y Reservas, y Destinos, Categorías y Operadores al final, con su href", () => {
    expect(ADMIN_NAV_LINKS.map((l) => [l.label, l.href])).toEqual([
      ["Resumen", "/admin"],
      ["Reservas", "/admin/reservas"],
      ["Clientes", "/admin/clientes"],
      ["Paquetes", "/admin/paquetes"],
      ["Ofertas", "/admin/ofertas"],
      ["Destinos", "/admin/destinos"],
      ["Categorías", "/admin/categorias"],
      ["Operadores", "/admin/operadores"],
    ]);
  });

  it("AC9: Paquetes queda activo en /admin/paquetes/[id]/editar y Resumen no", () => {
    const path = "/admin/paquetes/abc/editar";
    expect(isActivePanelLink(path, "/admin/paquetes", "/admin")).toBe(true);
    expect(isActivePanelLink(path, "/admin", "/admin")).toBe(false);
  });
});

describe("getAdminNavLinks", () => {
  it("AC9: admin ve solo ADMIN_NAV_LINKS", () => {
    expect(getAdminNavLinks("admin")).toEqual(ADMIN_NAV_LINKS);
  });

  it("AC9: super_admin agrega Administradores y Configuración al final y no cambia los hrefs existentes", () => {
    const links = getAdminNavLinks("super_admin");
    expect(links.slice(0, ADMIN_NAV_LINKS.length)).toEqual(ADMIN_NAV_LINKS);
    expect(links.slice(ADMIN_NAV_LINKS.length).map((l) => [l.label, l.href])).toEqual([
      ["Administradores", "/admin/administradores"],
      ["Configuración", "/admin/configuracion"],
    ]);
  });
});

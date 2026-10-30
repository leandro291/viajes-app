import { ClipboardList, LayoutDashboard, MapPin, Package, Settings, ShieldCheck, Store, Tag, Tags, Users } from "lucide-react";

import type { PanelNavLink } from "@/components/shared/panel-nav-links";
import type { Role } from "@/lib/auth/roles";

// Cada tarjeta de página del panel agrega su link aquí (solo páginas existentes).
export const ADMIN_NAV_LINKS: ReadonlyArray<PanelNavLink> = [
  { label: "Resumen", href: "/admin", icon: LayoutDashboard },
  { label: "Reservas", href: "/admin/reservas", icon: ClipboardList },
  { label: "Clientes", href: "/admin/clientes", icon: Users },
  { label: "Paquetes", href: "/admin/paquetes", icon: Package },
  { label: "Ofertas", href: "/admin/ofertas", icon: Tag },
  { label: "Destinos", href: "/admin/destinos", icon: MapPin },
  { label: "Categorías", href: "/admin/categorias", icon: Tags },
  { label: "Operadores", href: "/admin/operadores", icon: Store },
];

// Solo super_admin (cosmético: la seguridad real son proxy.ts + guardia en página y action).
export const SUPER_ADMIN_NAV_LINKS: ReadonlyArray<PanelNavLink> = [
  { label: "Administradores", href: "/admin/administradores", icon: ShieldCheck },
  { label: "Configuración", href: "/admin/configuracion", icon: Settings },
];

export function getAdminNavLinks(role: Role): ReadonlyArray<PanelNavLink> {
  return role === "super_admin" ? [...ADMIN_NAV_LINKS, ...SUPER_ADMIN_NAV_LINKS] : ADMIN_NAV_LINKS;
}

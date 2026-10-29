import { ClipboardList, LayoutDashboard, MapPin, Package, Store, Tag, Tags, Users } from "lucide-react";

import type { PanelNavLink } from "@/components/shared/panel-nav-links";

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

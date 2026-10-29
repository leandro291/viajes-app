import { ClipboardList, LayoutDashboard, Package, Tag } from "lucide-react";

import type { PanelNavLink } from "@/components/shared/panel-nav-links";

// Cada tarjeta de página del panel agrega su link aquí (solo páginas existentes).
export const ADMIN_NAV_LINKS: ReadonlyArray<PanelNavLink> = [
  { label: "Resumen", href: "/admin", icon: LayoutDashboard },
  { label: "Reservas", href: "/admin/reservas", icon: ClipboardList },
  { label: "Paquetes", href: "/admin/paquetes", icon: Package },
  { label: "Ofertas", href: "/admin/ofertas", icon: Tag },
];

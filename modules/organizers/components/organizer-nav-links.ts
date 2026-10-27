import { Building2, type LucideIcon } from "lucide-react";

// Cada tarjeta de página del panel agrega su link aquí (solo páginas existentes).
export const ORGANIZER_NAV_LINKS: ReadonlyArray<{
  label: string;
  href: string;
  icon: LucideIcon;
}> = [{ label: "Perfil", href: "/operador", icon: Building2 }];

const ROOT = "/operador";

export function isActiveNavLink(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === ROOT) return pathname === ROOT;
  return pathname === href || pathname.startsWith(`${href}/`);
}

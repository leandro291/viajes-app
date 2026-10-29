import type { LucideIcon } from "lucide-react";

export type PanelNavLink = { label: string; href: string; icon: LucideIcon };

// El link raíz solo se activa con coincidencia exacta; el resto, también en subrutas.
export function isActivePanelLink(
  pathname: string | null,
  href: string,
  rootHref: string,
): boolean {
  if (!pathname) return false;
  if (href === rootHref) return pathname === rootHref;
  return pathname === href || pathname.startsWith(`${href}/`);
}

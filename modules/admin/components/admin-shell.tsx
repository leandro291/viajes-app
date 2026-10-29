"use client"

import type { ReactNode } from "react"

import { PanelShell } from "@/components/shared/panel-shell"

import { ADMIN_NAV_LINKS } from "./admin-nav-links"

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <PanelShell
      links={ADMIN_NAV_LINKS}
      rootHref="/admin"
      navLabel="Panel de administración"
      menuTitle="Menú del panel de administración"
    >
      {children}
    </PanelShell>
  )
}

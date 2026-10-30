"use client"

import { useUser } from "@clerk/nextjs"
import type { ReactNode } from "react"

import { PanelShell } from "@/components/shared/panel-shell"
import { roleFromClaims } from "@/lib/auth/roles"

import { getAdminNavLinks } from "./admin-nav-links"

export function AdminShell({ children }: { children: ReactNode }) {
  const { user } = useUser()
  // ponytail: hay un instante sin los links de super_admin hasta que carga el usuario.
  const role = roleFromClaims({ metadata: user?.publicMetadata })

  return (
    <PanelShell
      links={getAdminNavLinks(role)}
      rootHref="/admin"
      navLabel="Panel de administración"
      menuTitle="Menú del panel de administración"
    >
      {children}
    </PanelShell>
  )
}

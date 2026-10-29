"use client"

import type { ReactNode } from "react"

import { PanelShell } from "@/components/shared/panel-shell"

import { ORGANIZER_NAV_LINKS } from "./organizer-nav-links"

// Client porque los links llevan íconos (funciones) que no cruzan Server -> Client;
// `children` entra como slot (OrganizerStatusNotice sigue siendo Server Component).
export function OrganizerShell({ children }: { children: ReactNode }) {
  return (
    <PanelShell
      links={ORGANIZER_NAV_LINKS}
      rootHref="/operador"
      navLabel="Panel del operador"
      menuTitle="Menú del panel del operador"
    >
      {children}
    </PanelShell>
  )
}

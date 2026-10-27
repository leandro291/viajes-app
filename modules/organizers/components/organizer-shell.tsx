import type { ReactNode } from "react"

import { UserMenu } from "@/components/shared/user-menu"
import { WayraLogo } from "@/components/shared/wayra-logo"

import {
  OrganizerMobileBar,
  OrganizerNav,
  OrganizerNavSectionLabel,
} from "./organizer-nav"

// Sidebar fijo de 264 px en escritorio; barra superior + Sheet en móvil.
export function OrganizerShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-66">
      <aside className="fixed inset-y-0 left-0 hidden w-66 flex-col gap-6 bg-dark p-4 md:flex">
        <WayraLogo />
        <div className="flex flex-col gap-2">
          <OrganizerNavSectionLabel />
          <OrganizerNav />
        </div>
        <div className="mt-auto flex min-h-11 items-center px-3">
          <UserMenu />
        </div>
      </aside>
      <OrganizerMobileBar />
      <main className="px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  )
}

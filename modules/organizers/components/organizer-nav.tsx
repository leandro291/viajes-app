"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { UserMenu } from "@/components/shared/user-menu"
import { WayraLogo } from "@/components/shared/wayra-logo"
import { cn } from "@/lib/utils"

import { isActiveNavLink, ORGANIZER_NAV_LINKS } from "./organizer-nav-links"

export function OrganizerNavSectionLabel() {
  return (
    <p className="px-3 text-[11px] font-bold tracking-[0.08em] text-[#A9BAB7] uppercase">
      Gestión
    </p>
  )
}

// Links del panel (escritorio y Sheet). `onNavigate` cierra el Sheet al elegir un link.
export function OrganizerNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Panel del operador">
      <ul className="flex flex-col gap-1">
        {ORGANIZER_NAV_LINKS.map(({ label, href, icon: Icon }) => {
          const active = isActiveNavLink(pathname, href)
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors duration-150 hover:bg-white/8 hover:text-white motion-reduce:transition-none",
                  active
                    ? "bg-white/8 font-bold text-white shadow-[inset_3px_0_0_var(--color-focus)]"
                    : "font-medium text-[#A9BAB7]",
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("size-[18px]", active && "text-focus")}
                />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Barra superior móvil: logo + botón que abre el Sheet con la misma navegación.
export function OrganizerMobileBar() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-dark px-4 md:hidden">
      <WayraLogo />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10 hover:text-white"
            />
          }
        >
          <Menu aria-hidden className="size-5" />
          <span className="sr-only">Abrir menú</span>
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-full max-w-80 gap-6 border-white/10 bg-dark p-4 text-white motion-reduce:transition-none sm:max-w-80"
        >
          <SheetTitle className="sr-only">Menú del panel del operador</SheetTitle>
          <div className="flex items-center justify-between">
            <WayraLogo />
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 hover:text-white"
                />
              }
            >
              <X aria-hidden className="size-5" />
              <span className="sr-only">Cerrar menú</span>
            </SheetClose>
          </div>
          <div className="flex flex-col gap-2">
            <OrganizerNavSectionLabel />
            <OrganizerNav onNavigate={() => setOpen(false)} />
          </div>
          <div className="mt-auto flex min-h-11 items-center px-3">
            <UserMenu />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  )
}

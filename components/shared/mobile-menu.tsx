"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs"
import { Menu, X } from "lucide-react"

import { SITE_LINKS } from "@/components/shared/site-links"
import { cn } from "@/lib/utils"

const authButton =
  "inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full px-4 text-[15px] font-bold whitespace-nowrap"

// Botón redondo del encabezado móvil (< md) + panel blanco bajo el encabezado con los links
// y el acceso. El panel se posiciona contra el `<header>` (ancestro posicionado).
export function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", close)
    document.addEventListener("pointerdown", close)
    return () => {
      document.removeEventListener("keydown", close)
      document.removeEventListener("pointerdown", close)
    }
  }, [open])

  return (
    <div ref={root} className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen(!open)}
        className="flex size-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-white/70 bg-[rgba(8,14,13,.25)] text-white"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-3 top-[68px] rounded-3xl bg-surface p-5 text-ink shadow-card"
        >
          <nav aria-label="Principal">
            <ul>
              {SITE_LINKS.map(({ label, href }) => {
                const active = pathname === href || !!pathname?.startsWith(`${href}/`)
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center text-base",
                        active ? "font-bold text-accent" : "font-medium",
                      )}
                    >
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
          <Show when="signed-out">
            <div className="mt-3 flex gap-3 border-t border-border pt-4">
              <SignInButton>
                <button className={cn(authButton, "border-[1.5px] border-border-strong")}>
                  Iniciar sesión
                </button>
              </SignInButton>
              <SignUpButton>
                <button className={cn(authButton, "bg-accent text-white")}>Registrarse</button>
              </SignUpButton>
            </div>
          </Show>
        </div>
      )}
    </div>
  )
}

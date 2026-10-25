"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type NavLinks = ReadonlyArray<{ label: string; href: string }>

function NavList({ links, pathname }: { links: NavLinks; pathname: string | null }) {
  return (
    <nav aria-label="Principal" className="flex-auto">
      <ul className="flex flex-wrap gap-x-[30px] gap-y-1">
        {links.map(({ label, href }) => {
          const active = pathname === href || !!pathname?.startsWith(`${href}/`)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center text-base text-white transition-colors duration-150 hover:text-accent-soft",
                  active
                    ? "font-bold shadow-[inset_0_-2px_0_var(--color-focus)]"
                    : "font-medium",
                )}
              >
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// Marca el link de la sección actual (aria-current + subrayado).
export function SiteNav({ links }: { links: NavLinks }) {
  return <NavList links={links} pathname={usePathname()} />
}

// Fallback de Suspense: mismos links sin saber la ruta (usePathname puede suspender
// en rutas con params dinámicos; ver docs de cacheComponents).
export function SiteNavPlain({ links }: { links: NavLinks }) {
  return <NavList links={links} pathname={null} />
}

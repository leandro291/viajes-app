import Link from "next/link"

import { SITE_LINKS } from "@/components/shared/site-links"
import { WayraLogo } from "@/components/shared/wayra-logo"

export function SiteFooter() {
  return (
    <footer className="bg-dark text-white">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4">
        <WayraLogo />
        <nav aria-label="Pie" className="min-w-0">
          <ul className="flex flex-wrap gap-x-6">
            {SITE_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center text-[15px] font-medium text-white hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-white">© Wayra</p>
      </div>
    </footer>
  )
}

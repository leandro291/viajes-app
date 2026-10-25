import Link from "next/link"

import { SITE_LINKS } from "@/components/shared/site-links"
import { WayraLogo } from "@/components/shared/wayra-logo"

export function SiteFooter() {
  return (
    <footer className="bg-dark text-[#C9D6D4]">
      <div className="mx-auto flex w-full max-w-[1240px] flex-wrap gap-10 px-6 pt-16 pb-9">
        <div className="flex flex-[2_1_280px] flex-col gap-3.5">
          <WayraLogo compact />
          <p className="max-w-[340px] leading-relaxed">
            Paquetes y tours por todo el Perú, con operadores locales y soporte
            en español.
          </p>
        </div>
        <nav aria-label="Pie" className="flex flex-[1_1_150px] flex-col">
          <p className="mb-1 font-bold text-white">Explorar</p>
          <ul className="flex flex-col">
            {SITE_LINKS.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-11 items-center transition-colors duration-150 hover:text-accent-soft"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex flex-[1_1_150px] flex-col gap-3">
          <p className="font-bold text-white">Medios de pago</p>
          <p>Visa · Mastercard</p>
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1240px] border-t border-white/12 px-6 pt-5 pb-9 text-sm">
        <p>© Wayra Perú.</p>
      </div>
    </footer>
  )
}

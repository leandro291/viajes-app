import Link from "next/link"
import { Mountain } from "lucide-react"

// Solo se usa sobre fondos `bg-dark` (encabezado y pie), por eso el texto es blanco.
export function WayraLogo() {
  return (
    <Link
      href="/"
      aria-label="Wayra, inicio"
      className="inline-flex min-h-11 items-center gap-2.5"
    >
      <span className="flex size-9 items-center justify-center rounded-full bg-accent text-white">
        <Mountain aria-hidden className="size-5" />
      </span>
      <span className="font-display text-xl font-extrabold text-white">
        Wayra
      </span>
    </Link>
  )
}

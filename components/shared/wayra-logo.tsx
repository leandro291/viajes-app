import Link from "next/link"
import { Mountain } from "lucide-react"

import { cn } from "@/lib/utils"

// Solo se usa sobre fondos `bg-dark` (encabezado y pie), por eso el texto es blanco.
// `compact` = versión del pie (círculo de 32 px en vez de 34 px).
export function WayraLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Wayra, inicio"
      className="inline-flex min-h-11 items-center gap-2.5"
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-full bg-accent text-white",
          compact ? "size-8" : "size-[34px]",
        )}
      >
        <Mountain aria-hidden className="size-[18px]" />
      </span>
      <span className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-white">
        Wayra
      </span>
    </Link>
  )
}

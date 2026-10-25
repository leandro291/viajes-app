import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

type PageHeroProps = ComponentProps<"section"> & {
  /** Foto(s) `absolute inset-0`. Omitido = fondo `bg-dark` liso. */
  background?: ReactNode
  /** Padding inferior / gap del contenedor interno. */
  contentClassName?: string
}

// Hero a todo el ancho. `data-page-hero` hace que el layout público deje el encabezado
// transparente y superpuesto (ver app/(public)/layout.tsx). El `min-h-*` lo pone cada pantalla.
export function PageHero({
  background,
  contentClassName,
  className,
  children,
  ...props
}: PageHeroProps) {
  return (
    <section
      data-page-hero
      className={cn(
        "relative flex flex-col overflow-hidden bg-dark text-white",
        className,
      )}
      {...props}
    >
      {background}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,14,13,.92)_0%,rgba(8,14,13,.62)_38%,rgba(8,14,13,.08)_72%),linear-gradient(to_bottom,rgba(8,14,13,.6)_0,rgba(8,14,13,0)_180px)]"
      />
      {/* pt-*: espacio para el encabezado superpuesto (3 filas en móvil, 2 en tablet, 1 en escritorio). */}
      <div
        className={cn(
          "relative z-10 mx-auto flex w-full max-w-[1240px] flex-1 flex-col justify-end px-6 pt-52 sm:pt-40 min-[960px]:pt-24",
          contentClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}

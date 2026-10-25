"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
// Excepción a "no importar internos de otro módulo": PackageCard es presentacional
// y sin db; el barrel de @/modules/packages arrastraría services/lib/db al cliente (AC19).
import { PackageCard } from "@/modules/packages/components/package-card"

import {
  CHIP_ALL,
  filterByChip,
  type CategoryChip,
  type RailCard,
} from "../utils/category-chips"

const MAX_CARDS = 12

export function PackageRail({
  cards,
  chips,
}: {
  cards: RailCard[]
  chips: CategoryChip[]
}) {
  const [active, setActive] = useState(CHIP_ALL)
  const railRef = useRef<HTMLDivElement>(null)

  if (cards.length === 0) return null

  const visible = filterByChip(cards.slice(0, MAX_CARDS), active)

  function scrollRail(left: number, relative: boolean) {
    const rail = railRef.current
    if (!rail) return
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth"
    if (relative) rail.scrollBy({ left, behavior })
    else rail.scrollTo({ left, behavior })
  }

  function selectChip(key: string) {
    setActive(key)
    scrollRail(0, false)
  }

  return (
    <section className="flex flex-col gap-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-3xl font-bold text-ink">
          Paquetes para cada viaje
        </h2>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Paquetes anteriores"
            onClick={() =>
              scrollRail(-(railRef.current?.clientWidth ?? 0), true)
            }
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            aria-label="Más paquetes"
            onClick={() => scrollRail(railRef.current?.clientWidth ?? 0, true)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isActive = chip.key === active
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectChip(chip.key)}
              className={cn(
                "inline-flex h-11 items-center rounded-full border px-5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-field bg-surface text-ink hover:bg-sand",
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visible.map((card) => (
          <PackageCard
            key={card.slug}
            slug={card.slug}
            title={card.title}
            coverImageUrl={card.coverImageUrl}
            regionLabel={card.regionLabel}
            tag={card.tag}
            durationLabel={card.durationLabel}
            priceLabel={card.priceLabel}
            className="w-[280px] shrink-0 snap-start md:w-[300px]"
          />
        ))}
      </div>
    </section>
  )
}

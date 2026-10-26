"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { SectionHeading } from "@/components/shared/section-heading"
import { Button } from "@/components/ui/button"
import { useScrollRail } from "@/hooks/use-scroll-rail"
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

const roundControl =
  "size-12 rounded-full border-[1.5px] border-border-strong bg-surface text-ink hover:border-ink hover:bg-ink hover:text-white"

export function PackageRail({
  cards,
  chips,
}: {
  cards: RailCard[]
  chips: CategoryChip[]
}) {
  const [active, setActive] = useState(CHIP_ALL)
  const { ref: railRef, scrollByPage, scrollToStart } =
    useScrollRail<HTMLDivElement>()

  if (cards.length === 0) return null

  const visible = filterByChip(cards.slice(0, MAX_CARDS), active)

  function selectChip(key: string) {
    setActive(key)
    scrollToStart()
  }

  return (
    <section className="mx-auto flex w-full max-w-[1240px] flex-col px-6 pt-22">
      <div className="mb-6">
        <SectionHeading eyebrow="Lo más reservado" title="Paquetes para cada viaje">
          <div className="flex items-center gap-2.5">
            <Link
              href="/paquetes"
              className="inline-flex min-h-11 items-center px-3 font-bold text-primary hover:text-accent max-[720px]:hidden"
            >
              Ver todos
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className={roundControl}
              aria-label="Paquetes anteriores"
              onClick={() => scrollByPage(-1)}
            >
              <ChevronLeft aria-hidden strokeWidth={2.4} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className={roundControl}
              aria-label="Más paquetes"
              onClick={() => scrollByPage(1)}
            >
              <ChevronRight aria-hidden strokeWidth={2.4} />
            </Button>
          </div>
        </SectionHeading>
      </div>

      <div
        role="group"
        aria-label="Tipo de experiencia"
        className="mb-7 flex flex-wrap gap-2"
      >
        {chips.map((chip) => {
          const isActive = chip.key === active
          return (
            <button
              key={chip.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectChip(chip.key)}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border-[1.5px] px-5 py-[11px] text-[15px] font-bold transition-colors",
                isActive
                  ? "border-ink bg-ink text-white"
                  : "border-border-strong bg-surface text-ink hover:bg-sand",
              )}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <div
        ref={railRef}
        className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-[22px] overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
            className="shrink-0 basis-[min(290px,76%)] snap-start"
          />
        ))}
      </div>
    </section>
  )
}

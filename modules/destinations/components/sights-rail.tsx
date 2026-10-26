"use client"

import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { SectionHeading } from "@/components/shared/section-heading"
import { Button } from "@/components/ui/button"
import { useScrollRail } from "@/hooks/use-scroll-rail"

import type { SightDto } from "../types/destination"
import { sightsHeading } from "../utils/destination-page"

const SCROLL_RATIO = 0.85

const roundControl =
  "size-12 rounded-full border-[1.5px] border-border-strong bg-surface text-ink hover:border-ink hover:bg-ink hover:text-white"

export function SightsRail({ sights }: { sights: SightDto[] }) {
  const { ref, scrollByPage } = useScrollRail<HTMLUListElement>()

  return (
    <div>
      <div className="mb-7">
        <SectionHeading
          eyebrow="Lo imperdible"
          title={sightsHeading(sights.length)}
        >
          <div className="flex items-center gap-2.5 max-[720px]:hidden">
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className={roundControl}
              aria-label="Lugares anteriores"
              onClick={() => scrollByPage(-1, SCROLL_RATIO)}
            >
              <ChevronLeft aria-hidden strokeWidth={2.4} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-lg"
              className={roundControl}
              aria-label="Más lugares"
              onClick={() => scrollByPage(1, SCROLL_RATIO)}
            >
              <ChevronRight aria-hidden strokeWidth={2.4} />
            </Button>
          </div>
        </SectionHeading>
      </div>

      <ul
        ref={ref}
        tabIndex={0}
        aria-label="Lugares imperdibles"
        className="-mx-6 flex snap-x snap-mandatory scroll-pl-6 gap-3 overflow-x-auto px-6 pb-3 min-[721px]:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sights.map((sight, i) => (
          <li
            key={sight.id}
            className="relative flex h-[340px] shrink-0 basis-[270px] snap-start items-end overflow-hidden rounded-[22px] bg-dark text-white min-[721px]:aspect-[4/5] min-[721px]:h-auto min-[721px]:basis-[min(380px,82%)] min-[721px]:rounded-[26px]"
          >
            <Image
              src={sight.imageUrl}
              alt=""
              fill
              sizes="(min-width: 721px) 380px, 270px"
              className="object-cover"
            />
            <span
              aria-hidden
              className="absolute inset-0 bg-linear-to-t from-[rgba(8,14,13,0.9)] from-0% via-[rgba(8,14,13,0.35)] via-45% to-[rgba(8,14,13,0)] to-70%"
            />
            <span className="font-display absolute top-3.5 left-3.5 flex size-[34px] items-center justify-center rounded-full bg-white font-extrabold text-ink min-[721px]:top-4 min-[721px]:left-4 min-[721px]:size-10">
              {i + 1}
            </span>
            <div className="relative flex min-w-0 flex-col gap-1 p-4 min-[721px]:gap-2 min-[721px]:p-6">
              <h3 className="font-display text-[23px] leading-none font-extrabold tracking-[-0.03em] min-[721px]:text-[30px]">
                {sight.name}
              </h3>
              <p className="text-sm leading-[1.45] text-white/90 min-[721px]:text-[15px] min-[721px]:leading-normal">
                {sight.description}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

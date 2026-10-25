"use client"

import {
  Fragment,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"

import { PageHero } from "@/components/shared/page-hero"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type HeroCarouselSlide = {
  id: string
  imageUrl: string
  /** Etiqueta de pestaña y título de la tarjeta "Siguiente". */
  label: string
  /** aria-label de la pestaña ("Ver <título>"). */
  ariaLabel: string
  /** Contenido del slide (nodos de servidor): sólo el activo se monta. */
  content: ReactNode
  /** Bloque a la derecha del contenido; si existe, reemplaza la tarjeta "Siguiente". */
  aside?: ReactNode
}

type HeroCarouselLabels = {
  /** aria-label del tablist. */
  tabs: string
  previous: string
  next: string
}

type HeroCarouselProps = {
  slides: HeroCarouselSlide[]
  /** aria-label de la sección. */
  label: string
  /** Tarjeta "Siguiente" (miniatura = imagen del siguiente slide). */
  showNext?: boolean
  /** Textos accesibles de pestañas y flechas (por defecto, "destino"). */
  labels?: HeroCarouselLabels
  intervalMs?: number
  /** Alto mínimo del hero: `min-h-[720px]` | `min-h-[600px]`. */
  className?: string
  /** Padding inferior del contenedor (p. ej. `pb-28` por la solapa del buscador). */
  contentClassName?: string
  /** Bloque estático sobre el contenido del slide (miga, h1, subtítulo). */
  children?: ReactNode
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"
const SWIPE_MIN_PX = 50

function subscribeReducedMotion(onChange: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches
const getReducedMotionServer = () => false

const DEFAULT_LABELS: HeroCarouselLabels = {
  tabs: "Elegir destino",
  previous: "Destino anterior",
  next: "Destino siguiente",
}

const roundControl =
  "size-12 rounded-full border-[1.5px] border-white/60 text-white hover:bg-white hover:text-ink"

export function HeroCarousel({
  slides,
  label,
  showNext = false,
  labels = DEFAULT_LABELS,
  intervalMs = 6500,
  className,
  contentClassName,
  children,
}: HeroCarouselProps) {
  const count = slides.length
  const panelId = useId()
  const touchX = useRef(0)
  const [index, setIndex] = useState(0)
  // null = el usuario no eligió: manda reduced motion (arranca en pausa si está activo).
  const [userPaused, setUserPaused] = useState<boolean | null>(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionServer,
  )

  const paused = userPaused ?? reducedMotion
  const running = !paused && !hovered && !focused && count > 1

  // Temporizador JS, reiniciado al cambiar de slide o al reanudar.
  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), intervalMs)
    return () => clearTimeout(id)
  }, [running, index, count, intervalMs])

  if (count === 0) return null

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)
  const multiple = count > 1
  const active = slides[index]
  const next = slides[(index + 1) % count]

  return (
    <PageHero
      aria-roledescription="carrusel"
      aria-label={label}
      className={className}
      contentClassName={cn("gap-9 pb-12", contentClassName)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false)
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current
        if (multiple && Math.abs(dx) > SWIPE_MIN_PX) go(dx < 0 ? 1 : -1)
      }}
      background={slides.map((slide, i) => (
        <div
          key={slide.id}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 ease-out",
            i === index ? "opacity-100" : "opacity-0",
          )}
          style={{
            transitionProperty: "opacity",
            transitionDuration: "1100ms",
          }}
        >
          <Image
            src={slide.imageUrl}
            alt=""
            fill
            sizes="100vw"
            preload={i === 0}
            className={cn(
              "object-cover ease-out",
              i === index ? "scale-100" : "scale-[1.08]",
            )}
            style={{
              transitionProperty: "transform",
              transitionDuration: "7000ms",
            }}
          />
        </div>
      ))}
    >
      {children}

      <div className="flex min-h-[340px] flex-wrap items-end justify-between gap-6">
        <div
          key={active.id}
          id={panelId}
          role={multiple ? "tabpanel" : undefined}
          aria-live={paused ? "polite" : "off"}
          className="flex min-w-0 max-w-[760px] flex-[1_1_560px] flex-col gap-[18px]"
        >
          {active.content}
        </div>

        {active.aside && <Fragment key={`${active.id}-aside`}>{active.aside}</Fragment>}

        {!active.aside && showNext && multiple && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={`Siguiente destino: ${next.label}`}
            className="hidden min-h-11 shrink-0 items-center gap-3.5 rounded-[20px] border border-white/28 bg-[rgba(8,14,13,.42)] p-2.5 pr-[18px] text-left text-white backdrop-blur-[10px] transition-colors hover:bg-[rgba(8,14,13,.62)] min-[861px]:flex"
          >
            <span
              aria-hidden="true"
              className="relative block h-[68px] w-[92px] shrink-0 overflow-hidden rounded-xl bg-sand"
            >
              <Image
                src={next.imageUrl}
                alt=""
                fill
                sizes="92px"
                className="object-cover"
              />
            </span>
            <span className="flex max-w-[220px] flex-col gap-0.5">
              <span className="text-xs font-bold tracking-[0.08em] text-white/75 uppercase">
                Siguiente
              </span>
              <span className="line-clamp-2 font-display text-[19px] font-bold">
                {next.label}
              </span>
            </span>
          </button>
        )}
      </div>

      {multiple && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
          <div
            role="tablist"
            aria-label={labels.tabs}
            className="flex min-w-0 flex-[1_1_100%] gap-2.5 sm:flex-1"
          >
            {slides.map((slide, i) => {
              const isActive = i === index
              return (
                <button
                  key={slide.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={slide.ariaLabel}
                  aria-controls={isActive ? panelId : undefined}
                  onClick={() => setIndex(i)}
                  className="flex min-h-11 min-w-0 flex-1 flex-col gap-2.5 pt-2 text-left text-white"
                >
                  <span
                    aria-hidden="true"
                    className="relative block h-[3px] w-full overflow-hidden rounded-[3px] bg-white/30"
                  >
                    {/* Completadas llenas; la activa se anima mientras corre y queda llena si está en pausa. */}
                    {(i < index || (isActive && paused)) && (
                      <span className="absolute inset-0 bg-white" />
                    )}
                    {isActive && running && (
                      <span
                        key={`${index}-${intervalMs}`}
                        className="absolute inset-y-0 left-0 bg-white"
                        style={{
                          animation: `wy-fill ${intervalMs}ms linear forwards`,
                        }}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-sm min-[720px]:block",
                      isActive ? "font-bold text-white" : "font-medium text-white/72",
                    )}
                  >
                    {slide.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="icon-lg"
              className={roundControl}
              aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}
              onClick={() => setUserPaused(!paused)}
            >
              {paused ? <Play className="fill-current" /> : <Pause className="fill-current" />}
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className={roundControl}
              aria-label={labels.previous}
              onClick={() => go(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className={roundControl}
              aria-label={labels.next}
              onClick={() => go(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </PageHero>
  )
}

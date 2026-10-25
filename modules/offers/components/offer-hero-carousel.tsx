"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, TouchEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type OfferSlide = {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  kindLabel: string;
  place: string; // región
  badge: string;
  badgeSub: string;
  wasLabel: string;
  nowLabel: string;
  note: string;
  validUntilLabel: string | null;
};

const INTERVAL_MS = 6500;
const SWIPE_PX = 50;

const controlClass =
  "size-12 rounded-full bg-black/45 text-white hover:bg-black/65 hover:text-white";

export function OfferHeroCarousel({ slides }: { slides: OfferSlide[] }) {
  const count = slides.length;
  const uid = useId();
  const [index, setIndex] = useState(0);
  // null = el usuario no eligió: manda reduced motion (arranca en pausa si está activo).
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const multiple = count > 1;
  const paused = userPaused ?? reducedMotion;
  const running = !paused && !hovered && !focused && multiple;

  // D7: temporizador JS (no animationend), reiniciado al cambiar de slide o al reanudar.
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(id);
  }, [running, index, count]);

  if (count === 0) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  const select = (next: number) => {
    setIndex(next);
    tabRefs.current[next]?.focus();
  };

  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const target =
      e.key === "ArrowRight"
        ? (index + 1) % count
        : e.key === "ArrowLeft"
          ? (index - 1 + count) % count
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? count - 1
              : null;
    if (target === null) return;
    e.preventDefault();
    select(target);
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || !multiple) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      go(dx < 0 ? 1 : -1);
    }
  };

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Ofertas destacadas"
      className="relative min-h-[560px] overflow-hidden rounded-card bg-dark text-white md:min-h-[640px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div aria-live={paused ? "polite" : "off"} className="absolute inset-0">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.slug}
              id={`${uid}-panel-${i}`}
              role={multiple ? "tabpanel" : undefined}
              aria-labelledby={multiple ? `${uid}-tab-${i}` : undefined}
              aria-hidden={!active}
              inert={!active}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              {slide.coverImageUrl && (
                <Image
                  src={slide.coverImageUrl}
                  alt=""
                  fill
                  // main: max-w 1240 con px-6 (48px de padding total)
                  sizes="(min-width: 1240px) 1192px, calc(100vw - 48px)"
                  loading={i === 0 ? "eager" : "lazy"}
                  className="object-cover"
                />
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-black/90 via-black/55 to-black/10"
              />
              {/* pb: fila de controles (48px) + aire */}
              <div className="relative flex h-full flex-col items-start justify-end gap-4 px-5 pt-16 pb-24 md:flex-row md:items-end md:justify-between md:gap-6 md:px-12 md:pb-28">
                <span className="flex size-24 shrink-0 -rotate-[8deg] flex-col items-center justify-center rounded-full bg-accent text-white shadow-raised md:order-2 md:size-[190px] md:bg-bg md:text-accent">
                  <span className="font-display text-[30px] leading-none font-extrabold tracking-[-0.03em] md:text-[64px] md:leading-[0.9] md:tracking-[-0.05em]">
                    {slide.badge}
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.06em] uppercase md:text-sm md:tracking-widest md:text-ink">
                    {slide.badgeSub}
                  </span>
                </span>
                <div className="flex min-w-0 max-w-3xl flex-col items-start gap-3 md:gap-4">
                  <p className="text-xs font-bold tracking-widest text-accent-soft uppercase md:text-sm">
                    {slide.kindLabel} · {slide.place}
                  </p>
                  <p className="font-display text-[clamp(42px,7vw,92px)] leading-[0.95] font-extrabold tracking-[-0.045em] text-balance">
                    {slide.title}
                  </p>
                  <p className="flex flex-wrap items-baseline gap-x-3">
                    <span className="sr-only">Con oferta</span>
                    <span className="font-display text-[32px] font-extrabold tracking-[-0.03em] md:text-[40px]">
                      {slide.nowLabel}
                    </span>
                    <span className="sr-only">Antes</span>
                    <s className="text-base text-white/75 md:text-xl">
                      {slide.wasLabel}
                    </s>
                  </p>
                  <p className="text-sm text-white/85">
                    {slide.note}
                    {slide.validUntilLabel &&
                      ` · Válido hasta ${slide.validUntilLabel}`}
                  </p>
                  <Button
                    variant="cta"
                    nativeButton={false}
                    render={<Link href={`/paquetes/${slide.slug}`} />}
                  >
                    Aprovechar oferta
                    <ArrowRight />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {multiple && (
        <div className="absolute inset-x-0 bottom-4 flex items-center gap-3 px-5 md:gap-5 md:px-12">
          <Button
            variant="ghost"
            size="icon-lg"
            className={controlClass}
            aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}
            onClick={() => setUserPaused(!paused)}
          >
            {paused ? <Play /> : <Pause />}
          </Button>
          <div
            role="tablist"
            aria-label="Elegir oferta"
            className="flex min-w-0 flex-1 gap-1.5 md:gap-2.5"
            onKeyDown={onTabKeyDown}
          >
            {slides.map((slide, i) => {
              const selected = i === index;
              const animated = selected && running && !reducedMotion;
              const filled = i < index || (selected && reducedMotion);
              return (
                <button
                  key={slide.slug}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  id={`${uid}-tab-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${uid}-panel-${i}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setIndex(i)}
                  className="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-2.5 rounded-sm text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-focus md:justify-start md:pt-2"
                >
                  <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-white/30">
                    <span
                      key={animated ? "run" : "idle"}
                      aria-hidden
                      className="absolute inset-y-0 left-0 bg-white"
                      style={
                        animated
                          ? {
                              animation: `wy-fill ${INTERVAL_MS}ms linear forwards`,
                            }
                          : { width: filled ? "100%" : "0%" }
                      }
                    />
                  </span>
                  <span
                    className={cn(
                      "truncate text-sm max-md:sr-only",
                      selected ? "font-bold text-white" : "text-white/70",
                    )}
                  >
                    {slide.badge} {slide.title}
                  </span>
                </button>
              );
            })}
          </div>
          {/* En móvil no caben junto a las barras (390 px); se navega con ellas o con swipe. */}
          <div className="hidden items-center gap-2 md:flex">
            <Button
              variant="ghost"
              size="icon-lg"
              className={controlClass}
              aria-label="Oferta anterior"
              onClick={() => go(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className={controlClass}
              aria-label="Oferta siguiente"
              onClick={() => go(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

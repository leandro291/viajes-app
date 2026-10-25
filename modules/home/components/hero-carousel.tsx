"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  slug: string;
  title: string;
  blurb: string;
  regionLabel: string;
  priceLabel: string;
  coverImageUrl: string;
};

const INTERVAL_MS = 6500;

const controlClass =
  "size-12 rounded-full bg-black/45 text-white hover:bg-black/65 hover:text-white";

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  // null = el usuario no eligió: manda reduced motion (arranca en pausa si está activo).
  const [userPaused, setUserPaused] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = useReducedMotion();

  const paused = userPaused ?? reducedMotion;
  const running = !paused && !hovered && !focused && count > 1;

  // D9: temporizador JS, reiniciado al cambiar de slide o al reanudar.
  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % count), INTERVAL_MS);
    return () => clearTimeout(id);
  }, [running, index, count]);

  if (count === 0) return null;

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Paquetes destacados"
      className="relative min-h-[560px] overflow-hidden rounded-card bg-dark text-white md:min-h-[640px]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
    >
      <div aria-live={paused ? "polite" : "off"} className="absolute inset-0">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.slug}
              aria-hidden={!active}
              inert={!active}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                active ? "opacity-100" : "opacity-0",
              )}
            >
              <Image
                src={slide.coverImageUrl}
                alt=""
                fill
                sizes="(min-width: 1240px) 1240px, 100vw"
                preload={i === 0}
                className="object-cover"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-linear-to-t from-black/80 via-black/35 to-black/10"
              />
              {/* pb: 60px de solapa del buscador + controles (48px) + aire */}
              <div className="relative flex h-full flex-col items-start justify-end gap-4 px-6 pt-16 pb-44 md:px-12 md:pb-48">
                <p className="text-sm font-bold tracking-wide uppercase">
                  {slide.regionLabel}
                </p>
                <p className="max-w-3xl font-display text-[clamp(36px,5vw,58px)] leading-[0.98] font-extrabold tracking-[-0.045em] text-balance">
                  {slide.title}
                </p>
                <p className="max-w-xl text-base text-white/90 md:text-lg">
                  {slide.blurb}
                </p>
                <Button
                  variant="cta"
                  nativeButton={false}
                  render={<Link href={`/paquetes/${slide.slug}`} />}
                >
                  Ver paquete · desde {slide.priceLabel}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          {running && !reducedMotion && (
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1 bg-white/20"
            >
              <div
                key={index}
                className="h-full bg-white"
                style={{ animation: `wy-fill ${INTERVAL_MS}ms linear forwards` }}
              />
            </div>
          )}

          <div className="absolute inset-x-0 bottom-20 flex items-center justify-between gap-3 px-6 md:bottom-24 md:px-12">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-lg"
                className={controlClass}
                aria-label={paused ? "Reanudar carrusel" : "Pausar carrusel"}
                onClick={() => setUserPaused(!paused)}
              >
                {paused ? <Play /> : <Pause />}
              </Button>
              <div className="flex items-center">
                {slides.map((slide, i) => (
                  <button
                    key={slide.slug}
                    type="button"
                    aria-label={`Ver ${slide.title}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => setIndex(i)}
                    className="flex h-11 min-w-11 items-center justify-center rounded-full"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-2.5 rounded-full bg-white transition-all",
                        i === index ? "w-6" : "w-2.5 opacity-55",
                      )}
                    />
                  </button>
                ))}
              </div>
            </div>
            {/* En móvil no caben junto a los puntos (390 px); se navega con los puntos. */}
            <div className="hidden items-center gap-2 md:flex">
              <Button
                variant="ghost"
                size="icon-lg"
                className={controlClass}
                aria-label="Anterior"
                onClick={() => go(-1)}
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                className={controlClass}
                aria-label="Siguiente"
                onClick={() => go(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

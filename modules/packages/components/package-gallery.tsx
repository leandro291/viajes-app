"use client";

import Image from "next/image";
import { useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { cn } from "@/lib/utils";

import type { PackageImageDto } from "../types/package";

const SWIPE_PX = 50;

// children = miga, título y resumen (Server Components) superpuestos sobre la foto.
export function PackageGallery({
  images,
  children,
}: {
  images: PackageImageDto[];
  children: ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const touchX = useRef(0);
  const count = images.length;
  const go = (n: number) => setIndex((i) => (i + n + count) % count);
  const active = images[index];

  return (
    <PageHero
      aria-roledescription="carrusel"
      aria-label="Galería del paquete"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (count > 1 && Math.abs(dx) > SWIPE_PX) go(dx < 0 ? 1 : -1);
      }}
      className="min-h-[660px]"
      contentClassName="gap-7 pb-10"
      background={images.map((img, i) => (
        <Image
          key={img.url}
          src={img.url}
          alt={img.alt ?? ""}
          fill
          priority={i === 0}
          sizes="100vw"
          aria-hidden={i !== index}
          className={cn(
            "object-cover transition-[opacity,transform] duration-[900ms]",
            i === index ? "scale-100 opacity-100" : "scale-[1.06] opacity-0",
          )}
        />
      ))}
    >
      <div className="flex max-w-[780px] flex-col gap-4">{children}</div>

      {count > 0 && (
        // pr: a partir de 1021 px el panel de reserva se monta 140 px sobre el hero (a la derecha);
        // se reserva su ancho para que contador y flechas no queden tapados.
        <div className="flex flex-wrap items-center justify-between gap-4 min-[1021px]:pr-[455px]">
          <div className="flex flex-col gap-3">
            {count > 1 && (
              <div className="flex flex-wrap gap-2.5">
                {images.map((img, i) => (
                  <button
                    key={img.url}
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-label={img.alt ?? `Foto ${i + 1}`}
                    aria-pressed={i === index}
                    className={cn(
                      "relative h-14 w-[76px] overflow-hidden rounded-xl border-2 bg-dark transition-[opacity,transform] duration-200 hover:-translate-y-0.5",
                      i === index ? "border-white" : "border-white/25 opacity-70",
                    )}
                  >
                    <Image src={img.url} alt="" fill sizes="76px" className="object-cover" />
                  </button>
                ))}
              </div>
            )}
            {active?.credit && (
              <p aria-live="polite" className="text-[13px] text-white/85">
                Foto: {active.credit}
              </p>
            )}
          </div>

          {count > 1 && (
            <div className="flex items-center gap-3">
              <span aria-live="polite" className="min-w-[52px] text-center text-[15px] font-bold">
                {index + 1} / {count}
              </span>
              {[
                { label: "Foto anterior", step: -1, Icon: ChevronLeft },
                { label: "Foto siguiente", step: 1, Icon: ChevronRight },
              ].map(({ label, step, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => go(step)}
                  aria-label={label}
                  className="inline-flex size-12 items-center justify-center rounded-full border-[1.5px] border-white/60 transition-colors hover:bg-white hover:text-ink"
                >
                  <Icon aria-hidden className="size-5" strokeWidth={2.4} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </PageHero>
  );
}

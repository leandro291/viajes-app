import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { SectionHeading } from "@/components/shared/section-heading";
import { cn } from "@/lib/utils";

export type DestinationTileData = {
  slug: string;
  name: string;
  heroImageUrl: string | null;
  priceLabel: string;
};

// 4 columnas: 1.º 2×2, 4.º ancho 2. <= 720 px: 2 columnas, el 1.º 2×1 (el 4.º sigue ancho 2).
const TILE_LAYOUT = [
  "col-span-2 row-span-2 max-[720px]:row-span-1",
  "",
  "",
  "col-span-2",
];
const NAME_SIZE = ["text-[44px]", "", "", "text-[30px]"];

export function DestinationBento({
  destinations,
}: {
  destinations: DestinationTileData[];
}) {
  if (destinations.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pt-24">
      <div className="mb-7">
        <SectionHeading eyebrow="Costa, sierra y selva" title="Elige tu destino" />
      </div>
      <div className="grid auto-rows-[230px] grid-cols-4 gap-4 max-[720px]:auto-rows-[190px] max-[720px]:grid-cols-2">
        {destinations.slice(0, 8).map((d, i) => (
          <Link
            key={d.slug}
            href={`/destinos/${encodeURIComponent(d.slug)}`}
            className={cn(
              "group relative block overflow-hidden rounded-[24px] bg-[#1B2A27] text-white",
              TILE_LAYOUT[i],
            )}
          >
            {d.heroImageUrl && (
              <Image
                src={d.heroImageUrl}
                alt=""
                fill
                sizes={
                  i === 0 || i === 3
                    ? "(min-width: 721px) 50vw, 100vw"
                    : "(min-width: 721px) 25vw, 50vw"
                }
                className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-105"
              />
            )}
            <span
              aria-hidden
              className="absolute inset-0 bg-[linear-gradient(to_top,rgba(8,14,13,.82)_0%,rgba(8,14,13,.25)_45%,rgba(8,14,13,0)_70%)]"
            />
            <span className="absolute right-5 bottom-[18px] left-5 flex items-end justify-between gap-3">
              <span className="flex min-w-0 flex-col gap-0.5">
                <span
                  className={cn(
                    "font-display text-[26px] leading-none font-extrabold tracking-[-0.03em]",
                    NAME_SIZE[i],
                  )}
                >
                  {d.name}
                </span>
                <span className="text-sm text-white/88">desde {d.priceLabel}</span>
              </span>
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-ink"
              >
                <ArrowUpRight className="size-[18px]" strokeWidth={2.4} />
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

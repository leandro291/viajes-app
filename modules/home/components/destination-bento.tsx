import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type DestinationTileData = {
  slug: string;
  name: string;
  heroImageUrl: string | null;
  priceLabel: string;
};

// Móvil: 2 columnas, el 1.º a ancho completo. lg: 4 columnas, 1.º 2×2 y 4.º 2 columnas.
const TILE_LAYOUT = [
  "col-span-2 lg:row-span-2",
  "",
  "",
  "lg:col-span-2",
];

export function DestinationBento({
  destinations,
}: {
  destinations: DestinationTileData[];
}) {
  if (destinations.length === 0) return null;

  return (
    <section className="flex flex-col gap-6 py-8">
      <h2 className="font-display text-3xl font-bold text-ink">Elige tu destino</h2>
      <div className="grid grid-cols-2 auto-rows-[160px] gap-3 lg:grid-cols-4 lg:auto-rows-[220px] lg:gap-4">
        {destinations.slice(0, 8).map((d, i) => (
          <Link
            key={d.slug}
            href={`/destinos/${d.slug}`}
            className={cn(
              "group relative isolate flex flex-col justify-end overflow-hidden rounded-card bg-sand p-4 text-white lg:p-5",
              TILE_LAYOUT[i]
            )}
          >
            {d.heroImageUrl && (
              <Image
                src={d.heroImageUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="-z-10 object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
            <span
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
            />
            <span className="font-display text-lg font-bold leading-tight lg:text-xl">
              {d.name}
            </span>
            <span className="text-sm">desde {d.priceLabel}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

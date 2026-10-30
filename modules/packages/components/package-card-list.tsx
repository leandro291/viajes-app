import { formatPen } from "@/lib/money";

import type { PackageCardDto } from "../types/package";
import { formatDuration } from "../utils/package-utils";
import { PackageCard } from "./package-card";

// auto-fill como el tablero: 1 columna a 390, 3 a 1280 sin saltos fijos de breakpoint.
export const LISTING_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))] gap-x-6 gap-y-8 max-md:gap-y-[18px]";

export function PackageCardList({
  packages,
  sizes = "(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw",
  className = LISTING_GRID_CLASS,
}: {
  packages: PackageCardDto[];
  sizes?: string;
  className?: string;
}) {
  return (
    <ul className={className}>
      {packages.map((p) => (
        <li key={p.id} className="min-w-0">
          <PackageCard
            slug={p.slug}
            title={p.title}
            coverImageUrl={p.coverImageUrl}
            regionLabel={p.destination.region}
            tag={p.categories[0]?.name ?? null}
            variant="grid"
            blurb={p.blurb}
            durationLabel={formatDuration(p.durationDays)}
            priceLabel={formatPen(p.priceCents)}
            sizes={sizes}
          />
        </li>
      ))}
    </ul>
  );
}

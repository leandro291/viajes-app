import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";

import type { PackageCardDto } from "../types/package";
import { formatDuration } from "../utils/package-utils";
import { PackageCard } from "./package-card";

// auto-fill como el tablero: 1 columna a 390, 3 a 1280 sin saltos fijos de breakpoint.
export const LISTING_GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(min(270px,100%),1fr))] gap-x-6 gap-y-8";

export function PackageGrid({ packages }: { packages: PackageCardDto[] }) {
  if (packages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3.5 rounded-[24px] bg-surface px-6 py-14 text-center">
        <h2 className="text-[26px] tracking-[-0.02em] text-ink">
          No hay paquetes con esos filtros
        </h2>
        <p className="text-ink-muted">
          Prueba con otra duración o tipo de experiencia.
        </p>
        <Button
          variant="cta"
          nativeButton={false}
          render={<Link href="/paquetes" />}
        >
          Quitar filtros
        </Button>
      </div>
    );
  }

  return (
    <>
      <h2 className="sr-only">Resultados</h2>
      <ul className={LISTING_GRID_CLASS}>
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
              sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"
            />
          </li>
        ))}
      </ul>
    </>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";

import type { PackageCardDto } from "../types/package";
import { formatDuration } from "../utils/package-utils";
import { PackageCard } from "./package-card";

export const LISTING_GRID_CLASS =
  "grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3";

export function PackageGrid({ packages }: { packages: PackageCardDto[] }) {
  if (packages.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card">
        <h2 className="font-display text-2xl font-extrabold text-ink">
          No hay paquetes con esos filtros
        </h2>
        <p className="mt-2 text-ink-muted">
          Prueba con otra duración o tipo de experiencia.
        </p>
        <Button
          variant="cta"
          className="mt-6"
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
              durationLabel={formatDuration(p.durationDays)}
              priceLabel={formatPen(p.priceCents)}
              sizes="(min-width: 1024px) 300px, (min-width: 768px) 45vw, 100vw"
            />
          </li>
        ))}
      </ul>
    </>
  );
}

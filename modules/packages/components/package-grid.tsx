import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { PackageCardDto } from "../types/package";
import { PackageCardList } from "./package-card-list";

export { LISTING_GRID_CLASS } from "./package-card-list";

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
      <PackageCardList packages={packages} />
    </>
  );
}

import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { OfferDto, OfferKind } from "../types/offer";
import { OfferCard } from "./offer-card";

export const OFFERS_GRID_CLASS =
  "grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4";

export function OfferGrid({
  offers,
  tipo,
}: {
  offers: OfferDto[];
  tipo?: OfferKind;
}) {
  if (offers.length === 0) {
    return (
      <div className="rounded-card bg-surface px-6 py-16 text-center shadow-card">
        <p className="font-display text-2xl font-extrabold text-ink">
          {tipo
            ? "No hay ofertas de este tipo por ahora."
            : "Por ahora no hay ofertas activas. Vuelve pronto."}
        </p>
        <Button
          variant="cta"
          className="mt-6"
          nativeButton={false}
          render={<Link href={tipo ? "/ofertas" : "/paquetes"} />}
        >
          {tipo ? "Ver todas" : "Ver paquetes"}
        </Button>
      </div>
    );
  }

  return (
    <ul className={OFFERS_GRID_CLASS}>
      {offers.map((offer) => (
        <li key={offer.id} className="min-w-0">
          <OfferCard offer={offer} />
        </li>
      ))}
    </ul>
  );
}

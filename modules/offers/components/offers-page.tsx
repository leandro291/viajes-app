import { Suspense } from "react";

import { getActiveOffers } from "../services/offer-service";
import { parseOfferParams } from "../utils/offer-params";
import { OfferGrid } from "./offer-grid";
import { OfferHero } from "./offer-hero";
import { OfferTabs } from "./offer-tabs";
import { OffersSkeleton } from "./offers-skeleton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="py-8 lg:py-12">
      <h1 className="sr-only">Ofertas de viaje en Perú</h1>
      <Suspense fallback={null}>
        <OfferHero />
      </Suspense>

      <div className="mt-10 mb-12 lg:mt-14 lg:mb-16">
        <p className="text-sm font-bold tracking-wide text-accent uppercase">Ofertas</p>
        <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink lg:text-4xl">
          Viaja más, paga menos
        </h2>
        <Suspense fallback={<OffersSkeleton />}>
          <OffersCatalog searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function OffersCatalog({ searchParams }: { searchParams: SearchParams }) {
  const { tipo } = parseOfferParams(await searchParams);
  const all = await getActiveOffers();
  const offers = tipo ? all.filter((o) => o.kind === tipo) : all;

  return (
    <>
      <div className="mt-6 mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <OfferTabs tipo={tipo} />
        <p aria-live="polite" className="text-sm text-ink-muted">
          {offers.length === 1 ? "1 oferta activa" : `${offers.length} ofertas activas`}
        </p>
      </div>
      <OfferGrid offers={offers} tipo={tipo} />
    </>
  );
}

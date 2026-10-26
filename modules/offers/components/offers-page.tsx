import { Suspense } from "react";

import { SectionHeading } from "@/components/shared/section-heading";

import { getOfferHrefs } from "../services/offer-link-service";
import { getActiveOffers } from "../services/offer-service";
import { parseOfferParams } from "../utils/offer-params";
import { OfferGrid } from "./offer-grid";
import { OfferHero } from "./offer-hero";
import { OfferTabs } from "./offer-tabs";
import { OffersSkeleton } from "./offers-skeleton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const HEADING = { eyebrow: "Ofertas", title: "Viaja más, paga menos" };

export function OffersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <OfferHero />
      <section className="mx-auto w-full max-w-[1240px] px-6 pt-14">
        <Suspense
          fallback={
            <div className="flex flex-col gap-7">
              <SectionHeading {...HEADING} />
              <OffersSkeleton />
            </div>
          }
        >
          <OffersCatalog searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function OffersCatalog({ searchParams }: { searchParams: SearchParams }) {
  const { tipo } = parseOfferParams(await searchParams);
  const all = await getActiveOffers();
  const offers = tipo ? all.filter((o) => o.kind === tipo) : all;
  const hrefs = await getOfferHrefs(offers);

  return (
    <div className="flex flex-col gap-7">
      <SectionHeading {...HEADING}>
        <p aria-live="polite" className="font-display text-xl font-bold">
          {offers.length === 1 ? "1 oferta" : `${offers.length} ofertas`}
        </p>
      </SectionHeading>
      <OfferTabs tipo={tipo} />
      <OfferGrid offers={offers} hrefs={hrefs} tipo={tipo} />
    </div>
  );
}

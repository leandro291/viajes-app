import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PhotoCredits } from "@/components/shared/photo-credits";
import { SectionHeading } from "@/components/shared/section-heading";
import { buildMetadata } from "@/lib/seo/metadata";
import { buildListingHref, PackageCardList } from "@/modules/packages";

import { getDestinationPage } from "../services/destination-page-service";
import { mapPins } from "../utils/destination-page";
import { BeforeYouGo } from "./before-you-go";
import { ClimateChart } from "./climate-chart";
import { DestinationHero } from "./destination-hero";
import { DestinationMap } from "./destination-map";
import { DestinationSkeleton } from "./destination-skeleton";
import { SightsRail } from "./sights-rail";

const MAX_PACKAGES = 6;

type Params = Promise<{ slug: string }>;

export function DestinationPage({ params }: { params: Params }) {
  // params es dato de runtime: se lee dentro de la frontera (D6).
  return (
    <Suspense fallback={<DestinationSkeleton />}>
      <DestinationContent params={params} />
    </Suspense>
  );
}

async function loadDestination(params: Params) {
  const { slug } = await params;
  return getDestinationPage(slug); // valida el slug antes de tocar la BD
}

export async function generateDestinationMetadata(params: Params): Promise<Metadata> {
  const page = await loadDestination(params);
  if (!page) return { title: "Destino no encontrado", robots: { index: false } };
  const { slug, name, tagline, description, heroImageUrl } = page.destination;
  return buildMetadata({
    title: name,
    description: tagline || description,
    path: `/destinos/${slug}`,
    image: heroImageUrl,
    imageAlt: name,
  });
}

async function DestinationContent({ params }: { params: Params }) {
  const page = await loadDestination(params);
  if (!page) notFound();

  const { destination, packages, minPriceCents } = page;
  const { slug, name, sights, climate } = destination;
  const pins = mapPins(
    sights.map((s) => ({
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      card: { eyebrow: "Lugar imperdible", title: s.name, imageUrl: s.imageUrl },
    })),
  );

  return (
    <>
      <DestinationHero destination={destination} minPriceCents={minPriceCents} />

      {sights.length > 0 && (
        <section className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-6 pt-24">
          <SightsRail sights={sights} />
          {pins.length > 0 && <DestinationMap pins={pins} />}
        </section>
      )}

      <section className="mx-auto w-full max-w-[1240px] px-6 pt-24">
        <div className="mb-7">
          <SectionHeading eyebrow="Reserva tu viaje" title={`Paquetes en ${name}`}>
            <Link
              href={buildListingHref({}, { destino: slug })}
              className="inline-flex min-h-11 items-center px-3 font-bold text-primary hover:text-accent"
            >
              Ver todos →
            </Link>
          </SectionHeading>
        </div>
        <PackageCardList
          packages={packages.slice(0, MAX_PACKAGES)}
          className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6"
        />
      </section>

      {climate.length === 12 && (
        <ClimateChart
          name={name}
          months={climate}
          bestSeasonText={destination.bestSeasonText}
        />
      )}

      <BeforeYouGo
        altitudeM={destination.altitudeM}
        howToGetText={destination.howToGetText}
        tipsText={destination.tipsText}
        imageUrl={destination.heroImageUrl}
        faqs={destination.faqs}
      />

      <PhotoCredits />
    </>
  );
}

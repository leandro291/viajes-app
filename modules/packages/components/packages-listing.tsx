import Link from "next/link";
import { Suspense } from "react";
import { X } from "lucide-react";

import { HeroCarousel, type HeroCarouselSlide } from "@/components/shared/hero-carousel";
import { PageHero } from "@/components/shared/page-hero";
import { PhotoCredits } from "@/components/shared/photo-credits";
import { formatPen } from "@/lib/money";
import { getDestinations } from "@/modules/destinations";

import {
  getCategories,
  getFeaturedPackages,
  getPackages,
} from "../services/package-service";
import {
  buildListingHref,
  parseListingParams,
  resolveFilters,
} from "../utils/package-filters";
import { HeroFeatureLink, HeroIntro } from "./listing-hero";
import { ListingSkeleton } from "./listing-skeleton";
import { PackageFilters } from "./package-filters";
import { PackageGrid } from "./package-grid";
import { PackageSort } from "./package-sort";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function PackagesListing({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PackagesHero />
      <section className="mx-auto w-full max-w-[1240px] px-6 pt-10 pb-24">
        <Suspense fallback={<ListingSkeleton />}>
          <ListingContent searchParams={searchParams} />
        </Suspense>
      </section>
      <PhotoCredits />
    </>
  );
}

const HERO_SLIDES = 5;
const HERO_CLASS = "min-h-[520px] md:min-h-[600px]";

async function PackagesHero() {
  const featured = await getFeaturedPackages(12);

  const slides: HeroCarouselSlide[] = featured
    .flatMap((p) => {
      const { coverImageUrl } = p;
      return coverImageUrl ? [{ p, coverImageUrl }] : [];
    })
    .slice(0, HERO_SLIDES)
    .map(({ p, coverImageUrl }) => ({
      id: p.id,
      imageUrl: coverImageUrl,
      label: p.title,
      ariaLabel: `Ver ${p.title}`,
      content: (
        <HeroFeatureLink
          href={`/paquetes/${p.slug}`}
          imageUrl={coverImageUrl}
          eyebrow={`Destacado · ${p.destination.region}`}
          title={p.title}
          price={formatPen(p.priceCents)}
        />
      ),
    }));

  // Sin destacados con portada: hero estático (miga, h1, subtítulo), sin carrusel.
  if (slides.length === 0) {
    return (
      <PageHero className={HERO_CLASS} contentClassName="pb-14">
        <HeroIntro
          crumb="Paquetes"
          title="Paquetes por todo el Perú"
          subtitle="Traslados, entradas y guía local incluidos. Compara y reserva en minutos."
        />
      </PageHero>
    );
  }

  return (
    <HeroCarousel
      slides={slides}
      label="Paquetes destacados"
      intervalMs={6000}
      className={HERO_CLASS}
      // gap 36 (carrusel) - 12 = 24 entre subtítulo y tarjeta, como el tablero (16 + 8).
      // `[&>div]:min-h-0` anula el alto mínimo de 340 px del bloque de slide (pensado para el Inicio).
      contentClassName="pb-14 [&>div]:min-h-0"
    >
      <HeroIntro
        crumb="Paquetes"
        title="Paquetes por todo el Perú"
        subtitle="Traslados, entradas y guía local incluidos. Compara y reserva en minutos."
        className="-mb-3"
      />
    </HeroCarousel>
  );
}

async function ListingContent({ searchParams }: { searchParams: SearchParams }) {
  const parsed = parseListingParams(await searchParams);
  const [categories, destinations] = await Promise.all([
    getCategories(),
    getDestinations(),
  ]);
  const filters = resolveFilters(parsed, categories, destinations);
  const packages = await getPackages(filters);
  const destination = filters.destino
    ? destinations.find((d) => d.slug === filters.destino)
    : undefined;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-9">
      <PackageFilters filters={filters} categories={categories} />
      <div className="flex min-w-0 flex-col gap-6 lg:flex-[3_1_560px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <p
              aria-live="polite"
              className="font-display text-[22px] font-bold tracking-[-0.015em]"
            >
              {packages.length === 1
                ? "1 paquete disponible"
                : `${packages.length} paquetes disponibles`}
            </p>
            {destination && (
              <span className="inline-flex max-w-full items-center rounded-full border border-border bg-surface pl-4 text-sm font-bold text-ink">
                <span className="truncate">Destino: {destination.name}</span>
                <Link
                  href={buildListingHref(filters, { destino: undefined })}
                  scroll={false}
                  aria-label="Quitar destino"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full"
                >
                  <X aria-hidden className="size-4" />
                </Link>
              </span>
            )}
          </div>
          <PackageSort filters={filters} />
        </div>
        <PackageGrid packages={packages} />
      </div>
    </div>
  );
}

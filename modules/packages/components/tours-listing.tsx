import Link from "next/link";
import { Suspense } from "react";

import { HeroCarousel, type HeroCarouselSlide } from "@/components/shared/hero-carousel";
import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";

import { getTours } from "../services/tour-service";
import {
  citiesFromTours,
  limaToday,
  parseTourParams,
  resolveTourFilters,
} from "../utils/tour-filters";
import { formatTourCount, formatTourDuration, formatTourStart } from "../utils/tour-view";
import { HeroFeatureLink, HeroIntro } from "./listing-hero";
import { TourCard, TOURS_GRID_CLASS } from "./tour-card";
import { TourFilterBar } from "./tour-filter-bar";
import { ToursSkeleton } from "./tours-skeleton";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function ToursListing({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <ToursHero />
      <section className="mx-auto w-full max-w-[1240px] px-4 pb-12 md:px-6 md:pt-10">
        <Suspense fallback={<ToursSkeleton />}>
          <ToursContent searchParams={searchParams} />
        </Suspense>
      </section>
      <section className="mx-auto w-full max-w-[1240px] px-6 pb-24">
        <div className="flex flex-col items-center gap-3.5 rounded-[24px] bg-sand px-6 py-12 text-center">
          <h2 className="text-[26px] tracking-[-0.02em] text-ink">
            ¿Varios días en la misma ciudad?
          </h2>
          <Button variant="cta" nativeButton={false} render={<Link href="/paquetes" />}>
            Ver paquetes
          </Button>
        </div>
      </section>
    </>
  );
}

const HERO_SLIDES = 4;
const HERO_CLASS = "min-h-[540px] md:min-h-[600px]";
const HERO_SUBTITLE =
  "Sales por la mañana y vuelves para cenar. Recojo en tu hotel y guía local incluidos.";

// D10: un solo h1 con dos textos alternados por CSS (el oculto sale del árbol de accesibilidad).
const HERO_TITLE = (
  <>
    <span className="max-md:hidden">Tours de un día</span>
    <span className="md:hidden">Sales temprano, vuelves con historias</span>
  </>
);

async function ToursHero() {
  const tours = await getTours({});

  const slides: HeroCarouselSlide[] = tours
    .flatMap((t) => {
      const { coverImageUrl } = t;
      return coverImageUrl ? [{ t, coverImageUrl }] : [];
    })
    .slice(0, HERO_SLIDES)
    .map(({ t, coverImageUrl }) => ({
      id: t.id,
      imageUrl: coverImageUrl,
      label: t.title,
      ariaLabel: `Ver ${t.title}`,
      content: (
        <HeroFeatureLink
          href={`/paquetes/${t.slug}`}
          imageUrl={coverImageUrl}
          eyebrow={[
            t.destination.name,
            formatTourDuration(t),
            t.startTime && formatTourStart(t.startTime).toLowerCase(),
          ]
            .filter(Boolean)
            .join(" · ")}
          title={t.title}
          price={formatPen(t.priceCents)}
        />
      ),
    }));

  // Sin tours con portada: hero estático (miga, h1, subtítulo), sin carrusel.
  if (slides.length === 0) {
    return (
      <PageHero className={HERO_CLASS} contentClassName="pb-14">
        <HeroIntro crumb="Tours de un día" title={HERO_TITLE} subtitle={HERO_SUBTITLE} />
      </PageHero>
    );
  }

  return (
    <HeroCarousel
      slides={slides}
      label="Tours destacados"
      labels={{
        tabs: "Elegir tour",
        previous: "Tour anterior",
        next: "Tour siguiente",
      }}
      intervalMs={6000}
      className={HERO_CLASS}
      // Mismo ajuste que /paquetes: anula el alto mínimo del bloque de slide.
      contentClassName="pb-14 [&>div]:min-h-0"
    >
      <HeroIntro
        crumb="Tours de un día"
        title={HERO_TITLE}
        subtitle={HERO_SUBTITLE}
        className="-mb-3"
      />
    </HeroCarousel>
  );
}

async function ToursContent({ searchParams }: { searchParams: SearchParams }) {
  const parsed = parseTourParams(await searchParams);
  // getTours({}) está cacheado y compartido con el hero (D3).
  const cities = citiesFromTours(await getTours({}));
  const today = limaToday(new Date());
  const filters = resolveTourFilters(parsed, cities, today);
  const tours = await getTours(filters);

  return (
    <div className="flex flex-col md:gap-6">
      <TourFilterBar filters={filters} cities={cities} today={today} />
      <p
        aria-live="polite"
        className="font-display text-[22px] font-bold tracking-[-0.015em] max-md:pt-5 max-md:pb-3.5 max-md:font-sans max-md:text-[15px] max-md:tracking-normal max-md:text-ink-muted"
      >
        {formatTourCount(tours.length)}
      </p>
      {tours.length === 0 ? (
        <div className="flex flex-col items-center gap-3.5 rounded-[24px] bg-surface px-6 py-14 text-center">
          <h2 className="text-[26px] tracking-[-0.02em] text-ink">
            No hay tours con esos filtros
          </h2>
          <p className="text-ink-muted">Prueba con otra ciudad o fecha.</p>
          <Button variant="cta" nativeButton={false} render={<Link href="/tours" />}>
            Quitar filtros
          </Button>
        </div>
      ) : (
        <>
          <h2 className="sr-only">Resultados</h2>
          <ul className={TOURS_GRID_CLASS}>
            {tours.map((t) => (
              <li key={t.id} className="min-w-0">
                <TourCard tour={t} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

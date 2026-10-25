import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, X } from "lucide-react";

import { HeroCarousel, type HeroCarouselSlide } from "@/components/shared/hero-carousel";
import { PageHero } from "@/components/shared/page-hero";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
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
    </>
  );
}

const HERO_SLIDES = 5;
const HERO_CLASS = "min-h-[600px]";

// Miga + h1 + subtítulo (únicos del hero). `className` lo usa el carrusel para el solape.
function HeroIntro({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <nav aria-label="Migas de pan" className="text-sm text-white/85">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/"
              className="-mx-1.5 -my-3 inline-flex items-center px-1.5 py-3 hover:text-accent-soft"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-bold text-white">
            Paquetes
          </li>
        </ol>
      </nav>
      <h1 className="text-balance">Paquetes por todo el Perú</h1>
      <p className="max-w-[560px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90">
        Traslados, entradas y guía local incluidos. Compara y reserva en minutos.
      </p>
    </div>
  );
}

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
        <Link
          href={`/paquetes/${p.slug}`}
          className="mt-2 flex min-h-11 items-center gap-3.5 self-start rounded-[20px] border border-white/28 bg-[rgba(8,14,13,.42)] py-2.5 pr-5 pl-2.5 text-white backdrop-blur-[10px] transition-colors hover:bg-[rgba(8,14,13,.62)] motion-safe:animate-[wy-up_.8s_cubic-bezier(.2,.7,.2,1)_both]"
        >
          <span
            aria-hidden="true"
            className="relative block h-14 w-[72px] shrink-0 overflow-hidden rounded-xl bg-sand"
          >
            <Image src={coverImageUrl} alt="" fill sizes="72px" className="object-cover" />
          </span>
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-bold tracking-[0.08em] text-white/80 uppercase">
              Destacado · {p.destination.region}
            </span>
            <span className="font-display text-[19px] font-bold">
              {p.title} · desde {formatPen(p.priceCents)}
            </span>
          </span>
          <ArrowRight aria-hidden className="size-[18px] shrink-0" strokeWidth={2.4} />
        </Link>
      ),
    }));

  // Sin destacados con portada: hero estático (miga, h1, subtítulo), sin carrusel.
  if (slides.length === 0) {
    return (
      <PageHero className={HERO_CLASS} contentClassName="pb-14">
        <HeroIntro />
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
      <HeroIntro className="-mb-3" />
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

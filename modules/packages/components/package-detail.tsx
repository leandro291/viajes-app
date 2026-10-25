import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { formatPen } from "@/lib/money";

import { getDepartures, getPackageBySlug } from "../services/package-detail-service";
import type { PackageImageDto } from "../types/package";
import {
  buildCheckoutHref,
  formatDepartureChip,
  isValidSlug,
  parseDetailParams,
  resolveBooking,
} from "../utils/package-detail";
import { BookingPanel } from "./booking-panel";
import { DetailSkeleton } from "./detail-skeleton";
import { MobileBookingBar } from "./mobile-booking-bar";
import { PackageFacts } from "./package-facts";
import { PackageGallery } from "./package-gallery";
import { CancellationNotice, PackageInclusions } from "./package-inclusions";
import { PackageItinerary } from "./package-itinerary";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function PackageDetail({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  // params y searchParams son datos de runtime: se leen dentro de la frontera (D5).
  return (
    <div className="py-6 lg:py-10">
      <Suspense fallback={<DetailSkeleton />}>
        <DetailContent params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function loadPackage(params: Params) {
  const { slug } = await params;
  return isValidSlug(slug) ? getPackageBySlug(slug) : null;
}

export async function generateDetailMetadata(params: Params): Promise<Metadata> {
  const pkg = await loadPackage(params);
  if (!pkg) return { title: "Paquete no encontrado" };
  return {
    title: pkg.title,
    description: pkg.blurb,
    openGraph: pkg.coverImageUrl ? { images: [pkg.coverImageUrl] } : undefined,
  };
}

async function DetailContent({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const pkg = await loadPackage(params);
  if (!pkg) notFound();

  const [departures, raw] = await Promise.all([getDepartures(pkg.id), searchParams]);
  const detailParams = parseDetailParams(raw);
  const { selected, travelers } = resolveBooking(pkg.maxGroupSize, departures, detailParams);

  // Sin galería cae a la portada (sin crédito, D6).
  const images: PackageImageDto[] =
    pkg.images.length > 0
      ? pkg.images
      : pkg.coverImageUrl
        ? [{ url: pkg.coverImageUrl, alt: pkg.title, credit: null }]
        : [];

  const chip = selected && formatDepartureChip(selected.startsAt);
  const summary = chip
    ? `${travelers === 1 ? "1 viajero" : `${travelers} viajeros`} · ${chip.dow} ${chip.day} ${chip.month}`
    : "Sin salidas con cupo";

  return (
    <>
      <nav aria-label="Migas de pan" className="mb-4 text-sm text-ink-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-ink">
              Inicio
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li>
            <Link href="/paquetes" className="hover:text-ink">
              Paquetes
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li aria-current="page" className="font-bold text-ink">
            {pkg.title}
          </li>
        </ol>
      </nav>

      <PackageGallery images={images}>
        <h1 className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-balance lg:text-7xl">
          {pkg.title}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-white/90">{pkg.blurb}</p>
      </PackageGallery>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
        <div className="lg:col-start-1">
          <PackageFacts pkg={pkg} />
        </div>

        <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <BookingPanel pkg={pkg} departures={departures} params={detailParams} />
        </div>

        <div className="flex min-w-0 flex-col gap-14 lg:col-start-1">
          {pkg.description && (
            <section className="flex flex-col gap-4">
              <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-accent">
                El viaje
              </span>
              <h2 className="font-display text-3xl font-extrabold tracking-tight lg:text-4xl">
                Qué vas a vivir
              </h2>
              <p className="text-lg leading-relaxed text-ink-muted">{pkg.description}</p>
            </section>
          )}

          {pkg.itinerary.length > 0 && (
            <section className="flex flex-col gap-5">
              <h2 className="font-display text-3xl font-extrabold tracking-tight lg:text-4xl">
                Itinerario día a día
              </h2>
              <PackageItinerary days={pkg.itinerary} />
            </section>
          )}

          <PackageInclusions
            included={pkg.inclusions.included}
            excluded={pkg.inclusions.excluded}
          />
          <CancellationNotice />
        </div>
      </div>

      <MobileBookingBar
        total={formatPen(pkg.priceCents * travelers)}
        summary={summary}
        href={selected ? buildCheckoutHref(selected.id, travelers) : null}
      />
    </>
  );
}

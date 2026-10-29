import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

import { SectionHeading } from "@/components/shared/section-heading";
import { formatPen } from "@/lib/money";
import { buildMetadata } from "@/lib/seo/metadata";

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

// Enlaces de la miga: objetivo >= 44 px (-my compensa para no agrandar la fila visual).
const crumbLink =
  "-my-3 inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-accent-soft";

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
    <Suspense fallback={<DetailSkeleton />}>
      <DetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function loadPackage(params: Params) {
  const { slug } = await params;
  return isValidSlug(slug) ? getPackageBySlug(slug) : null;
}

export async function generateDetailMetadata(params: Params): Promise<Metadata> {
  const pkg = await loadPackage(params);
  if (!pkg) return { title: "Paquete no encontrado", robots: { index: false } };
  return buildMetadata({
    title: pkg.title,
    description: pkg.blurb,
    path: `/paquetes/${pkg.slug}`,
    image: pkg.coverImageUrl,
    imageAlt: pkg.title,
  });
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
      <PackageGallery images={images}>
        <nav aria-label="Migas de pan" className="text-sm text-white/85">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className={crumbLink}>
                Inicio
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link
                href={`/destinos/${encodeURIComponent(pkg.destination.slug)}`}
                className={crumbLink}
              >
                {pkg.destination.name}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="font-bold text-white">
              {pkg.title}
            </li>
          </ol>
        </nav>
        <h1 className="text-[clamp(46px,7.5vw,96px)] leading-[0.92] text-balance">{pkg.title}</h1>
        <p className="max-w-[560px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90">
          {pkg.blurb}
        </p>
      </PackageGallery>

      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] gap-14 px-6 pt-12 pb-[104px] min-[1021px]:grid-cols-[minmax(0,1.85fr)_minmax(340px,1fr)] min-[1021px]:items-start min-[1021px]:gap-y-16">
        <div className="min-[1021px]:col-start-1">
          <PackageFacts pkg={pkg} />
        </div>

        <div className="relative z-20 w-full max-w-[410px] min-w-0 min-[1021px]:sticky min-[1021px]:top-6 min-[1021px]:col-start-2 min-[1021px]:row-span-2 min-[1021px]:row-start-1 min-[1021px]:-mt-[140px]">
          <BookingPanel pkg={pkg} departures={departures} params={detailParams} />
        </div>

        <div className="flex min-w-0 flex-col gap-16 min-[1021px]:col-start-1">
          {pkg.description && (
            <section className="flex flex-col gap-4">
              <div className="[&_h2]:text-[clamp(30px,3.6vw,42px)]">
                <SectionHeading eyebrow="El viaje" title="Qué vas a vivir" />
              </div>
              <p className="text-[19px] leading-[1.65] text-[#3D4A47]">{pkg.description}</p>
            </section>
          )}

          {pkg.itinerary.length > 0 && (
            <section className="flex flex-col gap-5">
              <h2 className="text-[clamp(30px,3.6vw,42px)]">Itinerario día a día</h2>
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

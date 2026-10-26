import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PageHero } from "@/components/shared/page-hero";
import { Button } from "@/components/ui/button";
import { formatPen } from "@/lib/money";
import { cn } from "@/lib/utils";
import { buildListingHref } from "@/modules/packages";

import type { DestinationDetailDto } from "../types/destination";
import { formatAltitude } from "../utils/destination-page";

// Enlaces de la miga: objetivo >= 44 px (-my compensa para no agrandar la fila visual).
const crumbLink =
  "-my-3 inline-flex min-h-11 min-w-11 items-center justify-center transition-colors hover:text-accent-soft";

export function DestinationHero({
  destination,
  minPriceCents,
}: {
  destination: DestinationDetailDto;
  minPriceCents: number;
}) {
  const {
    slug,
    name,
    tagline,
    description,
    altitudeM,
    bestSeasonText,
    fromLimaText,
    heroImageUrl,
    climate,
  } = destination;

  // Cada dato opcional se oculta si es nulo; "Paquetes" siempre.
  const facts: { label: string; value: string; className?: string }[] = [
    ...(altitudeM !== null ? [{ label: "Altitud", value: formatAltitude(altitudeM) }] : []),
    ...(bestSeasonText ? [{ label: "Mejor época", value: bestSeasonText }] : []),
    ...(fromLimaText
      ? [{ label: "Desde Lima", value: fromLimaText, className: "max-sm:hidden" }]
      : []),
    { label: "Paquetes", value: `Desde ${formatPen(minPriceCents)}` },
  ];

  const text = description ?? tagline;

  return (
    <PageHero
      className="min-h-[600px] sm:min-h-[640px]"
      contentClassName="gap-8 pb-12"
      background={
        heroImageUrl && (
          <Image
            src={heroImageUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_40%]"
          />
        )
      }
    >
      <div className="flex max-w-[760px] flex-col gap-[18px]">
        <nav aria-label="Migas de pan" className="text-sm text-white/85">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className={crumbLink}>
                Inicio
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>Destinos</li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="font-bold text-white">
              {name}
            </li>
          </ol>
        </nav>
        <h1 className="text-[clamp(64px,11vw,148px)] leading-[0.85] tracking-[-0.055em] text-balance">
          {name}
        </h1>
        {text && (
          <p className="max-w-[540px] text-[clamp(17px,1.6vw,20px)] leading-normal text-white/90">
            {text}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="cta"
            nativeButton={false}
            className="h-auto gap-2.5 px-[26px] py-4 text-base"
            render={<Link href={buildListingHref({}, { destino: slug })} />}
          >
            Ver paquetes en {name}
            <ArrowRight aria-hidden className="size-[18px]" strokeWidth={2.4} />
          </Button>
          {climate.length === 12 && (
            <Link
              href="#cuando"
              className="inline-flex min-h-11 items-center rounded-full border-[1.5px] border-white/70 px-6 py-[15px] text-base font-bold text-white transition-colors hover:bg-white/16"
            >
              Cuándo viajar
            </Link>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100px,100%),1fr))] gap-px overflow-hidden rounded-[16px] border border-white/18 bg-white/18 sm:grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] sm:rounded-[20px]">
        {facts.map(({ label, value, className }) => (
          <div
            key={label}
            className={cn(
              "bg-[rgba(8,14,13,.55)] px-3 py-2.5 backdrop-blur-[10px] sm:px-5 sm:py-[18px]",
              className,
            )}
          >
            <dt className="text-[11px] font-bold tracking-[0.06em] text-white/75 uppercase sm:text-xs sm:tracking-[0.08em]">
              {label}
            </dt>
            <dd className="mt-1 font-display text-base font-bold sm:text-xl">{value}</dd>
          </div>
        ))}
      </dl>
    </PageHero>
  );
}

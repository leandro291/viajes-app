import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/modules/packages";

import type { OfferDto } from "../types/offer";
import { describeOffer } from "../utils/offer-view";

export function OfferCard({ offer }: { offer: OfferDto }) {
  const { package: pkg } = offer;
  const labels = describeOffer(offer);

  return (
    <Link
      href={`/paquetes/${pkg.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-card bg-surface shadow-card transition-shadow hover:shadow-raised"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {pkg.coverImageUrl && (
          <Image
            src={pkg.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 290px, (min-width: 1024px) 30vw, 50vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <span className="absolute top-2 right-2 flex size-12 -rotate-[8deg] items-center justify-center rounded-full bg-accent font-display text-base font-extrabold tracking-tight text-white md:top-3 md:right-3 md:size-16 md:text-xl">
          {labels.badge}
        </span>
        <Badge className="absolute bottom-2 left-2 bg-surface text-ink md:bottom-3 md:left-3">
          {labels.kindLabel}
        </Badge>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 md:p-4">
        <p className="text-[13px] font-bold text-primary md:text-sm">
          {pkg.region} · {formatDuration(pkg.durationDays)}
        </p>
        <h3 className="line-clamp-2 min-h-[2lh] font-display text-base leading-snug font-bold text-ink md:text-lg">
          {pkg.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-sm text-ink-muted">
              <span className="sr-only">Antes </span>
              <s>{labels.wasLabel}</s>
            </p>
            <p className="font-display text-xl font-extrabold tracking-tight text-accent md:text-2xl">
              <span className="sr-only">Con oferta </span>
              {labels.nowLabel}
            </p>
            <p className="text-[13px] text-ink-muted">
              {labels.note}
              {labels.validUntilLabel && ` · hasta ${labels.validUntilLabel}`}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="hidden size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong transition-colors group-hover:border-ink group-hover:bg-ink group-hover:text-white md:flex"
          >
            <ArrowRight className="size-[18px]" />
          </span>
        </div>
      </div>
    </Link>
  );
}

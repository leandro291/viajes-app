import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { formatDuration } from "@/modules/packages";

import type { OfferDto } from "../types/offer";
import { describeOffer } from "../utils/offer-view";

export function OfferCard({ offer }: { offer: OfferDto }) {
  const { package: pkg } = offer;
  const labels = describeOffer(offer);

  return (
    <Link
      href={`/paquetes/${pkg.slug}`}
      className="group flex h-full flex-col gap-2.5 text-ink sm:gap-3.5"
    >
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-sand sm:aspect-[4/3.4] sm:rounded-[22px]">
        {pkg.coverImageUrl && (
          <Image
            src={pkg.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1280px) 290px, (min-width: 640px) 30vw, 50vw"
            className="object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-[cubic-bezier(.2,.7,.2,1)] motion-safe:group-hover:scale-[1.06]"
          />
        )}
        <span className="absolute top-2 right-2 flex size-12 -rotate-[8deg] items-center justify-center rounded-full bg-accent font-display text-base font-extrabold tracking-[-0.02em] text-white sm:top-3 sm:right-3 sm:size-16 sm:text-xl">
          {labels.badge}
        </span>
        <span className="absolute bottom-2 left-2 rounded-full bg-white px-2.5 py-[5px] text-xs font-bold text-ink sm:bottom-3 sm:left-3 sm:px-3 sm:py-[7px] sm:text-[13px]">
          {labels.kindLabel}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1 sm:gap-2">
        <p className="text-xs font-bold text-primary sm:text-sm">
          {pkg.region} · {formatDuration(pkg.durationDays)}
        </p>
        <h3 className="line-clamp-2 font-display text-base leading-[1.15] font-bold tracking-[-0.015em] sm:text-[22px]">
          {pkg.title}
        </h3>
        <div className="mt-auto flex items-end justify-between gap-3 pt-1 sm:pt-2">
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="text-[13px] text-ink-muted sm:text-sm">
              <span className="sr-only">Antes </span>
              <s>{labels.wasLabel}</s>
            </p>
            <p className="font-display text-lg font-extrabold tracking-[-0.02em] text-accent sm:text-2xl">
              <span className="sr-only">Con oferta </span>
              {labels.nowLabel}
            </p>
            <p className="text-xs text-ink-muted sm:text-[13px]">
              {labels.note}
              {labels.validUntilLabel && ` · hasta ${labels.validUntilLabel}`}
            </p>
          </div>
          <span
            aria-hidden="true"
            className="hidden size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong text-ink transition-colors duration-150 group-hover:border-accent group-hover:bg-accent group-hover:text-white sm:flex"
          >
            <ArrowRight className="size-[18px]" strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </Link>
  );
}

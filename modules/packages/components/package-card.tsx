import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { cn } from "@/lib/utils";

export function PackageCard({
  slug,
  title,
  coverImageUrl,
  regionLabel,
  tag,
  durationLabel,
  priceLabel,
  variant = "rail",
  blurb,
  className,
  sizes = "(min-width: 768px) 300px, 280px",
}: {
  slug: string;
  title: string;
  coverImageUrl: string | null;
  regionLabel: string;
  tag: string | null;
  durationLabel: string;
  priceLabel: string;
  variant?: "rail" | "grid";
  /** Solo se muestra en `grid`. */
  blurb?: string;
  className?: string;
  sizes?: string;
}) {
  const isGrid = variant === "grid";

  return (
    <Link
      href={`/paquetes/${slug}`}
      className={cn(
        "group flex flex-col gap-3.5 text-ink",
        isGrid && "h-full",
        className,
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-[22px] bg-sand",
          isGrid ? "aspect-[4/3.4]" : "aspect-[4/5]",
        )}
      >
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.06]"
          />
        )}
        {tag && (
          <span className="absolute top-3 left-3 rounded-full bg-white px-3 py-[7px] text-[13px] font-bold text-ink">
            {tag}
          </span>
        )}
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-dark/78 px-3 py-[7px] text-[13px] font-bold text-white">
          <Clock aria-hidden className="size-3.5" strokeWidth={2.4} />
          {durationLabel}
        </span>
      </div>
      <div
        className={cn(
          "flex flex-col px-1",
          isGrid ? "flex-1 gap-2" : "gap-1.5",
        )}
      >
        <span className="text-sm font-bold text-primary">{regionLabel}</span>
        <h3 className="font-display text-[22px] leading-[1.15] font-bold tracking-[-0.015em]">
          {title}
        </h3>
        {isGrid && blurb && (
          <p className="text-[15px] leading-normal text-ink-muted">{blurb}</p>
        )}
        <div
          className={cn(
            "text-[15px] text-ink-muted",
            isGrid && "mt-auto flex items-center justify-between gap-3 pt-2",
          )}
        >
          <p>
            Desde <strong className="text-[19px] text-ink">{priceLabel}</strong>{" "}
            / persona
          </p>
          {isGrid && (
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-border-strong text-ink transition-colors duration-150 group-hover:border-accent group-hover:bg-accent group-hover:text-white"
            >
              <ArrowRight className="size-[18px]" strokeWidth={2.4} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

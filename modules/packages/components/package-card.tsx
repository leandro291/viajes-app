import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PackageCard({
  slug,
  title,
  coverImageUrl,
  regionLabel,
  tag,
  durationLabel,
  priceLabel,
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
  className?: string;
  sizes?: string;
}) {
  return (
    <Link
      href={`/paquetes/${slug}`}
      className={cn(
        "group block overflow-hidden rounded-card bg-surface shadow-card",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-sand">
        {coverImageUrl && (
          <Image
            src={coverImageUrl}
            alt={title}
            fill
            sizes={sizes}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {tag && (
          <Badge className="absolute top-3 left-3 bg-surface text-ink">
            {tag}
          </Badge>
        )}
      </div>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-3 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden className="size-3.5" />
            {durationLabel}
          </span>
          <span className="inline-flex min-w-0 items-center gap-1">
            <MapPin aria-hidden className="size-3.5 shrink-0" />
            <span className="truncate">{regionLabel}</span>
          </span>
        </div>
        <h3 className="line-clamp-2 min-h-[2lh] font-display text-lg leading-snug font-bold text-ink">
          {title}
        </h3>
        <p className="text-sm text-ink-muted">
          Desde <strong className="text-lg text-ink">{priceLabel}</strong> /
          persona
        </p>
      </div>
    </Link>
  );
}

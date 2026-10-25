import Image from "next/image";
import { MapPin, Plus } from "lucide-react";

import type { ItineraryDayDto } from "../types/package";

// <details name> = acordeón exclusivo nativo, sin JS (D2). El día 1 abierto.
export function PackageItinerary({ days }: { days: ItineraryDayDto[] }) {
  return (
    <div className="flex flex-col gap-3">
      {days.map((day, i) => (
        <details
          key={day.dayNumber}
          name="itinerary"
          open={i === 0}
          className="group overflow-hidden rounded-[22px] border-[1.5px] border-row-divider bg-surface transition-colors open:border-primary"
        >
          <summary className="flex min-h-[76px] cursor-pointer list-none items-center gap-4 p-3.5 pr-5 [&::-webkit-details-marker]:hidden">
            <span className="flex size-[52px] shrink-0 flex-col items-center justify-center rounded-2xl bg-sand leading-none group-open:bg-primary group-open:text-white">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em]">Día</span>
              <span className="font-display text-[22px] font-extrabold">{day.dayNumber}</span>
            </span>
            <span className="flex-1 font-display text-xl font-bold tracking-tight">{day.title}</span>
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sand transition-transform group-open:rotate-45"
            >
              <Plus className="size-4" />
            </span>
          </summary>
          <div className="flex flex-wrap gap-5 px-5 pb-5 sm:pl-[86px]">
            <div className="flex min-w-[240px] flex-1 flex-col gap-3">
              <p className="leading-relaxed text-ink-muted">{day.description}</p>
              <p className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                <MapPin aria-hidden className="size-4 text-accent" />
                {day.place}
                {day.transportLeg && (
                  <span className="font-normal text-ink-muted"> · {day.transportLeg}</span>
                )}
              </p>
            </div>
            {day.imageUrl && (
              <div className="relative h-[150px] w-full overflow-hidden rounded-2xl sm:w-[220px]">
                <Image
                  src={day.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 220px, 100vw"
                  className="object-cover"
                />
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

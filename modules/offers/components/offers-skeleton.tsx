import { OFFERS_GRID_CLASS } from "./offer-grid";

export function OffersSkeleton() {
  return (
    <div aria-hidden className={OFFERS_GRID_CLASS}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex animate-pulse flex-col gap-2.5 sm:gap-3.5">
          <div className="aspect-square rounded-[18px] bg-sand sm:aspect-[4/3.4] sm:rounded-[22px]" />
          <div className="flex flex-col gap-2 px-1">
            <div className="h-3.5 w-1/2 rounded bg-sand" />
            <div className="h-5 w-4/5 rounded bg-sand" />
            <div className="h-3.5 w-1/4 rounded bg-sand" />
            <div className="h-6 w-1/3 rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}

import { LISTING_GRID_CLASS } from "./package-grid";

// Misma estructura que ListingContent (aside + encabezado + grilla) para no saltar al cargar.
// Las tarjetas reproducen la `grid` (foto 4/3.4 radio 22, lugar, título, blurb, precio + círculo).
export function ListingSkeleton() {
  return (
    <div
      aria-hidden
      className="flex animate-pulse flex-col gap-6 lg:flex-row lg:items-start lg:gap-9"
    >
      <div className="hidden h-[420px] min-w-[230px] max-w-[290px] flex-[1_1_240px] rounded-[24px] bg-surface lg:block" />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="h-11 w-1/3 rounded-full bg-sand" />
        <div className={LISTING_GRID_CLASS}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-3.5">
              <div className="aspect-[4/3.4] rounded-[22px] bg-sand" />
              <div className="flex flex-col gap-2 px-1">
                <div className="h-4 w-1/3 rounded bg-sand" />
                <div className="h-6 w-4/5 rounded bg-sand" />
                <div className="h-4 w-full rounded bg-sand" />
                <div className="h-4 w-2/3 rounded bg-sand" />
                <div className="flex items-center justify-between pt-2">
                  <div className="h-5 w-1/3 rounded bg-sand" />
                  <div className="size-10 rounded-full bg-sand" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

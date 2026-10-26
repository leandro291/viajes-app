import { TOURS_GRID_CLASS } from "./tour-card";

// Barra de filtros + 8 tarjetas con la misma forma que TourCard (horizontal en móvil).
export function ToursSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-6">
      <div className="h-[132px] rounded-[24px] bg-surface" />
      <div className="h-5 w-40 rounded bg-sand" />
      <div className={TOURS_GRID_CLASS}>
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex gap-3.5 md:flex-col">
            <div className="aspect-square w-[132px] shrink-0 self-start rounded-[22px] bg-sand md:aspect-[4/3.4] md:w-full md:self-auto" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:px-1">
              <div className="flex gap-1.5">
                <div className="h-6 w-12 rounded-full bg-sand" />
                <div className="h-6 w-24 rounded-full bg-sand" />
              </div>
              <div className="h-6 w-4/5 rounded bg-sand" />
              <div className="h-4 w-full rounded bg-sand max-md:hidden" />
              <div className="h-5 w-1/3 rounded bg-sand" />
              <div className="h-4 w-2/3 rounded bg-sand" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

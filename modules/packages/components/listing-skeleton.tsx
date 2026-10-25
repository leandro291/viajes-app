import { LISTING_GRID_CLASS } from "./package-grid";

export function ListingSkeleton() {
  return (
    <div aria-hidden className={LISTING_GRID_CLASS}>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-card bg-surface shadow-card"
        >
          <div className="aspect-[4/3] bg-sand" />
          <div className="flex flex-col gap-3 p-4">
            <div className="h-3 w-1/2 rounded bg-sand" />
            <div className="h-5 w-4/5 rounded bg-sand" />
            <div className="h-4 w-1/3 rounded bg-sand" />
          </div>
        </div>
      ))}
    </div>
  );
}

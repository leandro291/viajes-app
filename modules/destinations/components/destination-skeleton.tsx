import { PageHero } from "@/components/shared/page-hero";

// Misma estructura que la página (hero a todo el ancho + bloques) para evitar saltos de layout.
// `PageHero` marca `data-page-hero`: el encabezado ya queda superpuesto desde la carga.
export function DestinationSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <PageHero className="min-h-[600px] sm:min-h-[640px]" />
      <div className="mx-auto flex max-w-[1240px] flex-col gap-16 px-6 pt-24 pb-[104px]">
        <div className="h-[420px] rounded-card bg-sand" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-80 rounded-[22px] bg-sand" />
          ))}
        </div>
        <div className="h-60 rounded-card bg-sand" />
      </div>
    </div>
  );
}

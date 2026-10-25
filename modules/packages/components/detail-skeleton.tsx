import { PageHero } from "@/components/shared/page-hero";

// Misma estructura que el detalle (hero a todo el ancho + grilla) para evitar saltos de layout.
// `PageHero` marca `data-page-hero`: el layout ya deja el encabezado superpuesto desde la carga.
export function DetailSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <PageHero className="min-h-[660px]" />
      <div className="mx-auto grid max-w-[1240px] gap-14 px-6 pt-12 pb-[104px] min-[1021px]:grid-cols-[minmax(0,1.85fr)_minmax(340px,1fr)] min-[1021px]:items-start">
        <div className="flex flex-col gap-16">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-28 rounded-[20px] bg-sand" />
            ))}
          </div>
          <div className="h-40 rounded-[24px] bg-sand" />
        </div>
        <div className="h-96 rounded-card bg-sand min-[1021px]:-mt-[140px]" />
      </div>
    </div>
  );
}

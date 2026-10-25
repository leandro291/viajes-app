export function DetailSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-8">
      <div className="h-4 w-56 rounded bg-sand" />
      <div className="min-h-[520px] rounded-card bg-sand lg:min-h-[620px]" />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-28 rounded-card-sm bg-sand" />
            ))}
          </div>
          <div className="h-40 rounded-card-sm bg-sand" />
        </div>
        <div className="h-96 rounded-card bg-sand" />
      </div>
    </div>
  );
}

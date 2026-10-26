export function CheckoutSkeleton() {
  return (
    <div role="status" className="grid animate-pulse gap-8 lg:grid-cols-[1fr_380px]">
      <span className="sr-only">Cargando el pago…</span>
      <div aria-hidden className="flex flex-col gap-4">
        <div className="h-6 w-1/3 rounded bg-sand" />
        <div className="h-12 rounded-lg bg-sand" />
        <div className="h-12 rounded-lg bg-sand" />
        <div className="h-12 rounded-lg bg-sand" />
        <div className="h-12 rounded-lg bg-sand" />
      </div>
      <div aria-hidden className="h-80 rounded-[22px] bg-sand" />
    </div>
  );
}

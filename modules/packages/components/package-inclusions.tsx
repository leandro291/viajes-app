import { Check, ShieldCheck, X } from "lucide-react";

export function PackageInclusions({
  included,
  excluded,
}: {
  included: string[];
  excluded: string[];
}) {
  return (
    <div className="flex flex-wrap gap-5">
      {included.length > 0 && (
        <div className="flex min-w-[280px] flex-1 flex-col gap-4 rounded-card-sm bg-surface p-7 shadow-card">
          <h2 className="font-display text-[26px] font-extrabold tracking-tight">Incluye</h2>
          <ul className="flex flex-col gap-3.5">
            {included.map((text) => (
              <li key={text} className="flex items-start gap-3 leading-snug">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                  <Check aria-hidden className="size-3.5 text-primary" strokeWidth={3} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
      {excluded.length > 0 && (
        <div className="flex min-w-[280px] flex-1 flex-col gap-4 rounded-card-sm bg-sand p-7">
          <h2 className="font-display text-[26px] font-extrabold tracking-tight">No incluye</h2>
          <ul className="flex flex-col gap-3.5">
            {excluded.map((text) => (
              <li key={text} className="flex items-start gap-3 leading-snug text-ink-muted">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-sand-deep">
                  <X aria-hidden className="size-3" strokeWidth={3} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CancellationNotice() {
  return (
    <div className="flex flex-wrap items-center gap-5 rounded-card-sm bg-primary p-7 text-white">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-white/10">
        <ShieldCheck aria-hidden className="size-7" />
      </span>
      <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
        <h2 className="font-display text-[22px] font-extrabold">
          Cancelación gratuita hasta 48 h antes
        </h2>
        <p className="leading-relaxed text-primary-soft">
          Reembolso completo. Con menos tiempo, se retiene solo el costo de las entradas ya
          emitidas.
        </p>
      </div>
    </div>
  );
}

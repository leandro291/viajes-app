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
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 rounded-[24px] bg-surface p-7 shadow-[0_1px_2px_rgba(11,21,19,0.05)]">
          <h2 className="text-[26px] leading-[normal] tracking-[-0.02em]">Incluye</h2>
          <ul className="flex flex-col gap-3.5">
            {included.map((text) => (
              <li key={text} className="flex items-start gap-3 leading-[1.45]">
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
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-4 rounded-[24px] bg-[#F3EEE5] p-7">
          <h2 className="text-[26px] leading-[normal] tracking-[-0.02em]">No incluye</h2>
          <ul className="flex flex-col gap-3.5">
            {excluded.map((text) => (
              <li key={text} className="flex items-start gap-3 leading-[1.45] text-[#4A5552]">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-border">
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
    <div className="flex flex-wrap items-center gap-5 rounded-[24px] bg-primary p-7 text-white">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-white/[.12]">
        <ShieldCheck aria-hidden className="size-7" />
      </span>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1.5">
        <h2 className="text-[22px] leading-[normal] tracking-normal">
          Cancelación gratuita hasta 48 h antes
        </h2>
        <p className="leading-[1.6] text-[#D6E6E4]">
          Reembolso completo. Con menos tiempo, se retiene solo el costo de las entradas ya
          emitidas.
        </p>
      </div>
    </div>
  );
}

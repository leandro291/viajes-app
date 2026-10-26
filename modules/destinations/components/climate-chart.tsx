import { cn } from "@/lib/utils";

import type { ClimateMonthDto, Season } from "../types/destination";
import { MONTH_NAMES, MONTH_SHORT, SEASON_LABEL } from "../utils/destination-page";

// La estación no depende solo del color: la altura de la barra también la codifica (DS).
const SEASON_STYLE: Record<Season, { bar: string; swatch: string }> = {
  dry: {
    bar: "h-[150px] border-primary bg-primary text-white",
    swatch: "border-primary bg-primary",
  },
  mixed: {
    bar: "h-[110px] border-primary-mid bg-primary-mid text-dark",
    swatch: "border-primary-mid bg-primary-mid",
  },
  rainy: {
    bar: "h-[76px] border-border-strong bg-sand-deep text-ink-muted",
    swatch: "border-border-strong bg-sand-deep",
  },
};

const SEASONS: Season[] = ["dry", "mixed", "rainy"];

// El caller no lo renderiza si `months.length !== 12`.
export function ClimateChart({
  name,
  months,
  bestSeasonText,
}: {
  name: string;
  months: ClimateMonthDto[];
  bestSeasonText: string | null;
}) {
  return (
    <section id="cuando" className="mx-auto w-full max-w-[1240px] scroll-mt-6 px-6 pt-24">
      <div className="flex flex-col gap-7 rounded-[32px] bg-surface p-[clamp(28px,4vw,48px)] shadow-[0_1px_2px_rgba(11,21,19,0.05),0_16px_40px_rgba(11,21,19,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="flex max-w-[620px] flex-col gap-2.5">
            <span className="text-[13px] font-bold tracking-[0.1em] text-accent uppercase">
              Clima
            </span>
            <h2 className="text-[clamp(30px,3.6vw,42px)] text-ink">Cuándo viajar</h2>
            {bestSeasonText && (
              <p className="text-[17px] leading-[1.55] text-ink-muted">
                Mejor época: {bestSeasonText}.
              </p>
            )}
          </div>
          <ul className="flex flex-wrap gap-4 text-sm font-medium">
            {SEASONS.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn("size-3.5 rounded border", SEASON_STYLE[s].swatch)}
                />
                {SEASON_LABEL[s]}
              </li>
            ))}
          </ul>
        </div>

        <div
          aria-hidden
          className="group/chart grid grid-cols-[repeat(auto-fit,minmax(min(72px,100%),1fr))] items-end gap-2 max-sm:grid-cols-12 max-sm:gap-1"
        >
          {months.map(({ month, season }) => (
            <div
              key={month}
              className="flex flex-col items-stretch gap-2.5 transition-opacity group-hover/chart:opacity-40 hover:opacity-100!"
            >
              <span
                className={cn(
                  "flex items-end justify-center rounded-xl border pb-2.5 text-xs font-bold",
                  SEASON_STYLE[season].bar,
                )}
              >
                <span className="max-sm:hidden">{SEASON_LABEL[season]}</span>
              </span>
              <span className="text-center text-[15px] font-bold max-sm:text-[10px]">{MONTH_SHORT[month - 1]}</span>
            </div>
          ))}
        </div>

        <table className="sr-only">
          <caption>Estación por mes en {name}</caption>
          <thead>
            <tr>
              <th scope="col">Mes</th>
              <th scope="col">Estación</th>
            </tr>
          </thead>
          <tbody>
            {months.map(({ month, season }) => (
              <tr key={month}>
                <th scope="row" className="capitalize">
                  {MONTH_NAMES[month - 1]}
                </th>
                <td>{SEASON_LABEL[season]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

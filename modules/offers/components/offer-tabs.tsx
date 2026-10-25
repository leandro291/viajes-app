import Link from "next/link";

import { cn } from "@/lib/utils";

import type { OfferKind } from "../types/offer";
import { buildOffersHref, OFFER_TABS } from "../utils/offer-params";

export function OfferTabs({ tipo }: { tipo?: OfferKind }) {
  return (
    <nav aria-label="Tipo de oferta" className="flex min-w-0">
      <ul className="flex max-w-full gap-1.5 overflow-x-auto [scrollbar-width:none] self-start rounded-full bg-surface p-1.5 shadow-[0_1px_2px_rgba(11,21,19,.05),0_8px_24px_rgba(11,21,19,.05)]">
        {OFFER_TABS.map((tab) => {
          const active = tab.value === tipo;
          return (
            <li key={tab.value ?? "all"}>
              <Link
                href={buildOffersHref(tab.value)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full whitespace-nowrap px-5 py-[11px] text-[15px] font-bold motion-safe:transition-colors motion-safe:duration-150",
                  active
                    ? "bg-ink text-white"
                    : "bg-transparent text-ink hover:bg-sand",
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

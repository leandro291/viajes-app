import Link from "next/link";

import { cn } from "@/lib/utils";

import type { OfferKind } from "../types/offer";
import { buildOffersHref, OFFER_TABS } from "../utils/offer-params";

export function OfferTabs({ tipo }: { tipo?: OfferKind }) {
  return (
    <nav aria-label="Tipo de oferta">
      <ul className="-mx-6 -my-2 flex gap-2 overflow-x-auto px-6 py-2 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {OFFER_TABS.map((tab) => {
          const active = tab.value === tipo;
          return (
            <li key={tab.value ?? "all"} className="shrink-0">
              <Link
                href={buildOffersHref(tab.value)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-[15px] transition-colors",
                  active
                    ? "border-ink bg-ink font-bold text-white"
                    : "border-border bg-surface text-ink hover:bg-sand",
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

import { buildCheckoutHref, getDepartures } from "@/modules/packages";

import type { OfferDto } from "../types/offer";
import { pickDeparture, suggestedTravelers } from "../utils/offer-link";

// D12: offer.id -> href. Sin caché propia: getDepartures ya cachea.
export async function getOfferHrefs(offers: OfferDto[]): Promise<Record<string, string>> {
  const packageIds = [...new Set(offers.map((o) => o.package.id))];
  const entries = await Promise.all(
    packageIds.map(async (id) => [id, await getDepartures(id)] as const),
  );
  const departuresByPackage = new Map(entries);

  return Object.fromEntries(
    offers.map((offer) => {
      const travelers = suggestedTravelers(offer);
      const departure = pickDeparture(departuresByPackage.get(offer.package.id) ?? [], travelers);
      const href = departure
        ? buildCheckoutHref(departure.id, travelers, offer.id)
        : `/paquetes/${offer.package.slug}`;
      return [offer.id, href];
    }),
  );
}

import { formatPen } from "@/lib/money";

import type { OfferDto, OfferKind } from "../types/offer";
import { calculateOffer } from "./offer-pricing";

export const OFFER_KIND_LABELS: Record<OfferKind, string> = {
  last_minute: "Último minuto",
  rainy_season: "Temporada de lluvias",
  groups: "Grupos y familias",
};

// D14. Zona fija: el seed guarda 23:59 hora Lima (04:59 UTC del día siguiente).
const validUntilFormat = new Intl.DateTimeFormat("es-PE", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Lima",
});

export function formatValidUntil(iso: string): string {
  return validUntilFormat.format(new Date(iso));
}

export type OfferLabels = {
  kindLabel: string;
  badge: string; // "-25%" | "2x1"
  badgeSub: string; // "descuento" | "paga uno"
  wasLabel: string;
  nowLabel: string;
  note: string; // "Por persona" | "Por dos personas" | "Desde N personas"
  validUntilLabel: string | null;
};

// D5
export function describeOffer(offer: OfferDto): OfferLabels {
  const { discountType, discountValue, minPeople, validUntil } = offer;
  const unitCents = offer.package.priceCents;
  const common = {
    kindLabel: OFFER_KIND_LABELS[offer.kind],
    validUntilLabel: validUntil === null ? null : formatValidUntil(validUntil),
  };

  if (discountType === "two_for_one") {
    const { totalCents } = calculateOffer({ discountType, discountValue, minPeople, unitCents, pax: 2 });
    return {
      ...common,
      badge: "2x1",
      badgeSub: "paga uno",
      wasLabel: formatPen(unitCents * 2),
      nowLabel: formatPen(totalCents),
      note: "Por dos personas",
    };
  }

  const { discountedUnitCents } = calculateOffer({
    discountType,
    discountValue,
    minPeople,
    unitCents,
    pax: minPeople ?? 1,
  });
  return {
    ...common,
    badge: `-${discountValue}%`,
    badgeSub: "descuento",
    wasLabel: formatPen(unitCents),
    nowLabel: formatPen(discountedUnitCents),
    note: minPeople === null ? "Por persona" : `Desde ${minPeople} personas`,
  };
}

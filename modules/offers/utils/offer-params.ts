import { z } from "zod";

import type { OfferKind } from "../types/offer";
import { OFFER_KIND_LABELS } from "./offer-view";

export const OFFER_TABS: { value: OfferKind | undefined; label: string }[] = [
  { value: undefined, label: "Todas" },
  { value: "last_minute", label: OFFER_KIND_LABELS.last_minute },
  { value: "rainy_season", label: OFFER_KIND_LABELS.rainy_season },
  { value: "groups", label: OFFER_KIND_LABELS.groups },
];

const tipoSchema = z.enum(["last_minute", "rainy_season", "groups"]);

// Nunca lanza: valor inválido, vacío o repetido (se toma el primero) se descarta.
export function parseOfferParams(
  raw: Record<string, string | string[] | undefined>,
): { tipo?: OfferKind } {
  const value = Array.isArray(raw.tipo) ? raw.tipo[0] : raw.tipo;
  const parsed = tipoSchema.safeParse(value);
  return parsed.success ? { tipo: parsed.data } : {};
}

export function buildOffersHref(tipo: OfferKind | undefined): string {
  return tipo ? `/ofertas?tipo=${tipo}` : "/ofertas";
}

import type { BookingStatusKey } from "@/components/shared/status-badge";

import type { OfferTerms } from "../types/offer";

export type OfferState = "active" | "expired" | "inactive";

export const OFFER_STATE_LABELS: Record<OfferState, string> = {
  active: "Activa",
  expired: "Vencida",
  inactive: "Inactiva",
};

export const OFFER_STATE_BADGE: Record<OfferState, BookingStatusKey> = {
  active: "confirmed",
  expired: "cancelled",
  inactive: "neutral",
};

// Espejo del predicado público `gt(valid_until, now())`: valid_until == now ya está vencida.
export function offerState(o: { isActive: boolean; validUntil: Date | null }, now: Date): OfferState {
  if (!o.isActive) return "inactive";
  if (o.validUntil !== null && o.validUntil.getTime() <= now.getTime()) return "expired";
  return "active";
}

export function describeOfferTerms(t: OfferTerms): { discount: string; min: string } {
  return {
    discount: t.discountType === "two_for_one" ? "2x1 (paga uno)" : `${t.discountValue} % de descuento`,
    min: t.minPeople === null ? "Sin mínimo" : `Desde ${t.minPeople} personas`,
  };
}

type Checked = { validUntil: Date | null; minPeople: number | null };

// D11, D12: solo valida lo que cambió, para no bloquear la edición de ofertas ya guardadas.
export function checkOffer(
  current: Checked | null,
  next: Checked,
  maxGroupSize: number,
  now: Date,
): Record<string, string> | null {
  const errors: Record<string, string> = {};

  const { validUntil, minPeople } = next;
  const validUntilChanged = current === null || current.validUntil?.getTime() !== validUntil?.getTime();
  if (validUntil !== null && validUntil.getTime() <= now.getTime() && validUntilChanged) {
    errors.validUntil = "Elige una fecha de hoy o futura.";
  }

  const minPeopleChanged = current === null || current.minPeople !== minPeople;
  if (minPeople !== null && minPeople > maxGroupSize && minPeopleChanged) {
    errors.minPeople = `El mínimo no puede superar el máximo del paquete (${maxGroupSize}).`;
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

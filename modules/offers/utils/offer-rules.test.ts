import { describe, expect, it } from "vitest";

import {
  OFFER_STATE_BADGE,
  OFFER_STATE_LABELS,
  checkOffer,
  describeOfferTerms,
  offerState,
} from "./offer-rules";

const NOW = new Date("2026-10-28T12:00:00Z");
const PAST = new Date("2026-10-01T00:00:00Z");
const FUTURE = new Date("2026-12-01T00:00:00Z");

describe("offerState", () => {
  it("AC5: activa sin vigencia", () => {
    expect(offerState({ isActive: true, validUntil: null }, NOW)).toBe("active");
  });
  it("AC5: activa con vigencia futura", () => {
    expect(offerState({ isActive: true, validUntil: FUTURE }, NOW)).toBe("active");
  });
  it("AC5: vencida con vigencia pasada", () => {
    expect(offerState({ isActive: true, validUntil: PAST }, NOW)).toBe("expired");
  });
  it("AC5: validUntil == now exacto es vencida", () => {
    expect(offerState({ isActive: true, validUntil: new Date(NOW) }, NOW)).toBe("expired");
  });
  it("AC5: inactiva", () => {
    expect(offerState({ isActive: false, validUntil: null }, NOW)).toBe("inactive");
  });
  it("AC5: inactiva gana sobre vencida", () => {
    expect(offerState({ isActive: false, validUntil: PAST }, NOW)).toBe("inactive");
  });
});

describe("checkOffer", () => {
  const same = { validUntil: PAST, minPeople: 10 };

  it("AC6: vigencia pasada cambiada -> error", () => {
    const r = checkOffer({ validUntil: FUTURE, minPeople: null }, { validUntil: PAST, minPeople: null }, 12, NOW);
    expect(r).toEqual({ validUntil: "Elige una fecha de hoy o futura." });
  });
  it("AC6: vigencia pasada no cambiada -> sin error", () => {
    expect(checkOffer(same, { validUntil: new Date(PAST), minPeople: 10 }, 20, NOW)).toBeNull();
  });
  it("AC6: vigencia pasada con current null -> error", () => {
    expect(checkOffer(null, { validUntil: PAST, minPeople: null }, 12, NOW)).toHaveProperty("validUntil");
  });
  it("AC6: vigencia == now con current null -> error", () => {
    expect(checkOffer(null, { validUntil: new Date(NOW), minPeople: null }, 12, NOW)).toHaveProperty("validUntil");
  });
  it("AC6: vigencia futura -> sin error", () => {
    expect(checkOffer(null, { validUntil: FUTURE, minPeople: null }, 12, NOW)).toBeNull();
  });
  it("AC6: vigencia null -> sin error", () => {
    expect(checkOffer({ validUntil: PAST, minPeople: null }, { validUntil: null, minPeople: null }, 12, NOW)).toBeNull();
  });
  it("AC6: vigencia de current null y next pasada -> error", () => {
    const r = checkOffer({ validUntil: null, minPeople: null }, { validUntil: PAST, minPeople: null }, 12, NOW);
    expect(r).toHaveProperty("validUntil");
  });
  it("AC6: mínimo > máximo cambiado -> error", () => {
    const r = checkOffer({ validUntil: null, minPeople: 4 }, { validUntil: null, minPeople: 15 }, 12, NOW);
    expect(r).toEqual({ minPeople: "El mínimo no puede superar el máximo del paquete (12)." });
  });
  it("AC6: mínimo > máximo con current null -> error", () => {
    expect(checkOffer(null, { validUntil: null, minPeople: 15 }, 12, NOW)).toHaveProperty("minPeople");
  });
  it("AC6: mínimo > máximo no cambiado -> sin error", () => {
    expect(
      checkOffer({ validUntil: null, minPeople: 15 }, { validUntil: null, minPeople: 15 }, 12, NOW),
    ).toBeNull();
  });
  it("AC6: mínimo == máximo -> sin error", () => {
    expect(checkOffer(null, { validUntil: null, minPeople: 12 }, 12, NOW)).toBeNull();
  });
  it("AC6: ambos errores juntos", () => {
    const r = checkOffer(null, { validUntil: PAST, minPeople: 15 }, 12, NOW);
    expect(Object.keys(r ?? {}).sort()).toEqual(["minPeople", "validUntil"]);
  });
  it("AC6: sin errores devuelve null", () => {
    expect(checkOffer(null, { validUntil: FUTURE, minPeople: 4 }, 12, NOW)).toBeNull();
  });
});

describe("describeOfferTerms", () => {
  it("AC7: porcentaje con mínimo", () => {
    expect(describeOfferTerms({ discountType: "percent", discountValue: 25, minPeople: 4 })).toEqual({
      discount: "25 % de descuento",
      min: "Desde 4 personas",
    });
  });
  it("AC7: 2x1 sin mínimo", () => {
    expect(describeOfferTerms({ discountType: "two_for_one", discountValue: null, minPeople: null })).toEqual({
      discount: "2x1 (paga uno)",
      min: "Sin mínimo",
    });
  });
});

describe("etiquetas y badges", () => {
  it("AC7: OFFER_STATE_LABELS", () => {
    expect(OFFER_STATE_LABELS).toEqual({ active: "Activa", expired: "Vencida", inactive: "Inactiva" });
  });
  it("AC7: OFFER_STATE_BADGE", () => {
    expect(OFFER_STATE_BADGE).toEqual({ active: "confirmed", expired: "cancelled", inactive: "neutral" });
  });
});

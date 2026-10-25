import { describe, expect, it } from "vitest";

import { OFFER_TABS, buildOffersHref, parseOfferParams } from "./offer-params";

describe("parseOfferParams", () => {
  it("AC6: acepta los tres tipos", () => {
    for (const tipo of ["last_minute", "rainy_season", "groups"] as const) {
      expect(parseOfferParams({ tipo })).toEqual({ tipo });
    }
  });

  it("AC6: descarta inválidos, vacíos, otro idioma y ausentes", () => {
    expect(parseOfferParams({ tipo: "xyz" })).toEqual({});
    expect(parseOfferParams({ tipo: "" })).toEqual({});
    expect(parseOfferParams({ tipo: "ultimo-minuto" })).toEqual({});
    expect(parseOfferParams({})).toEqual({});
    expect(parseOfferParams({ tipo: undefined })).toEqual({});
    expect(parseOfferParams({ tipo: [] })).toEqual({});
  });

  it("AC6: toma el primero de un array", () => {
    expect(parseOfferParams({ tipo: ["groups", "last_minute"] })).toEqual({ tipo: "groups" });
    expect(parseOfferParams({ tipo: ["xyz", "groups"] })).toEqual({});
  });
});

describe("buildOffersHref", () => {
  it("AC6: sin tipo no lleva ?", () => {
    expect(buildOffersHref(undefined)).toBe("/ofertas");
  });

  it("AC6: con tipo lo agrega", () => {
    expect(buildOffersHref("rainy_season")).toBe("/ofertas?tipo=rainy_season");
  });
});

describe("OFFER_TABS", () => {
  it("AC6: Todas + los 3 tipos con rótulo en español", () => {
    expect(OFFER_TABS).toEqual([
      { value: undefined, label: "Todas" },
      { value: "last_minute", label: "Último minuto" },
      { value: "rainy_season", label: "Temporada de lluvias" },
      { value: "groups", label: "Grupos y familias" },
    ]);
  });
});

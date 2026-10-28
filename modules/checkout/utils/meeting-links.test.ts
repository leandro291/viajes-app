import { describe, expect, it } from "vitest";
import { buildMapLinks } from "./meeting-links";

describe("buildMapLinks", () => {
  it("AC4: arma los enlaces de Google Maps y Waze sin alterar los decimales", () => {
    expect(buildMapLinks(-13.5163, -71.9785)).toEqual({
      google: "https://www.google.com/maps/search/?api=1&query=-13.5163,-71.9785",
      waze: "https://waze.com/ul?ll=-13.5163,-71.9785&navigate=yes",
    });
  });

  it.each([
    [null, -71.9785],
    [-13.5163, undefined],
    [undefined, null],
    [NaN, -71.9785],
    [-13.5163, Infinity],
  ])("AC4: devuelve null con coordenadas faltantes o no finitas (%s, %s)", (lat, lng) => {
    expect(buildMapLinks(lat, lng)).toBeNull();
  });

  it("AC4: acepta 0 como coordenada válida", () => {
    expect(buildMapLinks(0, 0)).not.toBeNull();
  });
});

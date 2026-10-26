import { describe, expect, it } from "vitest";
import {
  MONTH_NAMES,
  MONTH_SHORT,
  SEASON_LABEL,
  beforeYouGo,
  formatAltitude,
  mapPins,
  sightsHeading,
} from "./destination-page";

const NNBSP = " ";
const NBSP = " ";

describe("formatAltitude", () => {
  it.each([
    [3399, `3${NNBSP}399${NBSP}m${NBSP}s.${NBSP}n.${NBSP}m.`],
    [154, `154${NBSP}m${NBSP}s.${NBSP}n.${NBSP}m.`],
    [4, `4${NBSP}m${NBSP}s.${NBSP}n.${NBSP}m.`],
  ])("AC12: formatAltitude(%i)", (m, expected) => {
    expect(formatAltitude(m)).toBe(expected);
  });
});

describe("sightsHeading", () => {
  it.each([
    [1, "Un lugar que justifica el viaje"],
    [2, "Dos lugares que justifican el viaje"],
    [5, "Cinco lugares que justifican el viaje"],
    [9, "Nueve lugares que justifican el viaje"],
    [10, "10 lugares que justifican el viaje"],
    [0, "Lugares que justifican el viaje"],
  ])("AC12: sightsHeading(%i)", (n, expected) => {
    expect(sightsHeading(n)).toBe(expected);
  });
});

describe("beforeYouGo", () => {
  it.each([3399, 2000])("AC12: %i m es altura", (m) => {
    expect(beforeYouGo(m)).toEqual({
      heading: "Prepárate para la altura",
      tipsLabel: "Aclimatación",
    });
  });

  it.each([1999, 154, null])("AC12: %s no es altura", (m) => {
    expect(beforeYouGo(m)).toEqual({
      heading: "Prepara tu viaje",
      tipsLabel: "Consejos",
    });
  });
});

describe("mapPins", () => {
  it("AC12: conserva la numeración de la lista completa y omite lugares sin coordenadas", () => {
    expect(
      mapPins([
        { name: "A", lat: -1, lng: -2 },
        { name: "B", lat: null, lng: -3 },
        { name: "C", lat: -4, lng: null },
        { name: "D", lat: -5, lng: -6 },
      ]),
    ).toEqual([
      { n: 1, name: "A", lat: -1, lng: -2 },
      { n: 4, name: "D", lat: -5, lng: -6 },
    ]);
  });

  it("AC12: lista vacía devuelve []", () => {
    expect(mapPins([])).toEqual([]);
  });
});

describe("etiquetas", () => {
  it("AC12: SEASON_LABEL", () => {
    expect(SEASON_LABEL).toEqual({ dry: "Seca", mixed: "Mixta", rainy: "Lluvias" });
  });

  it("AC12: MONTH_SHORT y MONTH_NAMES tienen 12 entradas", () => {
    expect(MONTH_SHORT).toHaveLength(12);
    expect(MONTH_SHORT[0]).toBe("Ene");
    expect(MONTH_SHORT[11]).toBe("Dic");
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe("enero");
    expect(MONTH_NAMES[11]).toBe("diciembre");
  });
});

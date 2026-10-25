import { describe, expect, it } from "vitest";

import {
  DURATION_OPTIONS,
  SORT_OPTIONS,
  buildListingHref,
  parseListingParams,
  resolveFilters,
} from "./package-filters";

describe("parseListingParams", () => {
  it("AC2: acepta valores válidos", () => {
    expect(
      parseListingParams({
        categoria: "playas",
        duracion: "2-3",
        destino: "cusco",
        orden: "precio-desc",
      }),
    ).toEqual({ categoria: "playas", duracion: "2-3", destino: "cusco", orden: "precio-desc" });
    expect(parseListingParams({ duracion: "1" })).toEqual({ duracion: "1" });
    expect(parseListingParams({ duracion: "4-mas" })).toEqual({ duracion: "4-mas" });
    expect(parseListingParams({ orden: "precio-asc" })).toEqual({ orden: "precio-asc" });
  });

  it("AC2: descarta valores fuera del vocabulario sin lanzar", () => {
    expect(parseListingParams({ duracion: "7", orden: "x" })).toEqual({});
  });

  it("AC2: 4+ no es válido, 4-mas sí", () => {
    expect(parseListingParams({ duracion: "4+" })).toEqual({});
    expect(parseListingParams({ duracion: "4 " })).toEqual({});
    expect(parseListingParams({ duracion: "4-mas" })).toEqual({ duracion: "4-mas" });
  });

  it("AC2: valores repetidos toman el primero", () => {
    expect(parseListingParams({ destino: ["a", "b"], duracion: ["2-3", "1"] })).toEqual({
      destino: "a",
      duracion: "2-3",
    });
  });

  it("AC2: el primero de un array inválido se descarta", () => {
    expect(parseListingParams({ duracion: ["7", "1"] })).toEqual({});
  });

  it("AC2: slug vacío o de más de 60 caracteres se descarta", () => {
    expect(parseListingParams({ categoria: "", destino: "" })).toEqual({});
    expect(parseListingParams({ categoria: "a".repeat(61) })).toEqual({});
    expect(parseListingParams({ categoria: "a".repeat(60) })).toEqual({
      categoria: "a".repeat(60),
    });
  });

  it("AC2: entrada vacía o con claves ajenas devuelve {}", () => {
    expect(parseListingParams({})).toEqual({});
    expect(parseListingParams({ foo: "bar", categoria: undefined })).toEqual({});
  });
});

describe("resolveFilters", () => {
  const categories = [{ slug: "playas" }];
  const destinations = [{ slug: "cusco" }];

  it("AC3: conserva slugs existentes", () => {
    const parsed = { categoria: "playas", destino: "cusco" };
    expect(resolveFilters(parsed, categories, destinations)).toEqual(parsed);
  });

  it("AC3: descarta slugs inexistentes", () => {
    expect(
      resolveFilters({ categoria: "nada", destino: "atlantida" }, categories, destinations),
    ).toEqual({});
  });

  it("AC3: deja duracion y orden como llegaron", () => {
    expect(
      resolveFilters({ duracion: "1", orden: "precio-asc", destino: "x" }, categories, destinations),
    ).toEqual({ duracion: "1", orden: "precio-asc" });
  });
});

describe("buildListingHref", () => {
  it("AC4: sin filtros devuelve /paquetes sin ?", () => {
    expect(buildListingHref({}, {})).toBe("/paquetes");
    expect(buildListingHref({ duracion: "1" }, { duracion: undefined })).toBe("/paquetes");
  });

  it("AC4: conserva los otros filtros al cambiar uno", () => {
    expect(buildListingHref({ categoria: "playas", destino: "cusco" }, { duracion: "2-3" })).toBe(
      "/paquetes?categoria=playas&duracion=2-3&destino=cusco",
    );
  });

  it("AC4: undefined quita solo esa clave", () => {
    expect(buildListingHref({ categoria: "playas", destino: "cusco" }, { destino: undefined })).toBe(
      "/paquetes?categoria=playas",
    );
  });

  it("AC4: omite claves vacías", () => {
    expect(buildListingHref({ categoria: "" }, { destino: "" })).toBe("/paquetes");
  });

  it("AC4: orden fijo de claves", () => {
    const a = buildListingHref(
      { orden: "precio-asc", destino: "cusco", duracion: "1", categoria: "playas" },
      {},
    );
    const b = buildListingHref(
      { categoria: "playas", duracion: "1", destino: "cusco", orden: "precio-asc" },
      {},
    );
    expect(a).toBe("/paquetes?categoria=playas&duracion=1&destino=cusco&orden=precio-asc");
    expect(a).toBe(b);
  });

  it("AC4: codifica los valores", () => {
    expect(buildListingHref({}, { destino: "a b&c" })).toBe("/paquetes?destino=a+b%26c");
  });
});

describe("opciones", () => {
  it("AC11: la primera opción de cada grupo no tiene valor", () => {
    expect(DURATION_OPTIONS[0].value).toBeUndefined();
    expect(SORT_OPTIONS[0].value).toBeUndefined();
    expect(DURATION_OPTIONS).toHaveLength(4);
    expect(SORT_OPTIONS).toHaveLength(3);
  });
});

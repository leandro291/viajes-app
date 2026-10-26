import { describe, expect, it } from "vitest";

import {
  buildTourHref,
  citiesFromTours,
  dayRange,
  limaToday,
  maxFecha,
  parseTourParams,
  resolveTourFilters,
} from "./tour-filters";

describe("parseTourParams", () => {
  it("AC2: acepta valores válidos", () => {
    expect(
      parseTourParams({ ciudad: "cusco", fecha: "2026-11-05", orden: "mas-cortos" }),
    ).toEqual({ ciudad: "cusco", fecha: "2026-11-05", orden: "mas-cortos" });
    expect(parseTourParams({ orden: "precio-asc" })).toEqual({ orden: "precio-asc" });
  });

  it("AC2: objeto vacío devuelve {}", () => {
    expect(parseTourParams({})).toEqual({});
  });

  it("AC2: descarta orden desconocido (incluido precio-desc)", () => {
    expect(parseTourParams({ orden: "x" })).toEqual({});
    expect(parseTourParams({ orden: "precio-desc" })).toEqual({});
  });

  it("AC2: descarta ciudad vacía o de más de 60 caracteres", () => {
    expect(parseTourParams({ ciudad: "" })).toEqual({});
    expect(parseTourParams({ ciudad: "a".repeat(61) })).toEqual({});
    expect(parseTourParams({ ciudad: "a".repeat(60) })).toEqual({ ciudad: "a".repeat(60) });
  });

  it("AC2: descarta fechas mal formadas o inexistentes", () => {
    for (const fecha of ["2026-02-31", "2026-13-01", "26-11-05", "2026-1-5", "hoy", ""]) {
      expect(parseTourParams({ fecha })).toEqual({});
    }
  });

  it("AC2: respeta el bisiesto", () => {
    expect(parseTourParams({ fecha: "2028-02-29" })).toEqual({ fecha: "2028-02-29" });
    expect(parseTourParams({ fecha: "2027-02-29" })).toEqual({});
  });

  it("AC2: con valores repetidos toma el primero", () => {
    expect(parseTourParams({ ciudad: ["cusco", "lima"], orden: ["x", "mas-cortos"] })).toEqual({
      ciudad: "cusco",
    });
  });
});

describe("limaToday", () => {
  it("AC3: devuelve el día de Lima aunque en UTC ya sea el siguiente", () => {
    expect(limaToday(new Date("2026-11-06T03:00:00Z"))).toBe("2026-11-05");
  });

  it("AC3: cambia de día a las 05:00Z", () => {
    expect(limaToday(new Date("2026-11-05T04:59:59Z"))).toBe("2026-11-04");
    expect(limaToday(new Date("2026-11-05T05:00:00Z"))).toBe("2026-11-05");
  });
});

describe("resolveTourFilters", () => {
  const cities = [{ slug: "cusco" }, { slug: "lima" }];
  const today = "2026-11-05";

  it("AC3: conserva ciudad existente y descarta la inexistente", () => {
    expect(resolveTourFilters({ ciudad: "cusco" }, cities, today)).toEqual({ ciudad: "cusco" });
    expect(resolveTourFilters({ ciudad: "atlantida" }, cities, today)).toEqual({});
  });

  it("AC3: fecha entre hoy y hoy + 365 días", () => {
    expect(resolveTourFilters({ fecha: today }, cities, today)).toEqual({ fecha: today });
    expect(resolveTourFilters({ fecha: "2026-11-04" }, cities, today)).toEqual({});
    expect(resolveTourFilters({ fecha: "2027-11-05" }, cities, today)).toEqual({
      fecha: "2027-11-05",
    });
    expect(resolveTourFilters({ fecha: "2027-11-06" }, cities, today)).toEqual({});
  });

  it("AC3: deja orden como llegó", () => {
    expect(resolveTourFilters({ orden: "mas-cortos" }, [], today)).toEqual({
      orden: "mas-cortos",
    });
  });

  it("AC3: no muta el objeto de entrada", () => {
    const parsed = { ciudad: "atlantida" };
    resolveTourFilters(parsed, cities, today);
    expect(parsed).toEqual({ ciudad: "atlantida" });
  });
});

describe("maxFecha", () => {
  it("es hoy + 365 días (cruza año y bisiesto)", () => {
    expect(maxFecha("2026-11-05")).toBe("2027-11-05");
    expect(maxFecha("2027-03-01")).toBe("2028-02-29");
  });
});

describe("dayRange", () => {
  it("AC3: día de Lima [00:00-05:00, +24 h)", () => {
    const { from, to } = dayRange("2026-11-05");
    expect(from.toISOString()).toBe("2026-11-05T05:00:00.000Z");
    expect(to.toISOString()).toBe("2026-11-06T05:00:00.000Z");
    expect(to.getTime() - from.getTime()).toBe(24 * 60 * 60 * 1000);
  });
});

describe("buildTourHref", () => {
  it("AC4: sin filtros devuelve /tours sin ?", () => {
    expect(buildTourHref({}, {})).toBe("/tours");
  });

  it("AC4: conserva el resto al cambiar una clave", () => {
    expect(buildTourHref({ ciudad: "cusco", orden: "mas-cortos" }, { fecha: "2026-11-05" })).toBe(
      "/tours?ciudad=cusco&fecha=2026-11-05&orden=mas-cortos",
    );
  });

  it("AC4: quita la clave con undefined o vacío", () => {
    expect(buildTourHref({ ciudad: "cusco", fecha: "2026-11-05" }, { fecha: undefined })).toBe(
      "/tours?ciudad=cusco",
    );
    expect(buildTourHref({ ciudad: "cusco" }, { ciudad: "" })).toBe("/tours");
  });

  it("AC4: mismo conjunto, mismo string (orden fijo de claves)", () => {
    const a = buildTourHref({ orden: "precio-asc", ciudad: "lima" }, {});
    const b = buildTourHref({ ciudad: "lima", orden: "precio-asc" }, {});
    expect(a).toBe(b);
    expect(a).toBe("/tours?ciudad=lima&orden=precio-asc");
  });
});

describe("citiesFromTours", () => {
  const t = (slug: string, name: string) => ({ destination: { slug, name, region: "x" } });

  it("AC5: ciudades únicas con conteo, por cantidad desc y luego nombre", () => {
    const tours = [
      t("lima", "Lima"),
      t("cusco", "Cusco"),
      t("cusco", "Cusco"),
      t("arequipa", "Arequipa"),
    ];
    expect(citiesFromTours(tours)).toEqual([
      { slug: "cusco", name: "Cusco", count: 2 },
      { slug: "arequipa", name: "Arequipa", count: 1 },
      { slug: "lima", name: "Lima", count: 1 },
    ]);
  });

  it("AC5: sin tours devuelve []", () => {
    expect(citiesFromTours([])).toEqual([]);
  });
});

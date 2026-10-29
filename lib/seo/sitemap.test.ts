import { describe, expect, it } from "vitest";
import { buildSitemapEntries } from "./sitemap";

const updatedAt = new Date("2026-01-02T03:04:05Z");
const input = {
  baseUrl: "https://wayra.pe",
  packages: [{ slug: "cusco-3d", updatedAt }],
  destinations: [{ slug: "cusco" }],
};

describe("buildSitemapEntries", () => {
  it("AC8: estáticas primero, en orden, luego paquetes y destinos", () => {
    expect(buildSitemapEntries(input).map((e) => e.url)).toEqual([
      "https://wayra.pe/",
      "https://wayra.pe/paquetes",
      "https://wayra.pe/tours",
      "https://wayra.pe/ofertas",
      "https://wayra.pe/paquetes/cusco-3d",
      "https://wayra.pe/destinos/cusco",
    ]);
  });

  it("AC9: paquetes llevan lastModified=updatedAt; estáticas y destinos no", () => {
    const entries = buildSitemapEntries(input);
    expect(entries.find((e) => e.url.endsWith("/paquetes/cusco-3d"))?.lastModified).toBe(updatedAt);
    for (const e of entries.filter((e) => !e.url.includes("/paquetes/"))) {
      expect(e).not.toHaveProperty("lastModified");
    }
  });

  it("AC10: baseUrl con y sin barra final da las mismas URL absolutas", () => {
    const a = buildSitemapEntries({ ...input, baseUrl: "https://wayra.pe/" });
    expect(a).toEqual(buildSitemapEntries(input));
  });

  it("AC10: listas vacías -> solo las 4 estáticas", () => {
    expect(buildSitemapEntries({ baseUrl: "https://wayra.pe", packages: [], destinations: [] })).toHaveLength(4);
  });

  it("AC8: sin URL duplicadas", () => {
    const entries = buildSitemapEntries({
      ...input,
      packages: [...input.packages, ...input.packages],
      destinations: [{ slug: "cusco" }, { slug: "cusco" }],
    });
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });
});

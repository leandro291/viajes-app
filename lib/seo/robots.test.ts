import { describe, expect, it } from "vitest";
import { PRIVATE_PATHS, buildRobots } from "./robots";

describe("buildRobots", () => {
  it("AC11: permite / y bloquea las rutas privadas", () => {
    expect(buildRobots("https://wayra.pe").rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: [...PRIVATE_PATHS],
    });
    expect(PRIVATE_PATHS).toEqual([
      "/admin",
      "/operador",
      "/pago",
      "/confirmacion",
      "/mis-reservas",
      "/cuenta",
      "/api/",
      "/sign-in",
      "/sign-up",
    ]);
  });

  it("AC11: sitemap usa baseUrl (con o sin barra final)", () => {
    expect(buildRobots("https://wayra.pe").sitemap).toBe("https://wayra.pe/sitemap.xml");
    expect(buildRobots("https://wayra.pe/").sitemap).toBe("https://wayra.pe/sitemap.xml");
  });

  it("AC11b: blockAll -> solo Disallow: / y sin sitemap", () => {
    const robots = buildRobots("https://wayra.pe", { blockAll: true });
    expect(robots.rules).toEqual({ userAgent: "*", disallow: "/" });
    expect(robots).not.toHaveProperty("sitemap");
  });
});

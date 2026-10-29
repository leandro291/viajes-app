import type { MetadataRoute } from "next";

export const PRIVATE_PATHS: readonly string[] = [
  "/admin",
  "/operador",
  "/pago",
  "/confirmacion",
  "/mis-reservas",
  "/cuenta",
  "/api/",
  "/sign-in",
  "/sign-up",
];

export function buildRobots(baseUrl: string, opts?: { blockAll?: boolean }): MetadataRoute.Robots {
  if (opts?.blockAll) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] },
    sitemap: `${baseUrl.replace(/\/+$/, "")}/sitemap.xml`,
  };
}

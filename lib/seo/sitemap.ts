import type { MetadataRoute } from "next";

export const SITEMAP_STATIC_PATHS = ["/", "/paquetes", "/tours", "/ofertas"] as const;

export function buildSitemapEntries({
  baseUrl,
  packages,
  destinations,
}: {
  baseUrl: string;
  packages: { slug: string; updatedAt: Date }[];
  destinations: { slug: string }[];
}): MetadataRoute.Sitemap {
  const base = baseUrl.replace(/\/+$/, "");
  const entries: MetadataRoute.Sitemap = [
    ...SITEMAP_STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
    ...packages.map((p) => ({ url: `${base}/paquetes/${p.slug}`, lastModified: p.updatedAt })),
    ...destinations.map((d) => ({ url: `${base}/destinos/${d.slug}` })),
  ];
  // Sin URL duplicadas (la primera gana).
  return [...new Map(entries.map((e) => [e.url, e])).values()];
}

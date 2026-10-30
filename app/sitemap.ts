import type { MetadataRoute } from "next";
import { getDestinations } from "@/modules/destinations";
import { getSitemapPackages } from "@/modules/packages";
import { getSiteUrl } from "@/lib/seo/site-url";
import { buildSitemapEntries } from "@/lib/seo/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [packages, destinations] = await Promise.all([getSitemapPackages(), getDestinations()]);
  return buildSitemapEntries({ baseUrl: getSiteUrl(), packages, destinations });
}
